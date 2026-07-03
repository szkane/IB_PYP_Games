import * as THREE from 'three';

export const name = 'milky-way';

let _ctx = null;
let _system = null;
let _starField = null;
let _removables = [];
let _disposables = [];

const COLORS = {
  gold: [1.0, 0.75, 0.3],
  blue: [0.1, 0.5, 1.0],
  purple: [0.5, 0.2, 0.9],
  pink: [1.0, 0.0, 0.5],
  dust: [0.05, 0.02, 0.05]
};

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

function generateMilkyWay() {
  const count = 250000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const barL = 14;

  for (let i = 0; i < count; i++) {
    let x, y, z;
    let cr = 1, cg = 1, cb = 1;
    let s = Math.random();

    if (s > 0.99) s = 3.0;
    else if (s > 0.9) s = 1.2;
    else s = 0.6;

    if (i < count * 0.2) {
      const lx = (Math.random() - 0.5) * barL * 2;
      const lz = (Math.random() - 0.5) * 4 * (1 - Math.abs(lx) / barL);
      const rot = 0.8;
      x = lx * Math.cos(rot) - lz * Math.sin(rot);
      z = lx * Math.sin(rot) + lz * Math.cos(rot);
      y = (Math.random() - 0.5) * 3 * Math.exp(-Math.abs(lx) / 8);
      cr = COLORS.gold[0]; cg = COLORS.gold[1]; cb = COLORS.gold[2];
      s *= 1.2;
    } else {
      const dist = Math.random() * (55 - barL);
      const r = barL + dist;
      const armID = Math.floor(Math.random() * 5);
      let angleOffset = 0;
      let baseColor = COLORS.blue;

      if (armID === 0) { angleOffset = 0.7; baseColor = COLORS.blue; }
      else if (armID === 1) { angleOffset = 0.7 + Math.PI; baseColor = COLORS.blue; }
      else if (armID === 2) { angleOffset = 0.7 + Math.PI * 0.4; baseColor = COLORS.purple; }
      else if (armID === 3) { angleOffset = 0.7 + Math.PI * 1.4; baseColor = COLORS.purple; }
      else { angleOffset = 0.7 + Math.PI * 1.8; baseColor = COLORS.blue; }

      const spin = (dist / 55) * 3.5;
      const spread = (Math.random() - 0.5) * (0.5 + dist / 18);
      const angle = angleOffset + spin + spread;

      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      y = (Math.random() - 0.5) * (r * 0.04);

      if (Math.abs(spread) < 0.2) {
        cr = baseColor[0]; cg = baseColor[1]; cb = baseColor[2];
      } else if (Math.abs(spread) > 0.5) {
        cr = COLORS.dust[0]; cg = COLORS.dust[1]; cb = COLORS.dust[2];
      } else {
        if (Math.random() > 0.98) {
          cr = COLORS.pink[0]; cg = COLORS.pink[1]; cb = COLORS.pink[2];
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
  return new THREE.Points(geometry, material);
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

  _system = generateMilkyWay();
  ctx.scene.add(_system);
  _removables.push(_system);
}

export function update(dt, cmd) {
  if (!_system) return;

  const rotSpeed = 0.0005 + (cmd && cmd.energy ? cmd.energy * 0.005 : 0);
  _system.rotation.y -= rotSpeed * dt * 60;

  if (cmd && cmd.energy > 0.1) {
    _system.position.x = (Math.random() - 0.5) * 0.05;
    _system.position.y = (Math.random() - 0.5) * 0.05;
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
