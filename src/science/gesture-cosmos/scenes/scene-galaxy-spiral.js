import * as THREE from 'three';
import { createGestureState, applyGestureControl } from '../core/gesture-control.js';

export const name = 'galaxy-spiral';

const GALAXIES = {
  'milkyway': {
    name: 'MILKY WAY',
    particles: 160000,
    arms: 2,
    radius: 50,
    spin: 3,
    randomness: 0.5,
    coreColor: 0xffaa66,
    armColor1: 0xaaccff,
    armColor2: 0x4422aa,
    outerColor: 0x112233,
    coreSize: 0.15
  },
  'andromeda': {
    name: 'ANDROMEDA',
    particles: 180000,
    arms: 4,
    radius: 60,
    spin: 5,
    randomness: 0.8,
    coreColor: 0xffffee,
    armColor1: 0x88ccff,
    armColor2: 0xddddff,
    outerColor: 0x334455,
    coreSize: 0.25
  },
  'whirlpool': {
    name: 'WHIRLPOOL M51',
    particles: 150000,
    arms: 2,
    radius: 45,
    spin: 6,
    randomness: 0.3,
    coreColor: 0xffffff,
    armColor1: 0xff0066,
    armColor2: 0x4400cc,
    outerColor: 0x000000,
    coreSize: 0.1
  },
  'sombrero': {
    name: 'SOMBRERO M104',
    particles: 140000,
    arms: 0,
    radius: 40,
    spin: 10,
    randomness: 0.2,
    coreColor: 0xffdd44,
    armColor1: 0xff5522,
    armColor2: 0x220000,
    outerColor: 0x110000,
    coreSize: 0.5
  },
  'nebula': {
    name: 'COSMIC NEBULA',
    particles: 200000,
    arms: 3,
    radius: 70,
    spin: 1,
    randomness: 2.0,
    coreColor: 0x00ffcc,
    armColor1: 0xff00ff,
    armColor2: 0x0044ff,
    outerColor: 0x000000,
    coreSize: 0.05
  }
};

let _ctx = null;
let _particleSystem = null;
let _bgStars = null;
let _glowTexture = null;
let _time = 0;
let _disposables = [];
let _uiEl = null;
let _hudEl = null;
let _statusEl = null;
let _gs = null;

function createGalaxyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  const grad = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.1, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  _disposables.push(tex);
  return tex;
}

function createBackground() {
  const geom = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 10000; i++) {
    pos.push(
      (Math.random() - 0.5) * 1000,
      (Math.random() - 0.5) * 1000,
      (Math.random() - 0.5) * 1000
    );
  }
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x666666, size: 0.5, transparent: true, opacity: 0.6
  });
  const stars = new THREE.Points(geom, mat);
  _disposables.push(geom, mat);
  return stars;
}

function generateGalaxy(params) {
  if (_particleSystem) {
    _ctx.scene.remove(_particleSystem);
    if (_particleSystem.geometry) _particleSystem.geometry.dispose();
    if (_particleSystem.material) _particleSystem.material.dispose();
    _particleSystem = null;
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(params.particles * 3);
  const colors = new Float32Array(params.particles * 3);
  const sizes = new Float32Array(params.particles);

  const colorCore = new THREE.Color(params.coreColor);
  const colorArm1 = new THREE.Color(params.armColor1);
  const colorArm2 = new THREE.Color(params.armColor2);
  const colorOuter = new THREE.Color(params.outerColor);
  const tempColor = new THREE.Color();

  for (let i = 0; i < params.particles; i++) {
    const r = Math.random();
    const radius = r * params.radius;

    const spinAngle = radius * params.spin;

    let branchAngle = 0;
    if (params.arms > 0) {
      const branchIdx = i % params.arms;
      branchAngle = (branchIdx / params.arms) * Math.PI * 2;
    }

    const randomX = Math.pow(Math.random(), params.randomness) * (Math.random() < 0.5 ? 1 : -1) * (params.radius / 2) * (r + 0.1);
    const randomY = Math.pow(Math.random(), params.randomness) * (Math.random() < 0.5 ? 1 : -1) * (params.radius / 2) * (r + 0.1);
    const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (params.radius * 0.2) * (1 - r);

    const finalAngle = branchAngle + spinAngle;

    const x = Math.cos(finalAngle) * radius + randomX;
    const z = Math.sin(finalAngle) * radius + randomY;
    const y = randomZ;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const distRatio = Math.sqrt(x * x + z * z) / params.radius;

    let colorMixed;

    if (distRatio < params.coreSize) {
      colorMixed = colorCore;
    } else {
      const baseMix = colorArm1.clone().lerp(colorOuter, distRatio);
      const noise = Math.random();
      if (noise > 0.9) {
        tempColor.setHex(0xffffff).lerp(colorArm1, 0.5);
      } else if (noise < 0.3) {
        tempColor.copy(colorArm2).lerp(colorOuter, 0.5);
      } else {
        tempColor.copy(baseMix);
      }
      colorMixed = tempColor;
    }

    colors[i * 3] = colorMixed.r;
    colors[i * 3 + 1] = colorMixed.g;
    colors[i * 3 + 2] = colorMixed.b;

    let pSize = Math.random() * 0.3 + 0.05;
    if (Math.random() > 0.995) pSize += 0.8;
    sizes[i] = pSize;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  geometry.userData = { originalPos: Float32Array.from(positions) };

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    map: _glowTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const system = new THREE.Points(geometry, material);
  system.rotation.x = 0.5;
  _ctx.scene.add(system);
  _particleSystem = system;
}

function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  // HUD
  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1 id="spiral-galaxy-name">MILKY WAY</h1>
    <div class="subtitle">Unit 5: Patterns and Cycles</div>
  `;
  container.appendChild(_hudEl);

  // Status HUD
  _statusEl = document.createElement('div');
  _statusEl.className = 'scene-status';
  _statusEl.innerHTML = `
    INVESTIGATION: <span id="spiral-tracking-status">MOUSE CONTROL</span><br>
    FPS: <span id="spiral-fps">60</span>
  `;
  container.appendChild(_statusEl);

  // Sidebar Controls
  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';

  Object.keys(GALAXIES).forEach(key => {
    const galaxy = GALAXIES[key];
    const btn = document.createElement('button');
    btn.className = 'scene-btn' + (key === 'milkyway' ? ' active' : '');
    btn.textContent = galaxy.name;
    btn.addEventListener('click', () => {
      generateGalaxy(galaxy);
      const title = document.getElementById('spiral-galaxy-name');
      if (title) title.textContent = galaxy.name;
      
      const buttons = _uiEl.querySelectorAll('.scene-btn');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    _uiEl.appendChild(btn);
  });

  container.appendChild(_uiEl);
}

export function init(ctx) {
  _ctx = ctx;

  ctx.scene.fog = new THREE.FogExp2(0x000000, 0.002);

  _glowTexture = createGalaxyTexture();

  _bgStars = createBackground();
  ctx.scene.add(_bgStars);

  _gs = createGestureState();
  generateGalaxy(GALAXIES['milkyway']);
  createUI();
}

export function update(dt, cmd) {
  if (!_ctx) return;
  _time += 0.002;

  // Update status indicator
  const statusEl = document.getElementById('spiral-tracking-status');
  if (statusEl) {
    const hasHand = _ctx.handEngine && _ctx.handEngine.isRunning &&
      _ctx.handEngine.lastResults &&
      _ctx.handEngine.lastResults.multiHandLandmarks &&
      _ctx.handEngine.lastResults.multiHandLandmarks.length > 0;
    statusEl.textContent = hasHand ? 'GESTURE ACTIVE' : 'MOUSE CONTROL';
  }
  const fpsEl = document.getElementById('spiral-fps');
  if (fpsEl && dt > 0) fpsEl.textContent = Math.round(1 / dt);

  if (_particleSystem) {
    // Shared gesture control: scale + rotation
    applyGestureControl(_particleSystem, cmd, _gs, dt);

    // Auto self-rotation
    _particleSystem.rotation.y -= 0.0003;

    // Entry scale-up
    if (_particleSystem.scale.x < 0.01) {
      _particleSystem.scale.setScalar(0.01);
    }

    _particleSystem.position.set(0, 0, 0);
  }
}

export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_statusEl && _statusEl.parentNode) _statusEl.parentNode.removeChild(_statusEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _statusEl = null;
  _uiEl = null;

  if (_particleSystem) {
    _ctx.scene.remove(_particleSystem);
    if (_particleSystem.geometry) _particleSystem.geometry.dispose();
    if (_particleSystem.material) _particleSystem.material.dispose();
    _particleSystem = null;
  }
  if (_bgStars) {
    _ctx.scene.remove(_bgStars);
    _bgStars = null;
  }

  _disposables.forEach(d => {
    if (d.dispose) d.dispose();
  });

  _ctx.scene.fog = null;
  _disposables = [];
  _ctx = null;
}
