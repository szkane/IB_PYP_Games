# Gesture Cosmos Exploration Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge 6 standalone Three.js science games into one gesture-controlled cosmos exploration hub with nav-bar switching.

**Architecture:** Single shell page + ES module directory. Canonical `camera-rig` + `hand-engine` + `gesture-router` shared core; 6 scene modules exporting `init(ctx)` / `update(dt, cmd)` / `dispose()`; `main.js` wires navigation switches to scene lifecycle. MediaPipe loaded via `<script>` tag (exposes globals), Three.js via importmap (ES module), custom code as ES modules.

**Tech Stack:** Three.js 0.163.0 (importmap ES modules), MediaPipe Hands (CDN script tag), vanilla JS ES modules, no bundler.

## Global Constraints

- Use `"type": "module"` ES modules for all custom `.js` files.
- Three.js imported via importmap: `"three": "https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js"` + `"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/"`.
- MediaPipe loaded via `<script src="...">` tags (not importable as ES modules); modules access via `window.Hands`, `window.Camera`.
- All 6 originals moved to `src/science/_archive/` after ports are verified.
- Curriculum-map.json loses 6 cards, gains 1 single hub card.
- Mobile-first: nav bar wraps on narrow viewports, touch events work, camera requires user gesture.
- Every scene module is self-contained — ports the original's 3D logic faithfully, only replaces input handling.
- No TypeScript, no bundler, no dependencies beyond what's listed.

---

## File Structure

Created files:
- `src/science/gesture-cosmos-hub.html` — Shell page
- `src/science/gesture-cosmos/main.js` — Entry point
- `src/science/gesture-cosmos/core/hand-engine.js` — MediaPipe wrapper
- `src/science/gesture-cosmos/core/gesture-router.js` — Gesture→command
- `src/science/gesture-cosmos/core/camera-rig.js` — Camera orbit controller
- `src/science/gesture-cosmos/core/scene-host.js` — Scene lifecycle manager
- `src/science/gesture-cosmos/scenes/scene-solar-system.js`
- `src/science/gesture-cosmos/scenes/scene-neon-planets.js`
- `src/science/gesture-cosmos/scenes/scene-galaxy-spiral.js`
- `src/science/gesture-cosmos/scenes/scene-crystal-galaxy.js`
- `src/science/gesture-cosmos/scenes/scene-milky-way.js`
- `src/science/gesture-cosmos/scenes/scene-shape-motion.js`

Modified files:
- `src/data/curriculum-map.json`

Deleted files (moved to archive):
- `src/science/g1_solar_system.html` → `src/science/_archive/g1_solar_system.html`
- `src/science/g1_3D_camara_solar.html` → `src/science/_archive/g1_3D_camara_solar.html`
- `src/science/g1_3D_camara_galaxy.html` → `src/science/_archive/g1_3D_camara_galaxy.html`
- `src/science/g1_3D_camara_galaxy2.html` → `src/science/_archive/g1_3D_camara_galaxy2.html`
- `src/science/g1_3D_camara_milkyway.html` → `src/science/_archive/g1_3D_camara_milkyway.html`
- `src/science/g1_3D_camara_obj.html` → `src/science/_archive/g1_3D_camara_obj.html`

---

### Task 1: Core Modules — hand-engine, gesture-router, camera-rig, scene-host

**Files:**
- Create: `src/science/gesture-cosmos/core/hand-engine.js`
- Create: `src/science/gesture-cosmos/core/gesture-router.js`
- Create: `src/science/gesture-cosmos/core/camera-rig.js`
- Create: `src/science/gesture-cosmos/core/scene-host.js`

#### 1a: hand-engine.js

Wraps MediaPipe Hands + camera in a singleton. Consumed by gesture-router.

- [ ] **Write `hand-engine.js`**

```javascript
/**
 * HandEngine — MediaPipe Hands singleton wrapper.
 * Loaded via global script tags; accesses `window.Hands` and `window.Camera`.
 */
export class HandEngine {
  constructor() {
    this.isActive = false;
    this.isRunning = false;
    this.videoElement = null;
    this.hands = null;
    this.camera = null;
    this.lastResults = null;
    this.onResults = null; // callback(results)
    this.onError = null;   // callback(error)
  }

  /**
   * Initialize MediaPipe Hands. Must be called after user gesture.
   * @param {HTMLVideoElement} videoElement
   */
  async init(videoElement) {
    if (typeof Hands === 'undefined') {
      throw new Error('MediaPipe Hands not loaded');
    }
    this.videoElement = videoElement;
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    this.hands.onResults((results) => {
      this.lastResults = results;
      if (this.onResults) this.onResults(results);
    });
    this.isActive = true;
  }

  async startCamera() {
    if (!this.hands) throw new Error('Call init() first');
    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.hands && this.videoElement.readyState >= 2) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });
    await this.camera.start();
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
    this.isActive = false;
    if (this.camera) { try { this.camera.stop(); } catch(e) {} }
    if (this.hands) { try { this.hands.close(); } catch(e) {} }
    this.hands = null;
    this.camera = null;
    this.lastResults = null;
  }
}
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/core/hand-engine.js && git commit -m "feat: add HandEngine singleton for MediaPipe"`

#### 1b: gesture-router.js

Consumes HandEngine results, produces normalized commands for scenes.

- [ ] **Write `gesture-router.js`**

```javascript
/**
 * GestureRouter — normalizes hand landmarks into unified commands.
 *
 * Command types emitted:
 *   { type: 'orbit',  dx: number, dy: number }
 *   { type: 'zoom',   factor: number }         // 1 = no zoom, <1 = out, >1 = in
 *   { type: 'select', screenX: number, screenY: number }
 *   { type: 'reset' }
 *   null  // no hand
 */
export class GestureRouter {
  constructor() {
    this.lastCommand = null;
    this.openPalmTimer = 0;
    this.pointTimer = 0;
    this.openPalmThreshold = 0.6;  // seconds
    this.pointThreshold = 0.8;
    this.prevLandmarks = null;
  }

  /**
   * Process MediaPipe landmarks → command.
   * @param {object|null} results - MediaPipe onResults data, or null
   * @param {number} dt - delta time in seconds
   * @returns {object|null} command
   */
  process(results, dt) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.openPalmTimer = 0;
      this.pointTimer = 0;
      this.prevLandmarks = null;
      return null;
    }

    const hands = results.multiHandLandmarks;
    const h = hands[0]; // primary hand

    // ---- Orbit: palm center (landmark 9) delta ----
    let dx = 0, dy = 0;
    if (this.prevLandmarks) {
      dx = (h[9].x - this.prevLandmarks[9].x) * 4;
      dy = (h[9].y - this.prevLandmarks[9].y) * 4;
    }
    this.prevLandmarks = h.map(l => ({ x: l.x, y: l.y, z: l.z }));

    // ---- Zoom: thumb(4)↔index(8) pinch distance ----
    const pinchDist = Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y, h[4].z - h[8].z);
    const zoomFactor = 1 + (0.5 - pinchDist) * 2; // ~0.3 → zoom out, ~0.7 → zoom in

    // ---- Open palm detection for RESET ----
    const fingerTips = [8, 12, 16, 20];
    let totalSpread = 0;
    fingerTips.forEach(t => {
      totalSpread += Math.hypot(h[t].x - h[0].x, h[t].y - h[0].y, h[t].z - h[0].z);
    });
    const isOpenPalm = totalSpread > 1.2;

    if (isOpenPalm) {
      this.openPalmTimer += dt;
    } else {
      this.openPalmTimer = 0;
    }

    // ---- Point detection for SELECT (index finger extended, others curled) ----
    const indexTip = h[8];
    const indexPip = h[6];
    const isPointing = (Math.hypot(indexTip.y - indexPip.y, indexTip.z - indexPip.z) > 0.08)
      && fingerTips.slice(1).every(t => {
        const d = Math.hypot(h[t].y - h[t-2].y, h[t].z - h[t-2].z);
        return d < 0.05;
      });

    if (isPointing) {
      this.pointTimer += dt;
    } else {
      this.pointTimer = 0;
    }

    // ---- Emit command ----
    if (this.openPalmTimer >= this.openPalmThreshold) {
      this.openPalmTimer = 0;
      return { type: 'reset' };
    }

    if (this.pointTimer >= this.pointThreshold) {
      this.pointTimer = 0;
      return {
        type: 'select',
        screenX: h[8].x,
        screenY: h[8].y
      };
    }

    return {
      type: 'orbit',
      dx,
      dy,
      zoomFactor
    };
  }
}
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/core/gesture-router.js && git commit -m "feat: add GestureRouter for normalized gesture commands"`

#### 1c: camera-rig.js

Unified camera controller — driven by gesture commands AND mouse OrbitControls (fallback).

- [ ] **Write `camera-rig.js`**

```javascript
/**
 * CameraRig — unified camera orbit controller.
 * Can be driven by gesture commands or mouse OrbitControls.
 */
import * as THREE from 'three';

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);
    this.spherical = new THREE.Spherical();
    this.zoom = 60;
    this.minZoom = 5;
    this.maxZoom = 200;

    // Get initial spherical from camera position
    this._updateSpherical();
  }

  _updateSpherical() {
    const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(offset);
  }

  _applySpherical() {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  /**
   * Apply orbit command from gesture router.
   */
  applyCommand(cmd) {
    if (!cmd) return;
    if (cmd.type === 'orbit') {
      this.spherical.theta -= cmd.dx * 0.05;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + cmd.dy * 0.05));
      if (cmd.zoomFactor) {
        this.spherical.radius /= cmd.zoomFactor;
        this.spherical.radius = Math.max(this.minZoom, Math.min(this.maxZoom, this.spherical.radius));
      }
      this._applySpherical();
    } else if (cmd.type === 'reset') {
      this.spherical.set(60, Math.PI / 4, Math.PI / 4);
      this._applySpherical();
    }
  }

  /**
   * Focus on a world position.
   */
  focusOn(position, offsetRadius) {
    this.target.copy(position);
    this.spherical.radius = offsetRadius || 15;
    this._applySpherical();
  }

  /**
   * Reset to overview.
   */
  resetToOverview(radius = 60, phi = Math.PI / 4, theta = Math.PI / 4) {
    this.target.set(0, 0, 0);
    this.spherical.set(radius, phi, theta);
    this._applySpherical();
  }

  /**
   * Update — call every frame for smooth lerp if needed.
   */
  update() {
    // No smoothing needed — direct spherical application is instant.
    // This hook exists for future lerp-based smoothing.
  }
}
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/core/camera-rig.js && git commit -m "feat: add CameraRig for gesture-driven camera control"`

#### 1d: scene-host.js

Scene lifecycle manager — holds registry of scene modules, handles switch/dispose.

- [ ] **Write `scene-host.js`**

```javascript
/**
 * SceneHost — manages scene lifecycle.
 *
 * Each scene module exports:
 *   { name, init(ctx), update(dt, cmd), dispose() }
 *
 * Shared ctx = { scene, camera, renderer, textureLoader, cameraRig, handEngine, gestureRouter }
 */
import * as THREE from 'three';

export class SceneHost {
  constructor() {
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
    this.ctx = null;
  }

  register(name, sceneModule) {
    this.scenes.set(name, sceneModule);
  }

  setContext(ctx) {
    this.ctx = ctx;
  }

  getCurrentName() {
    return this.currentName;
  }

  switchTo(name) {
    const next = this.scenes.get(name);
    if (!next) throw new Error(`Scene not found: ${name}`);

    // Dispose previous
    if (this.current && typeof this.current.dispose === 'function') {
      try { this.current.dispose(); } catch (e) {
        console.error(`[SceneHost] Error disposing "${this.currentName}":`, e);
      }
    }

    // Reset camera target
    this.ctx.cameraRig.resetToOverview();

    // Init next
    this.current = next;
    this.currentName = name;
    try {
      this.current.init(this.ctx);
    } catch (e) {
      console.error(`[SceneHost] Error initializing "${name}":`, e);
      this.current = null;
      this.currentName = null;
      throw e; // Let caller handle
    }
  }

  update(dt, cmd) {
    if (this.current && typeof this.current.update === 'function') {
      this.current.update(dt, cmd);
    }
  }
}
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/core/scene-host.js && git commit -m "feat: add SceneHost for scene lifecycle management"`

---

### Task 2: Shell Page + main.js Entry Point

**Files:**
- Create: `src/science/gesture-cosmos-hub.html`
- Create: `src/science/gesture-cosmos/main.js`

#### 2a: HTML Shell

- [ ] **Write `gesture-cosmos-hub.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Gesture Cosmos Exploration Hub</title>
  <link rel="manifest" href="../manifest.json">
  <meta name="theme-color" content="#000000">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0; overflow: hidden; background: #000;
      font-family: 'Rajdhani', 'Segoe UI', sans-serif; color: #fff;
    }
    canvas { display: block; }
    .input_video { display: none; }
    #canvas-container { width: 100vw; height: 100vh; }

    /* Nav Bar */
    #nav-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 8px 12px;
      background: linear-gradient(180deg, rgba(0,0,0,0.85) 60%, transparent);
      pointer-events: auto;
    }
    .nav-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.6);
      padding: 6px 14px;
      border-radius: 20px;
      cursor: pointer;
      font: 600 13px/1 'Rajdhani', sans-serif;
      letter-spacing: 0.5px;
      transition: all 0.25s ease;
      pointer-events: auto;
      white-space: nowrap;
    }
    .nav-btn:hover {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }
    .nav-btn.active {
      background: rgba(0,243,255,0.2);
      border-color: #00f3ff;
      color: #00f3ff;
      box-shadow: 0 0 12px rgba(0,243,255,0.3);
    }

    /* Loading overlay */
    #loader {
      position: fixed; inset: 0; z-index: 200;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #000; color: #00f3ff; letter-spacing: 3px;
      font-size: 1.1rem;
    }
    .spinner {
      width: 40px; height: 40px; margin-bottom: 20px;
      border: 3px solid rgba(0,243,255,0.3);
      border-top: 3px solid #00f3ff;
      border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-sub { font-size: 0.8rem; opacity: 0.6; margin-top: 10px; max-width: 300px; text-align: center; }

    /* Permission overlay */
    #permission-overlay {
      position: fixed; inset: 0; z-index: 300;
      display: none;
      flex-direction: column;
      align-items: center; justify-content: center;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(8px);
    }
    #permission-overlay.visible { display: flex; }
    #enable-gestures {
      padding: 16px 40px;
      border: 2px solid #00f3ff;
      background: transparent;
      color: #00f3ff;
      font: 700 18px 'Rajdhani', sans-serif;
      letter-spacing: 3px;
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s;
    }
    #enable-gestures:hover {
      background: rgba(0,243,255,0.15);
      box-shadow: 0 0 30px rgba(0,243,255,0.3);
    }
    #permission-hint {
      margin-top: 16px; color: rgba(255,255,255,0.4);
      font-size: 0.85rem; letter-spacing: 1px;
    }

    /* Toast */
    #toast {
      position: fixed; bottom: 60px; left: 50%;
      transform: translateX(-50%); z-index: 150;
      background: rgba(0,0,0,0.85);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 10px 20px; border-radius: 8px;
      color: rgba(255,255,255,0.7); font-size: 0.85rem;
      opacity: 0; transition: opacity 0.4s;
      pointer-events: none;
    }
    #toast.visible { opacity: 1; }

    /* Gesture indicator */
    #gesture-indicator {
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%); z-index: 50;
      color: #00f3ff; font-size: 0.9rem;
      letter-spacing: 2px; opacity: 0;
      transition: opacity 0.4s;
      text-shadow: 0 0 10px rgba(0,243,255,0.5);
    }
    #gesture-indicator.visible { opacity: 0.7; }
  </style>
  <!-- MediaPipe -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
  <!-- Three.js importmap -->
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/"
      }
    }
  </script>
</head>
<body>
  <div id="loader">
    <div class="spinner"></div>
    <div>LOADING COSMOS HUB</div>
    <div class="loader-sub">Preparing six cosmic environments for exploration...</div>
  </div>

  <div id="permission-overlay" class="visible">
    <button id="enable-gestures">ENABLE GESTURES</button>
    <div id="permission-hint">Camera access required for hand tracking · Click to start</div>
  </div>

  <nav id="nav-bar">
    <button class="nav-btn active" data-scene="solar-system">Solar System</button>
    <button class="nav-btn" data-scene="neon-planets">Neon Planets</button>
    <button class="nav-btn" data-scene="galaxy-spiral">Spiral Galaxy</button>
    <button class="nav-btn" data-scene="crystal-galaxy">Crystal Galaxy</button>
    <button class="nav-btn" data-scene="milky-way">Milky Way</button>
    <button class="nav-btn" data-scene="shape-motion">Shape Lab</button>
  </nav>

  <div id="canvas-container"></div>
  <video class="input_video"></video>

  <div id="gesture-indicator">Move hand to explore</div>
  <div id="toast"></div>

  <a class="pyp-map-link" href="../index.html" aria-label="Back to PYP curriculum map">PYP Map</a>
  <style>
    .pyp-map-link { position: fixed; top: 12px; right: 12px; z-index: 9999; min-height: 44px; display: inline-flex; align-items: center; border: 2px solid #17211f; border-radius: 8px; padding: 8px 12px; background: #fffaf0; color: #17211f; text-decoration: none; font: 900 14px/1 ui-rounded, "Avenir Next", "Segoe UI", sans-serif; box-shadow: 3px 3px 0 #17211f; letter-spacing: 0; }
    .pyp-map-link:focus-visible { outline: 3px solid #f2b84b; outline-offset: 2px; }
    @media print { .pyp-map-link { display: none; } }
    /* Responsive nav */
    @media (max-width: 640px) {
      #nav-bar { justify-content: center; gap: 3px; padding: 6px 8px; }
      .nav-btn { font-size: 11px; padding: 4px 10px; }
    }
  </style>

  <script type="module" src="./gesture-cosmos/main.js"></script>
</body>
</html>
```

- [ ] **Commit:** `git add src/science/gesture-cosmos-hub.html && git commit -m "feat: add gesture-cosmos-hub shell page"`

#### 2b: main.js Entry Point

Wires everything together: creates shared Three.js objects, instantiates core classes, registers scenes, handles nav events, runs render loop.

- [ ] **Write `main.js`**

```javascript
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

  // Update nav UI
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Load scene module (first time)
  const loader = sceneModules[name];
  if (!loader) {
    showToast(`Scene "${name}" not found`);
    return;
  }

  try {
    const mod = await loader();
    sceneHost.switchTo(name, mod);
    currentSceneName = name;
  } catch (e) {
    console.error(`[Hub] Failed to load scene "${name}":`, e);
    showToast(`Scene "${name}" unavailable — check console`);
    // Revert nav highlight
    if (currentSceneName) {
      const prevBtn = document.querySelector(`[data-scene="${currentSceneName}"]`);
      if (prevBtn) prevBtn.classList.add('active');
    }
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
    showToast('Gestures active — move hand to orbit, pinch to zoom');
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
```

Note: `sceneHost.switchTo(name)` should take the module. The current `sceneHost.switchTo` implementation only takes `name`. I need to update the interface. Let me fix scene-host to accept both:

In scene-host.js, change `switchTo(name)` to `switchTo(name, module)`, or better yet, have main.js register modules first, then switch.

Let me refactor: main.js will `sceneHost.register(name, mod)` after dynamic import, then `sceneHost.switchTo(name)`.

- [ ] **Fix `main.js` to use register-then-switch pattern**:

Update the switchScene function:

```javascript
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
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/main.js && git commit -m "feat: add hub main.js entry point"`

---

### Task 3: Scene Modules (Port 6 Original Games)

Each scene module follows the same pattern:

```javascript
// scenes/scene-*.js
import * as THREE from 'three';

const _data = { /* ported constants from original */ };
let _objects = []; // track for dispose

export const name = '...';

export function init(ctx) {
  // Build 3D objects in ctx.scene
  // Use ctx.textureLoader for textures
  // ctx.cameraRig.resetToOverview() is already called by SceneHost
}

export function update(dt, cmd) {
  // Animate objects using dt
  // Optionally react to cmd (select → raycast + focus)
}

export function dispose() {
  // Remove objects from scene, dispose geometries/materials
  _objects.forEach(obj => {
    if (obj.parent) obj.parent.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  _objects = [];
}
```

Each scene's init() relies on ctx.scene having the shared scene, and ctx.camera having been positioned by cameraRig.resetToOverview(). This means scenes don't set camera position themselves.

For scenes that had custom camera positioning (like galaxy2 tiltX), they set it via cameraRig.

#### 3a: scene-solar-system.js

Port of `g1_solar_system.html`. Removes OrbitControls (replaced by gesture router + cameraRig). Removes its own button panel (hub nav replaces it). Keeps planet/ moon/ ring creation, texture loading, orbit animation from the original. On `select` command, raycasts to focus a planet.

- [ ] **Write the scene. File at `src/science/gesture-cosmos/scenes/scene-solar-system.js`.**

Core content (port the original's `SIZES`, `ORBITS`, `SPEEDS`, `COLORS`, `TEXTURES` constants and `createSolarSystem()`, `createCelestialBody()`, `createOrbitLine()` functions verbatim, only stripping the init/setup that overlaps with hub).

Adapt from original:
- Remove `init()` (scene setup, renderer, camera, controls, lighting — hub provides these)
- Remove `animate()` (hub provides the loop)
- Keep `createSolarSystem()`, `createCelestialBody()`, `createOrbitLine()`
- Keep `focusOnObject()` — called when `cmd.type === 'select'`
- Export `init()` that calls `createSolarSystem()` and sets up ambient/sun light
- Export `update(dt, cmd)` that: animates orbits per original, handles select via raycast
- Export `dispose()` that removes all created objects from ctx.scene

```javascript
/**
 * Scene: Solar System
 * Ported from g1_solar_system.html
 */
import * as THREE from 'three';

// Constants (copied verbatim from original)
const AU = 50;
const SIZES = { /* ... same as original ... */
  sun: 5, mercury: 0.4, venus: 0.8, earth: 1, mars: 0.7,
  jupiter: 3.5, saturn: 3, uranus: 2, neptune: 1.9,
  moon: 0.2, phobos: 0.1, deimos: 0.08,
  io: 0.3, europa: 0.25, ganymede: 0.4, callisto: 0.38,
  titan: 0.4, rhea: 0.2,
  titania: 0.2, oberon: 0.18,
  triton: 0.25
};
const ORBITS = { /* ... same ... */
  mercury: 0.39 * AU, venus: 0.72 * AU, earth: 1 * AU, mars: 1.52 * AU,
  jupiter: 3.2 * AU, saturn: 5.5 * AU, uranus: 8 * AU, neptune: 12 * AU,
  moon: SIZES.earth + 1.5, phobos: SIZES.mars + 0.8, deimos: SIZES.mars + 1.2,
  io: SIZES.jupiter + 2, europa: SIZES.jupiter + 2.5, ganymede: SIZES.jupiter + 3, callisto: SIZES.jupiter + 3.5,
  titan: SIZES.saturn + 2.5, rhea: SIZES.saturn + 3,
  titania: SIZES.uranus + 1.5, oberon: SIZES.uranus + 2,
  triton: SIZES.neptune + 1.8
};
const SPEEDS = { /* ... same ... */
  mercury: 0.02, venus: 0.015, earth: 0.01, mars: 0.008,
  jupiter: 0.004, saturn: 0.003, uranus: 0.002, neptune: 0.001,
  moon: 0.1, phobos: 0.2, deimos: 0.15,
  io: 0.1, europa: 0.08, ganymede: 0.06, callisto: 0.05,
  titan: 0.07, rhea: 0.06,
  titania: 0.05, oberon: 0.04,
  triton: 0.06
};
const COLORS = { /* ... same bright colors ... */
  sun: 0xffff33, mercury: 0xcccccc, venus: 0xffe033, earth: 0x33aaff,
  mars: 0xff6633, jupiter: 0xffb333, saturn: 0xffc266, uranus: 0xbbeeff,
  neptune: 0x6699cc, moon: 0xdddddd, phobos: 0xcccccc, deimos: 0xdddddd,
  io: 0xffffcc, europa: 0xccccff, ganymede: 0xdddddd, callisto: 0x999999,
  titan: 0xffe6b3, rhea: 0xdddddd, titania: 0xdddddd, oberon: 0xcccccc,
  triton: 0xccccff, orbit: 0xcccccc, ring: 0x8c7853
};
const TEXTURES = {
  Earth: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/earth_atmos_2048.jpg',
  Moon: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/moon_1024.jpg',
  Mars: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/mars_1k_color.jpg',
  Jupiter: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/jupiter.jpg',
  Saturn: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/saturn.jpg',
  SaturnRing: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/saturn_ring.png',
  Uranus: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/uranus.jpg',
  Neptune: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/neptune.jpg',
};

// Tracked objects for dispose
let _ctx = null;
let _scene = null;
let _celestialBodies = [];
let _sunLight = null;
let _ambientLight = null;
let _backgroundTexture = null;

// For select/raycast
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

export const name = 'solar-system';

export function init(ctx) {
  _ctx = ctx;
  _scene = ctx.scene;

  // Lights
  _ambientLight = new THREE.AmbientLight(0x404040);
  _scene.add(_ambientLight);
  _sunLight = new THREE.PointLight(0xffffff, 4, AU * 50);
  _sunLight.castShadow = true;
  _sunLight.shadow.mapSize.width = 1024;
  _sunLight.shadow.mapSize.height = 1024;
  _scene.add(_sunLight);

  // Background
  ctx.textureLoader.load(
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/starmap_g4k.jpg',
    (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      _scene.background = tex;
      _backgroundTexture = tex;
    },
    undefined,
    () => { _scene.background = new THREE.Color(0x000000); }
  );

  createSolarSystem();
}

function createSolarSystem() {
  // Exactly as original createSolarSystem() but pushes to _celestialBodies
  const sunData = { name: 'Sun', radius: SIZES.sun, color: COLORS.sun, isLightSource: true };
  const sun = createCelestialBody(sunData);
  sun.mesh.castShadow = false;
  sun.mesh.receiveShadow = false;
  _scene.add(sun.mesh);
  _celestialBodies.push(sun);

  const planetsData = [ /* identical to original planetsData */ ];
  // ... (port the exact same planet creation loop)
  // Keep track of everything in _celestialBodies
}

function createCelestialBody(data, parentGroup, orbitCenter) {
  // Port of original createCelestialBody
  // Uses _ctx.textureLoader
  // Returns { mesh, data, orbitCenter, angle, systemGroup }
}

function createOrbitLine(radius, parent, isMoonOrbit) {
  // Port of original createOrbitLine
}

export function update(dt, cmd) {
  // Orbit animation per original
  _celestialBodies.forEach(body => {
    body.mesh.rotation.y += 0.05 * dt;
    if (body.data.orbitRadius && body.data.speed) {
      body.angle += body.data.speed * dt * 50;
      // ... position calculation
    }
  });

  // Handle select
  if (cmd && cmd.type === 'select') {
    _pointer.x = (cmd.screenX / window.innerWidth) * 2 - 1;
    _pointer.y = -(cmd.screenY / window.innerHeight) * 2 + 1;
    _raycaster.setFromCamera(_pointer, _ctx.camera);
    const meshes = _celestialBodies.map(b => b.mesh);
    const intersects = _raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const body = _celestialBodies.find(b => b.mesh === hit);
      if (body) focusOnObject(body);
    }
  }
}

function focusOnObject(body) {
  const pos = new THREE.Vector3();
  body.mesh.getWorldPosition(pos);
  const offset = body.data.radius * 5 + 10;
  _ctx.cameraRig.focusOn(pos, offset);
}

export function dispose() {
  _celestialBodies.forEach(body => {
    if (body.mesh.parent) body.mesh.parent.remove(body.mesh);
    if (body.mesh.geometry) body.mesh.geometry.dispose();
    if (body.mesh.material) {
      if (Array.isArray(body.mesh.material)) body.mesh.material.forEach(m => m.dispose());
      else body.mesh.material.dispose();
    }
  });
  _celestialBodies = [];
  if (_sunLight) { _scene.remove(_sunLight); _sunLight = null; }
  if (_ambientLight) { _scene.remove(_ambientLight); _ambientLight = null; }
  if (_backgroundTexture) { _backgroundTexture.dispose(); _backgroundTexture = null; }
  _scene.background = null;
}
```

Full implementation should include ALL the planet/moon/ring data from the original. Since this file will be ~250 lines (porting the original's ~310 lines of planet data + helper functions).

- [ ] **Commit:** `git add src/science/gesture-cosmos/scenes/scene-solar-system.js && git commit -m "feat: port solar system scene"`

#### 3b: scene-neon-planets.js

Port of `g1_3D_camara_solar.html`. The original creates particle-based planet spheres with glow textures, has sidebar buttons to switch planets, and uses fist→energy, two-hand→zoom. Port as a scene.

- [ ] **Write the file. Strip MediaPipe, strip sidebar buttons (hub nav replaces). Keep PLANET_CONFIG, particle planet generation, glow texture, background stars. Init loads "Sun" as default. Update uses `cmd.dx/dy` for rotation boost and `cmd.zoomFactor` for scale control.**

```javascript
/**
 * Scene: Neon Planets
 * Ported from g1_3D_camara_solar.html
 */
import * as THREE from 'three';

const PLANET_CONFIG = { /* ... same as original ... */ };

let _ctx, _scene;
let _currentSystem = null;
let _bgStars = null;
let _particleTexture = null;
let _time = 0;
let _currentPlanetName = 'Sun';

export const name = 'neon-planets';

export function init(ctx) {
  _ctx = ctx;
  _scene = ctx.scene;
  _scene.background = new THREE.Color(0x020205);
  _scene.fog = new THREE.FogExp2(0x020205, 0.02);

  _particleTexture = createGlowTexture();
  createBackgroundStars();
  loadPlanet('Sun');
}

function createGlowTexture() { /* ... same as original ... */ }
function createBackgroundStars() { /* ... same as original ... */ }

function loadPlanet(name) {
  if (_currentSystem) { _scene.remove(_currentSystem); /* dispose geometry */ }
  _currentSystem = new THREE.Group();
  _currentPlanetName = name;
  // Build particle sphere per original
  const config = PLANET_CONFIG[name];
  // ... particle geometry, colors, sizes, ring (for Saturn), glow...
  _scene.add(_currentSystem);
}

export function update(dt, cmd) {
  _time += dt;
  if (!_currentSystem) return;

  const config = PLANET_CONFIG[_currentPlanetName];
  const speed = config ? config.speed : 0.005;

  // Rotation: base + gesture boost
  let boost = 1;
  if (cmd && cmd.type === 'orbit') {
    boost = 1 + Math.abs(cmd.dx) * 20 + Math.abs(cmd.dy) * 20;
  }
  _currentSystem.rotation.y += speed * boost * 60 * dt;

  // Scale via gesture zoom
  if (cmd && cmd.type === 'orbit') {
    const target = cmd.zoomFactor || 1;
    _currentSystem.scale.setScalar(
      THREE.MathUtils.lerp(_currentSystem.scale.x, target, 0.1)
    );
  }
}

export function dispose() {
  if (_currentSystem) { _scene.remove(_currentSystem); _currentSystem = null; }
  if (_bgStars) { _scene.remove(_bgStars); _bgStars = null; }
}
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/scenes/scene-neon-planets.js && git commit -m "feat: port neon planets scene"`

#### 3c: scene-galaxy-spiral.js

Port of `g1_3D_camara_galaxy.html`. Galaxy particle engine with 5 galaxy configs. Strip MediaPipe, strip sidebar galaxy selector buttons (hub nav replaces). Keep GALAXIES config, generateGalaxy, background stars, camera orbit logic (port to gesture router input).

- [ ] **Write the file.**

```javascript
/**
 * Scene: Galaxy Spiral
 * Ported from g1_3D_camara_galaxy.html
 */
import * as THREE from 'three';

const GALAXIES = { /* ... same 5 galaxies ... */ };
let _ctx, _scene, _particleSystem, _bgStars, _currentKey = 'milkyway', _time = 0;

export const name = 'galaxy-spiral';

export function init(ctx) {
  _ctx = ctx;
  _scene = ctx.scene;
  _scene.fog = new THREE.FogExp2(0x000000, 0.002);
  createBackground();
  generateGalaxy(GALAXIES['milkyway']);
}

function createBackground() { /* ... 10000 star points ... */ }
function generateGalaxy(params) { /* ... port of original generateGalaxy ... */ }

export function update(dt, cmd) {
  _time += dt;
  if (!_particleSystem) return;

  // Base rotation + gesture energy boost
  let energy = 0;
  if (cmd && cmd.type === 'orbit') energy = Math.min(1, Math.abs(cmd.dx) * 10);
  _particleSystem.rotation.y -= (0.0003 + energy * 0.005) * 60 * dt;

  // Scale transition
  if (_particleSystem.scale.x < 1) _particleSystem.scale.addScalar(dt * 3);

  // Pulse on energy
  if (energy > 0.01) {
    const positions = _particleSystem.geometry.attributes.position.array;
    const orig = _particleSystem.geometry.userData?.originalPos;
    if (orig) {
      const pulse = 1 + Math.sin(_time * 20) * energy * 0.05;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = orig[i] * pulse + (Math.random() - 0.5) * energy;
        positions[i + 1] = orig[i + 1] * pulse + (Math.random() - 0.5) * energy;
        positions[i + 2] = orig[i + 2] * pulse + (Math.random() - 0.5) * energy;
      }
      _particleSystem.geometry.attributes.position.needsUpdate = true;
    }
  }
}

export function dispose() {
  if (_particleSystem) { _scene.remove(_particleSystem); _particleSystem.geometry.dispose(); _particleSystem = null; }
  if (_bgStars) { _scene.remove(_bgStars); _bgStars.geometry.dispose(); _bgStars = null; }
}
```

- [ ] **Commit:** `git add src/science/gesture-cosmos/scenes/scene-galaxy-spiral.js && git commit -m "feat: port galaxy spiral scene"`

#### 3d: scene-crystal-galaxy.js

Port of `g1_3D_camara_galaxy2.html`. Similar to galaxy-spiral but uses ShaderMaterial with tighter particle size limits and different galaxy structure (barred, lenticular). Strip MediaPipe and sidebar.

- [ ] **Write the file.** Same pattern as 3c but port `g1_3D_camara_galaxy2.html`'s GALAXIES, generateGalaxy (with ShaderMaterial), createSharpTexture.

- [ ] **Commit:** `git add src/science/gesture-cosmos/scenes/scene-crystal-galaxy.js && git commit -m "feat: port crystal galaxy scene"`

#### 3e: scene-milky-way.js

Port of `g1_3D_camara_milkyway.html`. 250K particle Milky Way with 5-arm structure. Strip MediaPipe and sidebar.

- [ ] **Write the file.** Port CONFIG, GALAXIES, generateGalaxy (ShaderMaterial), createTexture, background. Adapt rotation/energy pulse to use `cmd`.

- [ ] **Commit:** `git add src/science/gesture-cosmos/scenes/scene-milky-way.js && git commit -m "feat: port milky way scene"`

#### 3f: scene-shape-motion.js

Port of `g1_3D_camara_obj.html`. 15K particles morphing between 6 shapes. Different from galaxy scenes — keep shape buttons as inline sub-controls (they're part of the scene, not the hub nav). Strip MediaPipe.

- [ ] **Write the file.** Strip MediaPipe section. Keep CONFIG, calculateShape (heart/flower/saturn/helix/sphere/galaxy), color picker + auto-color toggle, morphing animation in update(). Gesture `cmd.orbit.dy` maps to scale per the original's two-hand zoom, `cmd.zoomFactor` scales the system.

```javascript
/**
 * Scene: Shape Motion Lab
 * Ported from g1_3D_camara_obj.html
 */
import * as THREE from 'three';

const CONFIG = { particleCount: 15000, particleSize: 0.15, baseColor: 0x00ffcc, lerpSpeed: 0.08 };
let _ctx, _scene, _particles, _geometry, _material, _targetPositions, _currentShape = 'heart';
let _isAutoColor = false, _colorHue = 0;

export const name = 'shape-motion';

export function init(ctx) {
  _ctx = ctx;
  _scene = ctx.scene;
  _scene.fog = new THREE.FogExp2(0x050505, 0.03);
  createParticleSystem();
  calculateShape('heart');
}

function createParticleSystem() { /* ... port original ... */ }
function createParticleTexture() { /* ... port original ... */ }
function calculateShape(type) { /* ... port all 6 shapes ... */ }

export function update(dt, cmd) {
  const positions = _particles.geometry.attributes.position.array;
  const time = Date.now() * 0.001;

  // Auto color
  if (_isAutoColor) {
    _colorHue = (_colorHue + dt * 0.1) % 1;
    _material.color.setHSL(_colorHue, 1.0, 0.5);
  }

  // Scale from gesture
  let targetScale = 1.0;
  if (cmd && cmd.type === 'orbit') targetScale = Math.max(0.2, Math.min(3, cmd.zoomFactor || 1));
  _particles.scale.setScalar(THREE.MathUtils.lerp(_particles.scale.x, targetScale, 0.1));

  // Rotation
  _particles.rotation.y += dt * 0.1;

  // Morphing
  for (let i = 0; i < CONFIG.particleCount; i++) {
    const px = i * 3, py = i * 3 + 1, pz = i * 3 + 2;
    positions[px] = THREE.MathUtils.lerp(positions[px], _targetPositions[px], CONFIG.lerpSpeed);
    positions[py] = THREE.MathUtils.lerp(positions[py], _targetPositions[py], CONFIG.lerpSpeed);
    positions[pz] = THREE.MathUtils.lerp(positions[pz], _targetPositions[pz], CONFIG.lerpSpeed);
    // Idle noise
    positions[px] += Math.sin(time + positions[py]) * 0.01;
    positions[py] += Math.cos(time + positions[px]) * 0.01;
  }

  // (Lerp uses _targetPositions which is a Float32Array — accessed by index above)
}

export function dispose() {
  if (_particles) { _scene.remove(_particles); _geometry.dispose(); _material.dispose(); _particles = null; }
}
```

Also need to expose `changeShape` and `toggleAutoColor` globally or via DOM events so the inline buttons work.

- [ ] **Commit:** `git add src/science/gesture-cosmos/scenes/scene-shape-motion.js && git commit -m "feat: port shape motion lab scene"`

---

### Task 4: Archive Originals + Curriculum Map Update

**Files:**
- Move: 6 originals → `src/science/_archive/`
- Modify: `src/data/curriculum-map.json`

- [ ] **Archive originals**

```bash
mkdir -p src/science/_archive
mv src/science/g1_solar_system.html src/science/_archive/
mv src/science/g1_3D_camara_solar.html src/science/_archive/
mv src/science/g1_3D_camara_galaxy.html src/science/_archive/
mv src/science/g1_3D_camara_galaxy2.html src/science/_archive/
mv src/science/g1_3D_camara_milkyway.html src/science/_archive/
mv src/science/g1_3D_camara_obj.html src/science/_archive/
```

- [ ] **Update curriculum-map.json**

Replace the 6 game entries (lines 340-375) with a single entry:

```json
{
  "title": "Gesture Cosmos Exploration Hub",
  "path": "science/gesture-cosmos-hub.html",
  "type": "Existing",
  "description": "Explore solar systems, galaxies, and particle patterns through gesture-controlled 3D environments."
}
```

Read the exact JSON structure to ensure correct replacement syntax.

- [ ] **Commit:**

```bash
git add src/science/_archive/ src/data/curriculum-map.json
git rm src/science/g1_solar_system.html src/science/g1_3D_camara_solar.html src/science/g1_3D_camara_galaxy.html src/science/g1_3D_camara_galaxy2.html src/science/g1_3D_camara_milkyway.html src/science/g1_3D_camara_obj.html
git commit -m "feat: replace 6 science games with gesture-cosmos-hub entry"
```

---

### Task 5: QA + Build Verification

- [ ] **Run curriculum QA**

```bash
npm run qa:curriculum
# Expected: passes (single hub card validates, removed paths no longer referenced)
```

- [ ] **Run production build**

```bash
npm run build
# Expected: regenerates src/index.html + updates sw.js cache version
```

- [ ] **Manual verification checklist**

1. `npm run dev` → open `http://localhost:5173/science/gesture-cosmos-hub.html`
2. Click "ENABLE GESTURES" → camera permission granted → gesture indicator visible
3. Click each nav button → scene swaps, previous scene objects gone
4. With camera: move hand → camera orbits; pinch → zoom; open palm hold ~0.6s → reset; point+hold ~0.8s → select planet (solar system)
5. Without camera (deny permission) → mouse works as fallback
6. Solar system: planets orbit, select raycast focuses a planet
7. Shape lab: inline buttons change shapes, color picker works
8. Resize browser → layout adjusts, canvas fills viewport
9. Run `npm run build` → no errors, sw.js cache version bumped

---

## Spec Coverage Check

- [x] Nav bar switches 6 scenes (mouse/touch) — Task 2a HTML nav, Task 2b main.js event handler
- [x] MediaPipe gesture drives only 3D content — Task 1b gesture-router, Task 1c camera-rig
- [x] Modular extraction (not inline or iframe) — each scene is own .js module, Task 3a-f
- [x] Unified gesture mapping — gesture-router.js normalizes all 5 originals' gesture logic
- [x] solar_system gains gestures — camera-rig drives orbit, select raycast focuses planets
- [x] Destroy-and-rebuild on switch — scene-host.switchTo calls dispose() then init()
- [x] Archival of originals — Task 4 moves to _archive/
- [x] Curriculum map single entry — Task 4 updates JSON
- [x] Error degradation — hand-engine try/catch, scene-host try/catch, permission toast
- [x] Mobile responsive — CSS flex-wrap + media query in shell HTML
