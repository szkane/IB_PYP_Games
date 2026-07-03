import * as THREE from 'three';
import { createGestureState, applyGestureControl } from '../core/gesture-control.js';

export const name = 'shape-motion';

let _ctx = null;
let _particles = null;
let _geometry = null;
let _material = null;
let _targetPositions = null;
let _removables = [];
let _disposables = [];
let _uiEl = null;
let _hudEl = null;

const PARTICLE_COUNT = 15000;
const LERP_SPEED     = 0.06;
let _currentShape    = 'heart';
let _colorHue        = 0;
let _autoColor       = false;

// Gesture state
let _gs              = null;
let _explosion       = 0;       // 0 = collapsed, 1 = fully exploded (lerp target)
let _explodeOffsets  = null;    // Float32Array, computed ONCE on fist rising edge

function createParticleTexture() {
  const canvas  = document.createElement('canvas');
  canvas.width  = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0,   'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

function setPos(arr, i, x, y, z) {
  arr[i * 3]     = x;
  arr[i * 3 + 1] = y;
  arr[i * 3 + 2] = z;
}

function calculateShape(type) {
  _currentShape   = type;
  _targetPositions = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x, y, z;
    const t = Math.random() * Math.PI * 2;

    if (type === 'heart') {
      const phi = Math.random() * Math.PI * 2;
      const hx  = 16 * Math.pow(Math.sin(phi), 3);
      const hy  = 13 * Math.cos(phi) - 5 * Math.cos(2 * phi) - 2 * Math.cos(3 * phi) - Math.cos(4 * phi);
      x = hx * 0.3 * (1 + (Math.random() - 0.5) * 0.2);
      y = hy * 0.3 * (1 + (Math.random() - 0.5) * 0.2);
      z = (Math.random() - 0.5) * 4;
    } else if (type === 'sphere') {
      const theta = Math.random() * 2 * Math.PI;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 6 * Math.pow(Math.random(), 1 / 3);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    } else if (type === 'flower') {
      const k   = 4;
      const rad = Math.cos(k * t) * 7;
      x = rad * Math.cos(t) + (Math.random() - 0.5);
      y = rad * Math.sin(t) + (Math.random() - 0.5);
      z = (Math.random() - 0.5) * 3;
    } else if (type === 'saturn') {
      if (i < PARTICLE_COUNT * 0.7) {
        const theta = Math.random() * 2 * Math.PI;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 4;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else {
        const angle  = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 4;
        x = Math.cos(angle) * radius;
        const rawZ = Math.sin(angle) * radius;
        const rawY = (Math.random() - 0.5) * 0.5;
        const tilt = 0.4;
        y = rawY * Math.cos(tilt) - rawZ * Math.sin(tilt);
        z = rawY * Math.sin(tilt) + rawZ * Math.cos(tilt);
      }
    } else if (type === 'helix') {
      const turns  = 4;
      const height = 12;
      const radius = 3;
      const side   = i % 2 === 0 ? 1 : -1;
      const p      = (i / PARTICLE_COUNT) * Math.PI * 2 * turns;
      x = Math.cos(p) * radius + (Math.random() - 0.5);
      z = Math.sin(p) * radius + (side * 3) + (Math.random() - 0.5);
      y = (i / PARTICLE_COUNT) * height - (height / 2);
    } else if (type === 'galaxy') {
      const coreRatio = 0.15;
      const haloRatio = 0.5;
      if (i < PARTICLE_COUNT * coreRatio) {
        const theta = Math.random() * 2 * Math.PI;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 3 * Math.pow(Math.random(), 1.5);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (i < PARTICLE_COUNT * (coreRatio + haloRatio)) {
        const theta = Math.random() * 2 * Math.PI;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 15 + Math.random() * 10;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else {
        const numArms   = 5;
        const arm       = i % numArms;
        const b         = 0.4;
        const progress  = (i - PARTICLE_COUNT * (coreRatio + haloRatio)) /
                          (PARTICLE_COUNT * (1 - coreRatio - haloRatio));
        const a         = progress * Math.PI * 10;
        const rad       = 2 * Math.exp(b * a);
        const armAngle  = (arm / numArms) * Math.PI * 2;
        x = Math.cos(a + armAngle) * rad + (Math.random() - 0.5) * 1.0;
        z = Math.sin(a + armAngle) * rad + (Math.random() - 0.5) * 1.0;
        y = (Math.random() - 0.5) * 0.5 * (1 - rad / 30);
      }
    }

    setPos(_targetPositions, i, x, y, z);
  }
}

/** Pre-compute stable per-particle explosion offsets — called ONCE on fist rising edge. */
function computeExplodeOffsets() {
  _explodeOffsets = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 8 + Math.random() * 12;
    _explodeOffsets[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    _explodeOffsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    _explodeOffsets[i * 3 + 2] = r * Math.cos(phi);
  }
}

function createParticleSystem() {
  _geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 50;
  }
  _geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const texture = createParticleTexture();
  _material = new THREE.PointsMaterial({
    color:      0x00ffcc,
    size:       0.40,
    map:        texture,
    transparent: true,
    opacity:    0.9,
    blending:   THREE.AdditiveBlending,
    depthWrite: false,
  });

  _disposables.push({ geometry: _geometry, material: _material, texture });
  _particles = new THREE.Points(_geometry, _material);
  return _particles;
}

export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x050505);
  ctx.scene.fog        = new THREE.FogExp2(0x050505, 0.03);

  const system = createParticleSystem();
  ctx.scene.add(system);
  _removables.push(system);

  _gs = createGestureState();
  calculateShape('heart');
  createUI();
}

export function update(dt, cmd) {
  if (!_particles || !_targetPositions) return;

  // ── Apply unified gesture control (scale + rotation) ──────────────────────
  applyGestureControl(_particles, cmd, _gs, dt);

  // ── Explosion: fist rising edge → compute offsets; falling edge = reconstruct ──
  if (_gs.fistRising) {
    computeExplodeOffsets();
  }
  const explosionTarget = _gs.fist ? 1.0 : 0.0;
  _explosion += (explosionTarget - _explosion) * 0.07;

  // ── Auto color ─────────────────────────────────────────────────────────────
  if (_autoColor) {
    _colorHue = (_colorHue + 0.001) % 1;
    _material.color.setHSL(_colorHue, 1.0, 0.5);
  }

  _particles.rotation.z = _currentShape === 'saturn' ? 0.2 : 0;

  // ── Per-particle lerp toward shape + explosion offset ──────────────────────
  const positions = _particles.geometry.attributes.position.array;
  const time      = performance.now() * 0.001;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const px = i * 3, py = px + 1, pz = px + 2;

    let tx = _targetPositions[px];
    let ty = _targetPositions[py];
    let tz = _targetPositions[pz];

    // Stable explosion: offsets pre-computed, lerp-blended by _explosion factor
    if (_explosion > 0.01 && _explodeOffsets) {
      tx += _explodeOffsets[px] * _explosion;
      ty += _explodeOffsets[py] * _explosion;
      tz += _explodeOffsets[pz] * _explosion;
    }

    positions[px] = positions[px] + (tx - positions[px]) * LERP_SPEED;
    positions[py] = positions[py] + (ty - positions[py]) * LERP_SPEED;
    positions[pz] = positions[pz] + (tz - positions[pz]) * LERP_SPEED;

    // Gentle organic breathing — very subtle, indexed not positional (no jitter)
    positions[px] += Math.sin(time * 0.4 + i * 0.0007) * 0.004;
    positions[py] += Math.cos(time * 0.4 + i * 0.0007) * 0.004;
  }

  _particles.geometry.attributes.position.needsUpdate = true;
}

function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1 id="shape-lab-title">HEART</h1>
    <div class="subtitle">Unit 5: Patterns and Cycles</div>
  `;
  container.appendChild(_hudEl);

  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';

  const shapes = ['heart', 'flower', 'saturn', 'helix', 'sphere', 'galaxy'];
  shapes.forEach(shapeName => {
    const btn = document.createElement('button');
    btn.className = 'scene-btn' + (shapeName === 'heart' ? ' active' : '');
    btn.textContent = shapeName;
    btn.addEventListener('click', () => {
      calculateShape(shapeName);
      // Reset explosion when switching shapes
      _explosion = 0;
      _explodeOffsets = null;

      const title = document.getElementById('shape-lab-title');
      if (title) title.textContent = shapeName.toUpperCase();

      const buttons = _uiEl.querySelectorAll('.scene-btn');
      buttons.forEach(b => { if (b.id !== 'btn-auto-color') b.classList.remove('active'); });
      btn.classList.add('active');
    });
    _uiEl.appendChild(btn);
  });

  const autoColorBtn = document.createElement('button');
  autoColorBtn.className = 'scene-btn';
  autoColorBtn.id = 'btn-auto-color';
  autoColorBtn.textContent = 'Auto Color: Off';
  autoColorBtn.addEventListener('click', () => {
    _autoColor = !_autoColor;
    autoColorBtn.textContent = _autoColor ? 'Auto Color: On' : 'Auto Color: Off';
    autoColorBtn.classList.toggle('active', _autoColor);
    if (!_autoColor) _material.color.setHex(0x00ffcc);
  });
  _uiEl.appendChild(autoColorBtn);

  container.appendChild(_uiEl);
}

export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl  && _uiEl.parentNode)  _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl  = null;

  _removables.forEach(obj => { if (obj.parent) obj.parent.remove(obj); });
  _disposables.forEach(d => {
    if (d.geometry) d.geometry.dispose();
    if (d.material) d.material.dispose();
    if (d.texture)  d.texture.dispose();
  });
  if (_ctx) { _ctx.scene.background = null; _ctx.scene.fog = null; }
  _removables      = [];
  _disposables     = [];
  _particles       = null;
  _geometry        = null;
  _material        = null;
  _targetPositions = null;
  _autoColor       = false;
  _explosion       = 0;
  _colorHue        = 0;
  _explodeOffsets  = null;
  _gs              = null;
  _ctx             = null;
}
