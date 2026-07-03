/**
 * Neon Planets Scene
 * Ported from g1_3D_camara_solar.html
 * Particle-based glowing planet explorer
 */
import * as THREE from 'three';

export const name = 'neon-planets';

const PLANET_CONFIG = {
  'Sun': { size: 3.5, speed: 0.005, colors: [0xff4d00, 0xffaa00, 0xffcc00], particles: 25000, type: 'star' },
  'Mercury': { size: 2.8, speed: 0.01, colors: [0xaaffff, 0x888888, 0xffffff], particles: 12000, type: 'rock' },
  'Venus': { size: 3.0, speed: 0.008, colors: [0xff8800, 0xffaa44, 0xcc6600], particles: 15000, type: 'gas' },
  'Earth': { size: 3.2, speed: 0.01, colors: [0x00f3ff, 0x0044ff, 0xffffff], particles: 20000, type: 'life' },
  'Mars': { size: 2.9, speed: 0.01, colors: [0xff0044, 0xff5500, 0x880000], particles: 14000, type: 'rock' },
  'Jupiter': { size: 4.5, speed: 0.02, colors: [0xffaa00, 0xcc8800, 0xffebd7], particles: 30000, type: 'gas' },
  'Saturn': { size: 4.0, speed: 0.015, colors: [0xe0c080, 0xffd700, 0x8a6c3c], particles: 25000, type: 'ring' },
  'Uranus': { size: 3.5, speed: 0.01, colors: [0x00ffaa, 0x00cccc, 0xccffff], particles: 18000, type: 'gas' },
  'Neptune': { size: 3.5, speed: 0.01, colors: [0x3333ff, 0x0000ff, 0x8888ff], particles: 18000, type: 'gas' }
};

let _ctx = null;
let _currentSystem = null;
let _bgStars = null;
let _glowTexture = null;
let _ambientLight = null;
let _time = 0;
let _uiEl = null;
let _hudEl = null;

let _disposables = [];
let _staticDisposables = [];

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  _staticDisposables.push(tex);
  return tex;
}

function createBackgroundStars() {
  const geom = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 4000; i++) {
    pos.push(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 80 - 20
    );
  }
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x444455, size: 0.2, transparent: true, opacity: 0.6
  });
  const stars = new THREE.Points(geom, mat);
  _staticDisposables.push(geom, mat);
  return stars;
}

function disposeTracked() {
  _disposables.forEach(obj => {
    if (obj.isMaterial || obj.isTexture) obj.dispose();
    else if (obj.isBufferGeometry || obj.isGeometry) obj.dispose();
    else if (obj.isLight && obj.parent) obj.parent.remove(obj);
  });
}

function loadPlanet(name) {
  if (_currentSystem) {
    _ctx.scene.remove(_currentSystem);
    _currentSystem = null;
    disposeTracked();
    _disposables = [];
  }

  const config = PLANET_CONFIG[name];
  const group = new THREE.Group();
  const colorObj = new THREE.Color();

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];

  for (let i = 0; i < config.particles; i++) {
    const phi = Math.acos(-1 + (2 * i) / config.particles);
    const theta = Math.sqrt(config.particles * Math.PI) * phi;

    let r = config.size;
    if (config.type === 'gas') {
      r += Math.sin(phi * 10) * 0.1 + (Math.random() - 0.5) * 0.2;
    } else if (config.type === 'star') {
      r += (Math.random() - 0.5) * 0.4;
    } else {
      r += (Math.random() - 0.5) * 0.15;
    }

    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(phi);

    positions.push(x, y, z);

    const cHex = config.colors[Math.floor(Math.random() * config.colors.length)];
    colorObj.setHex(cHex);
    colors.push(colorObj.r, colorObj.g, colorObj.b);

    sizes.push(Math.random() * 0.2 + 0.05);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    map: _glowTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  });

  const planetMesh = new THREE.Points(geometry, material);
  group.add(planetMesh);
  _disposables.push(geometry, material);

  if (config.type === 'ring') {
    const ringGeom = new THREE.BufferGeometry();
    const ringPos = [];
    const ringCol = [];
    for (let i = 0; i < 15000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = config.size * 1.4 + Math.random() * config.size * 1.5;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = (Math.random() - 0.5) * 0.2;
      ringPos.push(rx, ry, rz);

      const c = i % 2 === 0 ? 0xccaaff : 0x442255;
      colorObj.setHex(c);
      ringCol.push(colorObj.r, colorObj.g, colorObj.b);
    }
    ringGeom.setAttribute('position', new THREE.Float32BufferAttribute(ringPos, 3));
    ringGeom.setAttribute('color', new THREE.Float32BufferAttribute(ringCol, 3));
    const ringMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      map: _glowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });
    const ringMesh = new THREE.Points(ringGeom, ringMat);
    ringMesh.rotation.z = 0.4;
    ringMesh.rotation.x = 0.2;
    group.add(ringMesh);
    _disposables.push(ringGeom, ringMat);
  }

  if (config.type !== 'ring') {
    const glowGeom = new THREE.BufferGeometry();
    const glowPos = [];
    for (let i = 0; i < 500; i++) {
      const gr = config.size * 1.2 + Math.random();
      const gtheta = Math.random() * Math.PI * 2;
      const gphi = Math.acos(2 * Math.random() - 1);
      glowPos.push(
        gr * Math.sin(gphi) * Math.cos(gtheta),
        gr * Math.sin(gphi) * Math.sin(gtheta),
        gr * Math.cos(gphi)
      );
    }
    glowGeom.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
    const glowMat = new THREE.PointsMaterial({
      color: config.colors[0],
      size: 0.4,
      map: _glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.4
    });
    group.add(new THREE.Points(glowGeom, glowMat));
    _disposables.push(glowGeom, glowMat);
  }

  group.scale.set(0, 0, 0);
  group.userData = config;
  _ctx.scene.add(group);
  _currentSystem = group;
}

function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  // HUD
  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1 id="neon-planet-name">SUN</h1>
    <div class="subtitle">Unit 5: Patterns and Cycles</div>
  `;
  container.appendChild(_hudEl);

  // Sidebar Controls
  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';

  Object.keys(PLANET_CONFIG).forEach(planetName => {
    const btn = document.createElement('button');
    btn.className = 'scene-btn' + (planetName === 'Sun' ? ' active' : '');
    btn.textContent = planetName.substring(0, 3);
    btn.addEventListener('click', () => {
      loadPlanet(planetName);
      const title = document.getElementById('neon-planet-name');
      if (title) title.textContent = planetName.toUpperCase();
      
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

  ctx.scene.background = new THREE.Color(0x020205);
  ctx.scene.fog = new THREE.FogExp2(0x020205, 0.02);

  _glowTexture = createGlowTexture();

  _ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  ctx.scene.add(_ambientLight);
  _staticDisposables.push(_ambientLight);

  _bgStars = createBackgroundStars();
  ctx.scene.add(_bgStars);

  loadPlanet('Sun');
  createUI();
}

export function update(dt, cmd) {
  if (!_ctx) return;
  _time += 0.01;

  if (_currentSystem) {
    const config = _currentSystem.userData;
    const speed = config.speed || 0.002;

    let energy = 0;
    if (cmd) {
      const dx = cmd.dx || 0;
      const dy = cmd.dy || 0;
      energy = Math.min(1, Math.abs(dx) + Math.abs(dy));
    }

    const rotationBoost = 1.0 + energy * 5.0;
    _currentSystem.rotation.y += speed * rotationBoost;

    if (_currentSystem.scale.x < 1.0) {
      _currentSystem.scale.setScalar(Math.min(1.0, _currentSystem.scale.x + 0.05));
    }
    // Planet position is always (0,0,0) — no per-frame jitter
    _currentSystem.position.set(0, 0, 0);
  }
}

export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl = null;

  if (_currentSystem) {
    _ctx.scene.remove(_currentSystem);
    _currentSystem = null;
  }
  if (_bgStars) {
    _ctx.scene.remove(_bgStars);
    _bgStars = null;
  }
  if (_ambientLight) {
    _ctx.scene.remove(_ambientLight);
    _ambientLight = null;
  }

  _disposables.forEach(obj => {
    if (obj.isMaterial || obj.isTexture) {
      obj.dispose();
    } else if (obj.isGeometry || obj.isBufferGeometry) {
      obj.dispose();
    } else if (obj.isLight) {
      if (obj.parent) obj.parent.remove(obj);
    }
  });

  _staticDisposables.forEach(obj => {
    if (obj.isMaterial || obj.isTexture) {
      obj.dispose();
    } else if (obj.isGeometry || obj.isBufferGeometry) {
      obj.dispose();
    } else if (obj.isLight) {
      if (obj.parent) obj.parent.remove(obj);
    }
  });

  _ctx.scene.background = null;
  _ctx.scene.fog = null;
  _disposables = [];
  _staticDisposables = [];
  _glowTexture = null;
  _ctx = null;
}
