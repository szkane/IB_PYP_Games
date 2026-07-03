import * as THREE from 'three';

export const name = 'crystal-galaxy';

let _ctx = null;
let _system = null;
let _starField = null;
let _removables = [];
let _disposables = [];

function createSharpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function generateGalaxy() {
  const cfg = {
    count: 200000,
    colors: { core: [0.5, 0.35, 0.15], arm: [0.2, 0.4, 0.9], dust: [0.1, 0.05, 0.2] },
    params: { r: 50, spin: 3, arms: 2, bar: 12 }
  };

  const count = cfg.count;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colCore = cfg.colors.core;
  const colArm = cfg.colors.arm;
  const colDust = cfg.colors.dust;
  const barL = cfg.params.bar;

  for (let i = 0; i < count; i++) {
    let x, y, z, r, angle;
    let cr = 0, cg = 0, cb = 0;
    let size = Math.random();

    if (size > 0.98) size = 2.5;
    else if (size > 0.9) size = 1.2;
    else size = 0.5;

    if (i < count * 0.2) {
      const lx = (Math.random() - 0.5) * barL * 2;
      const lz = (Math.random() - 0.5) * 2 * (1 - Math.abs(lx) / barL);
      const rot = 0.8;
      x = lx * Math.cos(rot) - lz * Math.sin(rot);
      z = lx * Math.sin(rot) + lz * Math.cos(rot);
      y = (Math.random() - 0.5) * 1.5 * Math.exp(-Math.abs(lx) / 8);
      cr = colCore[0]; cg = colCore[1]; cb = colCore[2];
      size *= 1.2;
    } else {
      const dist = Math.random() * (cfg.params.r - barL);
      r = barL + dist;
      const spin = (dist / cfg.params.r) * cfg.params.spin;
      const arm = (Math.random() < 0.5 ? 0 : Math.PI);
      const spread = (Math.random() - 0.5) * (0.5 + dist / 20);
      angle = arm + spin + spread + 0.8;
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      y = (Math.random() - 0.5) * (r * 0.04);

      if (Math.abs(spread) > 0.35) {
        cr = colDust[0]; cg = colDust[1]; cb = colDust[2];
      } else {
        cr = colArm[0]; cg = colArm[1]; cb = colArm[2];
      }
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const noise = (Math.random() - 0.5) * 0.1;
    colors[i * 3] = Math.max(0, Math.min(1, cr + noise));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, cg + noise));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, cb + noise));
    sizes[i] = size;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const dotTexture = createSharpTexture();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tex: { value: dotTexture },
      scale: { value: window.innerHeight * 0.5 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float scale;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float pointSize = size * (scale / -mvPosition.z);
        gl_PointSize = clamp(pointSize, 1.0, 6.0);
        gl_Position = projectionMatrix * mvPosition;
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

  _disposables.push({ geometry: geom, material, texture: dotTexture });
  return new THREE.Points(geom, material);
}

function createStarField() {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 1200;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x555555, size: 1.5, sizeAttenuation: false });
  _disposables.push({ geometry: geom, material });
  return new THREE.Points(geom, material);
}

export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x000000);
  ctx.scene.fog = new THREE.FogExp2(0x000000, 0.002);

  _starField = createStarField();
  ctx.scene.add(_starField);
  _removables.push(_starField);

  _system = generateGalaxy();
  ctx.scene.add(_system);
  _removables.push(_system);
}

export function update(dt, cmd) {
  if (!_system) return;

  _system.rotation.y -= 0.0005 * dt * 60;

  if (cmd && cmd.energy > 0.05) {
    _system.position.x = (Math.random() - 0.5) * 0.05;
    _system.position.y = (Math.random() - 0.5) * 0.05;
    _system.rotation.y -= cmd.energy * 0.005 * dt * 60;
  } else {
    _system.position.set(0, 0, 0);
  }
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
  _system = null;
  _starField = null;
  _ctx = null;
}
