import * as THREE from 'three';
import { createGestureState, applyGestureControl } from '../core/gesture-control.js';

export const name = 'milky-way';

const GALAXIES = {
  'milkyway': {
    name: "Milky Way (Real)",
    count: 250000, radius: 55, spin: 3.5, bar: 14, arms: 5,
    colors: { core: [1.0, 0.75, 0.3], arm1: [0.1, 0.5, 1.0], arm2: [0.5, 0.2, 0.9], pink: [1.0, 0.0, 0.5], dust: [0.05, 0.02, 0.05] }
  },
  'andromeda': {
    name: "Andromeda",
    count: 250000, radius: 65, spin: 5.0, bar: 0, arms: 4,
    colors: { core: [1.0, 1.0, 0.9], arm1: [0.2, 0.6, 1.0], arm2: [0.4, 0.3, 0.8], pink: [1.0, 0.2, 0.6], dust: [0.05, 0.05, 0.08] }
  },
  'whirlpool': {
    name: "Whirlpool (M51)",
    count: 250000, radius: 50, spin: 5.5, bar: 0, arms: 2,
    colors: { core: [1.0, 1.0, 1.0], arm1: [1.0, 0.2, 0.5], arm2: [0.3, 0.1, 0.7], pink: [1.0, 0.1, 0.4], dust: [0.02, 0.01, 0.04] }
  },
  'sombrero': {
    name: "Sombrero (M104)",
    count: 250000, radius: 50, spin: 8.0, bar: 0, arms: 0,
    colors: { core: [1.0, 0.85, 0.4], arm1: [0.8, 0.4, 0.2], arm2: [0.7, 0.3, 0.1], pink: [0.9, 0.5, 0.3], dust: [0.0, 0.0, 0.0] }
  }
};

let _ctx = null;
let _system = null;
let _starField = null;
let _removables = [];
let _disposables = [];
let _starFieldDisposables = [];
let _uiEl = null;
let _hudEl = null;
let _gs = null;

function createTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 32;
  cvs.height = 32;
  const ctx = cvs.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(cvs);
}

function generateMilkyWay(cfg) {
  if (_system) {
    _ctx.scene.remove(_system);
    _system = null;
    disposeTracked();
    _disposables = [];
  }

  const count = cfg.count;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const barL = cfg.bar;
  const colorsCfg = cfg.colors;

  for (let i = 0; i < count; i++) {
    let x, y, z;
    let cr = 1, cg = 1, cb = 1;
    let s = Math.random();

    if (s > 0.99) s = 3.0;
    else if (s > 0.9) s = 1.2;
    else s = 0.6;

    if (barL > 0 && i < count * 0.2) {
      const lx = (Math.random() - 0.5) * barL * 2;
      const lz = (Math.random() - 0.5) * 4 * (1 - Math.abs(lx) / barL);
      const rot = 0.8;
      x = lx * Math.cos(rot) - lz * Math.sin(rot);
      z = lx * Math.sin(rot) + lz * Math.cos(rot);
      y = (Math.random() - 0.5) * 3 * Math.exp(-Math.abs(lx) / 8);
      cr = colorsCfg.core[0]; cg = colorsCfg.core[1]; cb = colorsCfg.core[2];
      s *= 1.2;
    } else {
      const dist = Math.random() * (cfg.radius - barL);
      const r = barL + dist;
      
      let armID = 0;
      if (cfg.arms > 0) {
        armID = Math.floor(Math.random() * cfg.arms);
      }
      
      let angleOffset = 0.7;
      let baseColor = colorsCfg.arm1;

      if (cfg.arms > 0) {
        angleOffset = 0.7 + (armID / cfg.arms) * Math.PI * 2;
        baseColor = armID % 2 === 0 ? colorsCfg.arm1 : colorsCfg.arm2;
      }

      const spin = (dist / cfg.radius) * cfg.spin;
      const spread = (Math.random() - 0.5) * (0.5 + dist / 18);
      const angle = angleOffset + spin + spread;

      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      y = (Math.random() - 0.5) * (r * 0.04);

      if (Math.abs(spread) < 0.2) {
        cr = baseColor[0]; cg = baseColor[1]; cb = baseColor[2];
      } else if (Math.abs(spread) > 0.5) {
        cr = colorsCfg.dust[0]; cg = colorsCfg.dust[1]; cb = colorsCfg.dust[2];
      } else {
        if (Math.random() > 0.98) {
          cr = colorsCfg.pink[0]; cg = colorsCfg.pink[1]; cb = colorsCfg.pink[2];
          s *= 2.0;
        } else {
          cr = baseColor[0] * 0.7; cg = baseColor[1] * 0.6; cb = baseColor[2] * 0.8;
        }
      }
    }

    const noise = (Math.random() - 0.5) * 0.05;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = Math.max(0, cr + noise);
    colors[i * 3 + 1] = Math.max(0, cg + noise);
    colors[i * 3 + 2] = Math.max(0, cb + noise);
    sizes[i] = s;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleTex = createTexture();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tex: { value: particleTex },
      scale: { value: window.innerHeight * 0.5 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float scale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * (scale / -mv.z), 1.0, 5.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D tex;
      varying vec3 vColor;
      void main() {
        vec4 t = texture2D(tex, gl_PointCoord);
        if (t.a < 0.1) discard;
        gl_FragColor = vec4(vColor, 0.6 * t.a);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  _disposables.push({ geometry, material, texture: particleTex });
  
  const mesh = new THREE.Points(geometry, material);
  mesh.rotation.x = 0.4;
  _ctx.scene.add(mesh);
  _system = mesh;
}

function disposeTracked() {
  _disposables.forEach(d => {
    if (d.geometry) d.geometry.dispose();
    if (d.material) d.material.dispose();
    if (d.texture) d.texture.dispose();
  });
}

function createStarField() {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 1500;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x555555, size: 1.5, sizeAttenuation: false });
  _starFieldDisposables.push({ geometry: geom, material });
  return new THREE.Points(geom, material);
}

export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x000000);
  ctx.scene.fog = new THREE.FogExp2(0x000000, 0.002);

  _starField = createStarField();
  ctx.scene.add(_starField);
  _removables.push(_starField);

  _gs = createGestureState();
  generateMilkyWay(GALAXIES['milkyway']);
  createUI();
}

export function update(dt, cmd) {
  if (!_system) return;

  // Shared gesture control: scale + rotation from hand
  applyGestureControl(_system, cmd, _gs, dt);

  // Auto self-rotation
  _system.rotation.y -= 0.0005 * dt * 60;
  _system.position.set(0, 0, 0);
}

function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  // HUD
  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1 id="milkyway-galaxy-name">Milky Way (Real)</h1>
    <div class="subtitle">Unit 5: Patterns and Cycles</div>
  `;
  container.appendChild(_hudEl);

  // Sidebar Controls
  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';

  Object.keys(GALAXIES).forEach(key => {
    const galaxy = GALAXIES[key];
    const btn = document.createElement('button');
    btn.className = 'scene-btn' + (key === 'milkyway' ? ' active' : '');
    btn.textContent = key;
    btn.addEventListener('click', () => {
      generateMilkyWay(galaxy);
      
      const title = document.getElementById('milkyway-galaxy-name');
      if (title) title.textContent = galaxy.name;

      const buttons = _uiEl.querySelectorAll('.scene-btn');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    _uiEl.appendChild(btn);
  });

  container.appendChild(_uiEl);
}

export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl = null;

  if (_system && _ctx) {
    _ctx.scene.remove(_system);
  }

  _removables.forEach(obj => {
    if (obj.parent) obj.parent.remove(obj);
  });
  disposeTracked();
  
  _starFieldDisposables.forEach(d => {
    if (d.geometry) d.geometry.dispose();
    if (d.material) d.material.dispose();
  });
  _starFieldDisposables = [];

  if (_ctx) {
    _ctx.scene.background = null;
    _ctx.scene.fog = null;
  }
  _removables = [];
  _disposables = [];
  _system = null;
  _starField = null;
  _ctx = null;
}
