import * as THREE from 'three';

export const name = 'shape-motion';

let _ctx = null;
let _particles = null;
let _geometry = null;
let _material = null;
let _targetPositions = null;
let _removables = [];
let _disposables = [];

const PARTICLE_COUNT = 15000;
const LERP_SPEED = 0.08;
let _currentShape = 'heart';
let _scale = 1;
let _explosion = 0;
let _colorHue = 0;
let _autoColor = false;

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

function setPos(arr, i, x, y, z) {
  arr[i * 3] = x;
  arr[i * 3 + 1] = y;
  arr[i * 3 + 2] = z;
}

function calculateShape(type) {
  _currentShape = type;
  _targetPositions = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x, y, z;
    const t = Math.random() * Math.PI * 2;

    if (type === 'heart') {
      const phi = Math.random() * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(phi), 3);
      const hy = 13 * Math.cos(phi) - 5 * Math.cos(2 * phi) - 2 * Math.cos(3 * phi) - Math.cos(4 * phi);
      x = hx * 0.3 * (1 + (Math.random() - 0.5) * 0.2);
      y = hy * 0.3 * (1 + (Math.random() - 0.5) * 0.2);
      z = (Math.random() - 0.5) * 4;
    } else if (type === 'sphere') {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 6 * Math.pow(Math.random(), 1 / 3);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    } else if (type === 'flower') {
      const k = 4;
      const rad = Math.cos(k * t) * 7;
      x = rad * Math.cos(t) + (Math.random() - 0.5);
      y = rad * Math.sin(t) + (Math.random() - 0.5);
      z = (Math.random() - 0.5) * 3;
    } else if (type === 'saturn') {
      if (i < PARTICLE_COUNT * 0.7) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 4;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else {
        const angle = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 4;
        x = Math.cos(angle) * radius;
        const rawZ = Math.sin(angle) * radius;
        const rawY = (Math.random() - 0.5) * 0.5;
        const tilt = 0.4;
        y = rawY * Math.cos(tilt) - rawZ * Math.sin(tilt);
        z = rawY * Math.sin(tilt) + rawZ * Math.cos(tilt);
      }
    } else if (type === 'helix') {
      const turns = 4;
      const height = 12;
      const radius = 3;
      const side = i % 2 === 0 ? 1 : -1;
      const p = (i / PARTICLE_COUNT) * Math.PI * 2 * turns;
      x = Math.cos(p) * radius + (Math.random() - 0.5);
      z = Math.sin(p) * radius + (side * 3) + (Math.random() - 0.5);
      y = (i / PARTICLE_COUNT) * height - (height / 2);
    } else if (type === 'galaxy') {
      const coreRatio = 0.15;
      const haloRatio = 0.5;
      if (i < PARTICLE_COUNT * coreRatio) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 3 * Math.pow(Math.random(), 1.5);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (i < PARTICLE_COUNT * (coreRatio + haloRatio)) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 15 + Math.random() * 10;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else {
        const numArms = 5;
        const arm = i % numArms;
        const b = 0.4;
        const particleProgress = (i - PARTICLE_COUNT * (coreRatio + haloRatio)) / (PARTICLE_COUNT * (1 - coreRatio - haloRatio));
        const a = particleProgress * Math.PI * 10;
        const rad = 2 * Math.exp(b * a);
        const armAngle = (arm / numArms) * Math.PI * 2;
        x = Math.cos(a + armAngle) * rad + (Math.random() - 0.5) * 1.0;
        z = Math.sin(a + armAngle) * rad + (Math.random() - 0.5) * 1.0;
        y = (Math.random() - 0.5) * 0.5 * (1 - rad / 30);
      }
    }

    setPos(_targetPositions, i, x, y, z);
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
    color: 0x00ffcc,
    size: 0.15,
    map: texture,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  _disposables.push({ geometry: _geometry, material: _material, texture });
  _particles = new THREE.Points(_geometry, _material);
  return _particles;
}

export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x050505);
  ctx.scene.fog = new THREE.FogExp2(0x050505, 0.03);

  const system = createParticleSystem();
  ctx.scene.add(system);
  _removables.push(system);

  calculateShape('heart');
}

export function update(dt, cmd) {
  if (!_particles || !_targetPositions) return;

  const positions = _particles.geometry.attributes.position.array;
  const time = performance.now() * 0.001;

  if (_autoColor) {
    _colorHue = (_colorHue + 0.001) % 1;
    _material.color.setHSL(_colorHue, 1.0, 0.5);
  }

  if (cmd) {
    if (cmd.energy > 0.1) {
      _explosion += (1 - _explosion) * 0.1;
    } else {
      _explosion += (0 - _explosion) * 0.1;
    }

    if (cmd.dx !== undefined) {
      _scale = Math.max(0.2, Math.min(3.0, 1 + cmd.dx * 2));
    }
  } else {
    _explosion *= 0.9;
  }

  _particles.scale.setScalar(THREE.MathUtils.lerp(_particles.scale.x, _explosion > 0.1 ? _scale : 1.0, 0.1));
  _particles.rotation.y += 0.002 * dt * 60;
  _particles.rotation.z = _currentShape === 'saturn' ? 0.2 : 0;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const px = i * 3;
    const py = i * 3 + 1;
    const pz = i * 3 + 2;

    let tx = _targetPositions[px];
    let ty = _targetPositions[py];
    let tz = _targetPositions[pz];

    if (_explosion > 0.1) {
      const explForce = _explosion * 5;
      tx += (Math.random() - 0.5) * explForce * 10;
      ty += (Math.random() - 0.5) * explForce * 10;
      tz += (Math.random() - 0.5) * explForce * 10;
    }

    positions[px] = THREE.MathUtils.lerp(positions[px], tx, LERP_SPEED);
    positions[py] = THREE.MathUtils.lerp(positions[py], ty, LERP_SPEED);
    positions[pz] = THREE.MathUtils.lerp(positions[pz], tz, LERP_SPEED);

    positions[px] += Math.sin(time + positions[py]) * 0.01;
    positions[py] += Math.cos(time + positions[px]) * 0.01;
  }

  _particles.geometry.attributes.position.needsUpdate = true;
}

export function dispose() {
  _removables.forEach(obj => {
    if (obj.parent) obj.parent.remove(obj);
  });
  _disposables.forEach(d => {
    if (d.geometry) d.geometry.dispose();
    if (d.material) d.material.dispose();
    if (d.texture) d.texture.dispose();
  });
  if (_ctx) {
    _ctx.scene.background = null;
    _ctx.scene.fog = null;
  }
  _removables = [];
  _disposables = [];
  _particles = null;
  _geometry = null;
  _material = null;
  _targetPositions = null;
  _ctx = null;
}
