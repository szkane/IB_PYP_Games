/**
 * Gesture Cosmos Hub — Main Entry Point
 *
 * Sets up shared Three.js renderer/scene/camera, instantiates core
 * modules (HandEngine, GestureRouter, CameraRig, SceneHost), registers
 * 6 scene modules, wires navigation, and runs the render loop.
 */
import * as THREE from 'three';
import { HandEngine } from './core/hand-engine.js';
import { GestureRouter } from './core/gesture-router.js';
import { CameraRig } from './core/camera-rig.js';
import { SceneHost } from './core/scene-host.js';

// Scene modules (imported dynamically on first switch)
const sceneModules = {
  'solar-system': () => import('./scenes/scene-solar-system.js'),
  'neon-planets': () => import('./scenes/scene-neon-planets.js'),
  'galaxy-spiral': () => import('./scenes/scene-galaxy-spiral.js'),
  'crystal-galaxy': () => import('./scenes/scene-crystal-galaxy.js'),
  'milky-way': () => import('./scenes/scene-milky-way.js'),
  'shape-motion': () => import('./scenes/scene-shape-motion.js'),
};

// DOM refs
const container = document.getElementById('canvas-container');
const loaderEl = document.getElementById('loader');
const navBar = document.getElementById('nav-bar');
const permissionOverlay = document.getElementById('permission-overlay');
const enableBtn = document.getElementById('enable-gestures');
const gestureIndicator = document.getElementById('gesture-indicator');
const toastEl = document.getElementById('toast');
const videoEl = document.querySelector('.input_video');

// Shared Three.js objects
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 30, 60);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

// Core modules
const handEngine = new HandEngine();
const gestureRouter = new GestureRouter();
const cameraRig = new CameraRig(camera, renderer.domElement);
const sceneHost = new SceneHost();

// Context passed to every scene
const ctx = {
  scene,
  camera,
  renderer,
  textureLoader,
  cameraRig,
  handEngine,
  gestureRouter,
};

sceneHost.setContext(ctx);

// Toast helper
let toastTimer = null;
function showToast(msg, duration = 3000) {
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), duration);
}

// Nav handling
let currentSceneName = null;

async function switchScene(name) {
  if (name === currentSceneName) return;
  const btn = document.querySelector(`[data-scene="${name}"]`);
  if (!btn) return;

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Load and register (cached by dynamic import)
  if (!sceneHost.scenes.has(name)) {
    try {
      const mod = await sceneModules[name]();
      sceneHost.register(name, mod.default || mod);
    } catch (e) {
      console.error(`[Hub] Failed to load scene "${name}":`, e);
      showToast(`Scene "${name}" unavailable`);
      if (currentSceneName) {
        const prevBtn = document.querySelector(`[data-scene="${currentSceneName}"]`);
        if (prevBtn) prevBtn.classList.add('active');
      }
      return;
    }
  }

  try {
    sceneHost.switchTo(name);
    currentSceneName = name;
  } catch (e) {
    console.error(`[Hub] Failed to init scene "${name}":`, e);
    showToast(`Scene "${name}" init error`);
  }
}

navBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (btn) switchScene(btn.dataset.scene);
});

// Camera permission / gesture enable
enableBtn.addEventListener('click', async () => {
  try {
    await handEngine.init(videoEl);
    await handEngine.startCamera();
    permissionOverlay.classList.remove('visible');
    gestureIndicator.classList.add('visible');
    showToast('Gestures active — move hand to orbit · pinch to zoom · fist to explode shapes · open palm to reset');
  } catch (err) {
    console.error('[Hub] Camera/MediaPipe init failed:', err);
    showToast('Camera unavailable — using mouse controls');
    permissionOverlay.classList.remove('visible');
    // Fallback: just remove overlay, camera rig works with mouse via OrbitControls
  }
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Render Loop ----
let prevTime = 0;
let bgStars = null;

function createBackgroundStars() {
  const geom = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 4000; i++) {
    pos.push(
      (Math.random() - 0.5) * 1500,
      (Math.random() - 0.5) * 1500,
      (Math.random() - 0.5) * 1500
    );
  }
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x555566, size: 0.8, sizeAttenuation: true });
  bgStars = new THREE.Points(geom, mat);
  scene.add(bgStars);
}
createBackgroundStars();

function animate(time) {
  requestAnimationFrame(animate);

  const dt = prevTime ? Math.min((time - prevTime) / 1000, 0.05) : 0.016;
  prevTime = time;

  // Process gesture
  const cmd = gestureRouter.process(handEngine.lastResults, dt);

  // Drive camera rig from gesture
  cameraRig.applyCommand(cmd);

  // Update current scene
  sceneHost.update(dt, cmd);

  // Slow background star rotation
  if (bgStars) bgStars.rotation.y += dt * 0.01;

  renderer.render(scene, camera);
}

// Start with first scene
switchScene('solar-system').then(() => {
  loaderEl.style.display = 'none';
});

animate(0);
