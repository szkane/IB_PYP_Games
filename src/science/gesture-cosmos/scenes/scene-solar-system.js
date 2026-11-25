/**
 * Solar System Scene
 * Offline procedural CanvasTextures, smooth orbit-following focus,
 * click/tap raycasting, and PYP Unit 5 Cosmic Field Card facts.
 */
import * as THREE from 'three';
import { createGestureState, applyGestureControl } from '../core/gesture-control.js';

export const name = 'solar-system';

let _ctx = null;
let _celestialBodies = [];
let _pickTargets = [];
let _solarRoot = null;
let _removables = [];
let _disposables = [];
let _textures = [];
let _uiEl = null;
let _hudEl = null;
let _gs = null;

// Continuous orbit-tracking state
let _focusedBody = null;
let _lastFocusPos = new THREE.Vector3();
let _tempVec = new THREE.Vector3();
let _deltaVec = new THREE.Vector3();
let _unsubDrag = null;
let _pointerDownPos = null;
let _onPointerDown = null;
let _onPointerUp = null;

const AU = 50;
const SIZES = {
  sun: 6.5, mercury: 0.7, venus: 1.1, earth: 1.3, mars: 0.95,
  jupiter: 4.0, saturn: 3.4, uranus: 2.2, neptune: 2.1,
  moon: 0.28, phobos: 0.14, deimos: 0.11,
  io: 0.34, europa: 0.28, ganymede: 0.44, callisto: 0.4,
  titan: 0.44, rhea: 0.24,
  titania: 0.24, oberon: 0.21,
  triton: 0.28
};
const ORBITS = {
  mercury: 0.39 * AU, venus: 0.72 * AU, earth: 1.08 * AU, mars: 1.56 * AU,
  jupiter: 2.85 * AU, saturn: 4.4 * AU, uranus: 6.1 * AU, neptune: 7.8 * AU,
  moon: SIZES.earth + 1.8, phobos: SIZES.mars + 0.9, deimos: SIZES.mars + 1.4,
  io: SIZES.jupiter + 2.2, europa: SIZES.jupiter + 2.9, ganymede: SIZES.jupiter + 3.6, callisto: SIZES.jupiter + 4.3,
  titan: SIZES.saturn + 3.6, rhea: SIZES.saturn + 4.4,
  titania: SIZES.uranus + 1.8, oberon: SIZES.uranus + 2.4,
  triton: SIZES.neptune + 2.1
};
const SPEEDS = {
  mercury: 0.016, venus: 0.012, earth: 0.0085, mars: 0.0065,
  jupiter: 0.0032, saturn: 0.0022, uranus: 0.0015, neptune: 0.001,
  moon: 0.09, phobos: 0.16, deimos: 0.12,
  io: 0.09, europa: 0.07, ganymede: 0.055, callisto: 0.045,
  titan: 0.06, rhea: 0.05,
  titania: 0.045, oberon: 0.038,
  triton: 0.055
};
const COLORS = {
  sun: 0xffcc33,
  mercury: 0xb7b3ad,
  venus: 0xeec97a,
  earth: 0x33aaff,
  mars: 0xd95f33,
  jupiter: 0xdca56a,
  saturn: 0xe6cb88,
  uranus: 0x8be2ef,
  neptune: 0x3b6ee8,
  moon: 0xcfcfcf,
  phobos: 0x9b9288,
  deimos: 0xaca398,
  io: 0xf4df7c,
  europa: 0xd9e4f5,
  ganymede: 0xb6aea4,
  callisto: 0x867e76,
  titan: 0xe8ba68,
  rhea: 0xd0d4da,
  titania: 0xc5cad2,
  oberon: 0xadb1ba,
  triton: 0xcbd9ee,
  orbit: 0x6ea8cc,
  ring: 0xd2ba89
};

const PLANET_FACTS = {
  Overview: {
    title: 'Solar System Overview',
    badge: 'UNIT 5 · PATTERNS & CYCLES',
    fact: 'Eight planets orbit our Sun in repeating elliptical cycles. Inner planets are rocky, while outer giants are made of gas and ice.',
    inquiry: 'Tap any planet in 3D space or on the right panel to ride along its orbit!'
  },
  Sun: {
    title: 'The Sun',
    badge: 'YELLOW DWARF STAR',
    fact: 'The Sun holds 99.8% of all mass in our Solar System! Its gravity keeps every planet in orbit and its light drives Earth’s day, night, and seasons.',
    inquiry: 'How would Earth’s living cycles change if we were farther from the Sun?'
  },
  Mercury: {
    title: 'Mercury',
    badge: '1ST PLANET · ROCKY',
    fact: 'Mercury is the smallest and fastest planet. It races around the Sun in just 88 Earth days and is covered in impact craters like our Moon.',
    inquiry: 'Why does Mercury have extreme hot days and freezing nights?'
  },
  Venus: {
    title: 'Venus',
    badge: '2ND PLANET · ROCKY',
    fact: 'Thick golden clouds trap heat on Venus, making it the hottest planet in our Solar System. It even spins backward compared to Earth!',
    inquiry: 'What makes Venus shine so brightly in Earth’s morning and evening sky?'
  },
  Earth: {
    title: 'Earth',
    badge: '3RD PLANET · LIVING WORLD',
    fact: 'Earth is our home in the habitable zone, with liquid blue oceans, green continents, breathable air, and one Moon that creates ocean tides.',
    inquiry: 'Notice how the Moon orbits Earth while Earth orbits the Sun!'
  },
  Mars: {
    title: 'Mars',
    badge: '4TH PLANET · THE RED PLANET',
    fact: 'Iron-rich rusty dust gives Mars its orange-red color. It is home to Olympus Mons, the tallest volcano in the Solar System, and two tiny moons.',
    inquiry: 'What clues do rovers look for to learn if Mars once had flowing water?'
  },
  Jupiter: {
    title: 'Jupiter',
    badge: '5TH PLANET · GAS GIANT',
    fact: 'Jupiter is the largest planet — more than 1,300 Earths could fit inside! Its swirling cloud bands include the Great Red Spot, a giant storm.',
    inquiry: 'Count Jupiter’s four bright Galilean moons orbiting around it!'
  },
  Saturn: {
    title: 'Saturn',
    badge: '6TH PLANET · RINGED GIANT',
    fact: 'Saturn’s dazzling rings are made of billions of icy chunks and rocky dust orbiting in flat bands. Saturn is so light it could float on water!',
    inquiry: 'What shapes and gaps can you spot in Saturn’s icy ring system?'
  },
  Uranus: {
    title: 'Uranus',
    badge: '7TH PLANET · ICE GIANT',
    fact: 'Uranus is a pale cyan ice giant tilted sideways like a rolling ball! Its methane-rich atmosphere gives it a cool blue-green glow.',
    inquiry: 'How would seasons feel on a planet that rolls sideways around the Sun?'
  },
  Neptune: {
    title: 'Neptune',
    badge: '8TH PLANET · ICE GIANT',
    fact: 'Neptune is a deep blue windy world at the edge of the planetary system. One year on Neptune takes 165 Earth years!',
    inquiry: 'Why does Neptune take so much longer than Mercury to complete one orbit?'
  },
  Moon: {
    title: 'Earth’s Moon',
    badge: 'NATURAL SATELLITE',
    fact: 'The Moon orbits Earth every 27.3 days, creating the monthly pattern of moon phases and helping pull Earth’s ocean tides.',
    inquiry: 'Watch how the Moon circles Earth while Earth travels around the Sun.'
  }
};

// Deterministic pseudo-random generator for consistent crisp procedural textures
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createProceduralTexture(planetName) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const rand = mulberry32(planetName.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 17));

  if (planetName === 'Sun') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff3a0');
    grad.addColorStop(0.5, '#ff9d1c');
    grad.addColorStop(1, '#fff3a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 6 + rand() * 24;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const hot = rand() > 0.45;
      g.addColorStop(0, hot ? 'rgba(255,252,210,0.65)' : 'rgba(255,95,0,0.45)');
      g.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planetName === 'Earth') {
    const ocean = ctx.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, '#1e66b8');
    ocean.addColorStop(0.5, '#1254a1');
    ocean.addColorStop(1, '#1a5ea8');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);

    // Continents
    const blobs = [
      { x: 110, y: 110, rx: 56, ry: 34, c: '#38a169' },
      { x: 155, y: 165, rx: 32, ry: 38, c: '#2f855a' },
      { x: 270, y: 92, rx: 72, ry: 32, c: '#48bb78' },
      { x: 290, y: 148, rx: 40, ry: 36, c: '#c9a959' },
      { x: 390, y: 105, rx: 64, ry: 36, c: '#38a169' },
      { x: 420, y: 178, rx: 32, ry: 20, c: '#d69e2e' }
    ];
    blobs.forEach(b => {
      ctx.fillStyle = b.c;
      for (let k = 0; k < 10; k++) {
        ctx.beginPath();
        ctx.ellipse(
          b.x + (rand() - 0.5) * b.rx * 0.9,
          b.y + (rand() - 0.5) * b.ry * 0.9,
          b.rx * (0.35 + rand() * 0.45),
          b.ry * (0.35 + rand() * 0.45),
          rand() * Math.PI,
          0, Math.PI * 2
        );
        ctx.fill();
      }
    });

    // Polar ice caps
    ctx.fillStyle = 'rgba(240, 249, 255, 0.92)';
    ctx.fillRect(0, 0, w, 18);
    ctx.fillRect(0, h - 18, w, 18);

    // Wispy white clouds
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    for (let i = 0; i < 65; i++) {
      ctx.beginPath();
      ctx.ellipse(rand() * w, 24 + rand() * (h - 48), 16 + rand() * 44, 4 + rand() * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planetName === 'Mars') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#c85a32');
    grad.addColorStop(0.5, '#d96b38');
    grad.addColorStop(1, '#b54925');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dark volcanic basalt regions & dust swirls
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(110,36,16,0.28)' : 'rgba(244,148,88,0.24)';
      ctx.beginPath();
      ctx.ellipse(rand() * w, 20 + rand() * (h - 40), 12 + rand() * 42, 6 + rand() * 18, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Craters
    for (let i = 0; i < 45; i++) {
      const x = rand() * w;
      const y = 20 + rand() * (h - 40);
      const r = 2 + rand() * 9;
      ctx.fillStyle = 'rgba(85,25,10,0.32)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Polar caps
    ctx.fillStyle = 'rgba(255,244,236,0.85)';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 10, w, 10);
  } else if (planetName === 'Jupiter') {
    const bands = [
      '#c89d72', '#f0dec2', '#b96d40', '#edd4b2', '#9d5932',
      '#f4e4c9', '#cb7c4c', '#e6c99e', '#a95f36', '#d8b68c'
    ];
    const bandH = h / bands.length;
    bands.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, idx * bandH, w, bandH + 2);
    });
    // Wavy atmospheric turbulence
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,244,225,0.22)' : 'rgba(135,62,24,0.22)';
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 18 + rand() * 54, 2 + rand() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Great Red Spot
    ctx.save();
    ctx.translate(w * 0.64, h * 0.63);
    ctx.fillStyle = '#c84b2c';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 20, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f4ccb0';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#e06944';
    ctx.beginPath();
    ctx.ellipse(2, 0, 18, 10, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (planetName === 'Saturn') {
    const bands = [
      '#cbb37d', '#efe2b6', '#d8c08a', '#f6ecc8', '#cdb174',
      '#ead8a3', '#bfa268', '#e6d39c', '#c3a86e'
    ];
    const bandH = h / bands.length;
    bands.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, idx * bandH, w, bandH + 2);
    });
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = 'rgba(255,250,232,0.18)';
      ctx.fillRect(0, rand() * h, w, 2 + rand() * 5);
    }
  } else if (planetName === 'Venus') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#d8a956');
    grad.addColorStop(0.5, '#f2d388');
    grad.addColorStop(1, '#c69242');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 85; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,245,205,0.28)' : 'rgba(176,118,34,0.22)';
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 26 + rand() * 64, 5 + rand() * 11, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planetName === 'Uranus') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#a6f2f7');
    grad.addColorStop(0.5, '#68d5e3');
    grad.addColorStop(1, '#98ebf2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = 'rgba(225,255,255,0.16)';
      ctx.fillRect(0, rand() * h, w, 3 + rand() * 8);
    }
  } else if (planetName === 'Neptune') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1d3ea8');
    grad.addColorStop(0.5, '#2b61e0');
    grad.addColorStop(1, '#1a3591');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 55; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(130,196,255,0.22)' : 'rgba(12,26,92,0.28)';
      ctx.fillRect(0, rand() * h, w, 3 + rand() * 8);
    }
    // Great Dark Spot
    ctx.fillStyle = 'rgba(14, 24, 88, 0.65)';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.58, 28, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 236, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.51, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cratered Mercury / Moon / rocky moons
    const isMoon = planetName === 'Moon';
    ctx.fillStyle = isMoon ? '#c9ccd1' : '#a8a29c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 55; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(72,74,80,0.22)' : 'rgba(240,240,245,0.16)';
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 10 + rand() * 34, 8 + rand() * 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 95; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 2 + rand() * 11;
      ctx.fillStyle = 'rgba(62,64,68,0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(235,235,240,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  _textures.push(texture);
  return texture;
}

function createSaturnRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.0, 'rgba(180,155,110,0.0)');
  grad.addColorStop(0.1, 'rgba(218,194,142,0.75)');
  grad.addColorStop(0.28, 'rgba(244,225,180,0.92)');
  grad.addColorStop(0.48, 'rgba(205,180,130,0.85)');
  grad.addColorStop(0.56, 'rgba(40,35,30,0.12)'); // Cassini Division
  grad.addColorStop(0.62, 'rgba(232,208,162,0.88)');
  grad.addColorStop(0.84, 'rgba(204,182,138,0.62)');
  grad.addColorStop(1.0, 'rgba(180,155,110,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  _textures.push(texture);
  return texture;
}

function createSunGlowSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 248, 200, 0.95)');
  grad.addColorStop(0.28, 'rgba(255, 192, 66, 0.65)');
  grad.addColorStop(0.62, 'rgba(255, 118, 20, 0.22)');
  grad.addColorStop(1, 'rgba(255, 90, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  _textures.push(tex);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  _disposables.push({ material: mat });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(SIZES.sun * 4.4, SIZES.sun * 4.4, 1);
  return sprite;
}

function createOrbitLine(radius, parent, opacity = 0.42) {
  const points = [];
  const divisions = 128;
  for (let i = 0; i <= divisions; i++) {
    const angle = (i / divisions) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: COLORS.orbit, transparent: true, opacity });
  const line = new THREE.Line(geometry, material);
  parent.add(line);
  _removables.push(line);
  _disposables.push({ geometry, material });
}

function createCelestialBody(data, parentGroup = null, orbitCenter = null) {
  const geometry = new THREE.SphereGeometry(data.radius, 36, 36);
  const texture = createProceduralTexture(data.name);
  let material;

  if (data.isLightSource) {
    material = new THREE.MeshBasicMaterial({ map: texture });
  } else {
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.72,
      metalness: 0.08,
      emissive: new THREE.Color(data.color).multiplyScalar(0.14)
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.userData.bodyName = data.name;

  if (data.isLightSource) {
    const glow = createSunGlowSprite();
    mesh.add(glow);
  }

  // Generous invisible touch/click hit sphere for smaller planets so kids can tap them easily
  const hitRadius = Math.max(data.radius * 1.45, orbitCenter ? data.radius * 2.2 : 4.2);
  const hitGeo = new THREE.SphereGeometry(hitRadius, 12, 12);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.userData.bodyName = data.name;
  mesh.add(hitMesh);
  _disposables.push({ geometry: hitGeo, material: hitMat });

  const body = {
    mesh,
    hitMesh,
    data,
    orbitCenter,
    angle: data.initialAngle != null ? data.initialAngle : Math.random() * Math.PI * 2,
    systemGroup: null,
    ring: null,
    moons: []
  };

  if (data.orbitRadius && !orbitCenter) {
    body.systemGroup = parentGroup;
    if (parentGroup) {
      parentGroup.position.x = data.orbitRadius * Math.cos(body.angle);
      parentGroup.position.z = data.orbitRadius * Math.sin(body.angle);
    }
  } else if (data.orbitRadius && orbitCenter) {
    mesh.position.x = data.orbitRadius * Math.cos(body.angle);
    mesh.position.z = data.orbitRadius * Math.sin(body.angle);
    mesh.position.y = 0;
  }

  _disposables.push({ geometry, material });
  _pickTargets.push(hitMesh);

  return body;
}

function createSolarSystem() {
  const root = _solarRoot;

  const sunData = { name: 'Sun', radius: SIZES.sun, color: COLORS.sun, isLightSource: true };
  const sun = createCelestialBody(sunData, null, null);
  root.add(sun.mesh);
  _removables.push(sun.mesh);
  _celestialBodies.push(sun);

  const planetsData = [
    { name: 'Mercury', radius: SIZES.mercury, color: COLORS.mercury, orbitRadius: ORBITS.mercury, speed: SPEEDS.mercury, initialAngle: 0.4, moons: [] },
    { name: 'Venus', radius: SIZES.venus, color: COLORS.venus, orbitRadius: ORBITS.venus, speed: SPEEDS.venus, initialAngle: 1.5, moons: [] },
    {
      name: 'Earth', radius: SIZES.earth, color: COLORS.earth, orbitRadius: ORBITS.earth, speed: SPEEDS.earth, initialAngle: 2.3, moons: [
        { name: 'Moon', radius: SIZES.moon, color: COLORS.moon, orbitRadius: ORBITS.moon, speed: SPEEDS.moon }
      ]
    },
    {
      name: 'Mars', radius: SIZES.mars, color: COLORS.mars, orbitRadius: ORBITS.mars, speed: SPEEDS.mars, initialAngle: 3.4, moons: [
        { name: 'Phobos', radius: SIZES.phobos, color: COLORS.phobos, orbitRadius: ORBITS.phobos, speed: SPEEDS.phobos },
        { name: 'Deimos', radius: SIZES.deimos, color: COLORS.deimos, orbitRadius: ORBITS.deimos, speed: SPEEDS.deimos }
      ]
    },
    {
      name: 'Jupiter', radius: SIZES.jupiter, color: COLORS.jupiter, orbitRadius: ORBITS.jupiter, speed: SPEEDS.jupiter, initialAngle: 4.5, moons: [
        { name: 'Io', radius: SIZES.io, color: COLORS.io, orbitRadius: ORBITS.io, speed: SPEEDS.io },
        { name: 'Europa', radius: SIZES.europa, color: COLORS.europa, orbitRadius: ORBITS.europa, speed: SPEEDS.europa },
        { name: 'Ganymede', radius: SIZES.ganymede, color: COLORS.ganymede, orbitRadius: ORBITS.ganymede, speed: SPEEDS.ganymede },
        { name: 'Callisto', radius: SIZES.callisto, color: COLORS.callisto, orbitRadius: ORBITS.callisto, speed: SPEEDS.callisto }
      ]
    },
    {
      name: 'Saturn', radius: SIZES.saturn, color: COLORS.saturn, orbitRadius: ORBITS.saturn, speed: SPEEDS.saturn, initialAngle: 5.4, hasRing: true, moons: [
        { name: 'Titan', radius: SIZES.titan, color: COLORS.titan, orbitRadius: ORBITS.titan, speed: SPEEDS.titan },
        { name: 'Rhea', radius: SIZES.rhea, color: COLORS.rhea, orbitRadius: ORBITS.rhea, speed: SPEEDS.rhea }
      ]
    },
    {
      name: 'Uranus', radius: SIZES.uranus, color: COLORS.uranus, orbitRadius: ORBITS.uranus, speed: SPEEDS.uranus, initialAngle: 0.9, moons: [
        { name: 'Titania', radius: SIZES.titania, color: COLORS.titania, orbitRadius: ORBITS.titania, speed: SPEEDS.titania },
        { name: 'Oberon', radius: SIZES.oberon, color: COLORS.oberon, orbitRadius: ORBITS.oberon, speed: SPEEDS.oberon }
      ]
    },
    {
      name: 'Neptune', radius: SIZES.neptune, color: COLORS.neptune, orbitRadius: ORBITS.neptune, speed: SPEEDS.neptune, initialAngle: 2.8, moons: [
        { name: 'Triton', radius: SIZES.triton, color: COLORS.triton, orbitRadius: ORBITS.triton, speed: SPEEDS.triton }
      ]
    }
  ];

  planetsData.forEach(planetData => {
    const planetSystem = new THREE.Group();
    root.add(planetSystem);
    _removables.push(planetSystem);

    const planet = createCelestialBody(planetData, planetSystem, null);
    planetSystem.add(planet.mesh);
    _celestialBodies.push(planet);

    createOrbitLine(planetData.orbitRadius, root, 0.36);

    if (planetData.moons && planetData.moons.length > 0) {
      planetData.moons.forEach(moonData => {
        const moon = createCelestialBody(moonData, planetSystem, planet.mesh);
        planetSystem.add(moon.mesh);
        _celestialBodies.push(moon);
        planet.moons.push(moon);
        createOrbitLine(moonData.orbitRadius, planet.mesh, 0.25);
      });
    }

    if (planetData.hasRing) {
      const innerR = planetData.radius * 1.3;
      const outerR = planetData.radius * 2.35;
      const ringGeometry = new THREE.RingGeometry(innerR, outerR, 72);
      const pos = ringGeometry.attributes.position;
      const uv = ringGeometry.attributes.uv;
      const v3 = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        const u = (v3.length() - innerR) / (outerR - innerR);
        uv.setXY(i, Math.max(0, Math.min(1, u)), 0.5);
      }
      const ringTexture = createSaturnRingTexture();
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        roughness: 0.75,
        metalness: 0.05
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2 - 0.32;
      planet.mesh.add(ringMesh);
      planet.ring = ringMesh;
      _removables.push(ringMesh);
      _disposables.push({ geometry: ringGeometry, material: ringMaterial });
    }
  });
}

function selectOverview() {
  _focusedBody = null;
  _ctx.cameraRig.resetToOverview(AU * 5, Math.PI / 3, Math.PI / 4);
  const overviewBtn = document.getElementById('btn-overview');
  setActiveButton(overviewBtn);
  _ctx.setFieldCard?.(PLANET_FACTS.Overview);
  _ctx.playChime?.(523.25);
}

function focusOnBody(body) {
  _focusedBody = body;
  _solarRoot.updateMatrixWorld(true);
  body.mesh.getWorldPosition(_lastFocusPos);
  const offset = Math.max(body.data.radius * 5.2 + 8, 12);
  _ctx.cameraRig.focusOn(_lastFocusPos, offset);

  const btn = document.getElementById(`btn-${body.data.name.toLowerCase()}`);
  if (btn) setActiveButton(btn);

  const cardInfo = PLANET_FACTS[body.data.name] || {
    title: body.data.name,
    badge: 'SOLAR SYSTEM MOON',
    fact: `${body.data.name} orbits smoothly in its parent planet's gravity field.`,
    inquiry: 'Observe how moons move in smaller cycles inside bigger planetary orbits!'
  };
  _ctx.setFieldCard?.(cardInfo);
  _ctx.playChime?.(659.25);
}

function setActiveButton(activeBtn) {
  if (!_uiEl) return;
  const buttons = _uiEl.querySelectorAll('.scene-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}

function setupRaycasting() {
  const dom = _ctx.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  _onPointerDown = (e) => {
    _pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  _onPointerUp = (e) => {
    if (!_pointerDownPos || !_ctx) return;
    const dx = e.clientX - _pointerDownPos.x;
    const dy = e.clientY - _pointerDownPos.y;
    _pointerDownPos = null;
    if (Math.hypot(dx, dy) > 8) return; // Ignore orbit drags

    const rect = dom.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, _ctx.camera);
    const hits = raycaster.intersectObjects(_pickTargets, false);
    if (hits.length > 0) {
      const hitName = hits[0].object.userData.bodyName;
      const body = _celestialBodies.find(b => b.data.name === hitName);
      if (body) {
        focusOnBody(body);
      }
    }
  };

  dom.addEventListener('pointerdown', _onPointerDown);
  dom.addEventListener('pointerup', _onPointerUp);
}

export function init(ctx) {
  _ctx = ctx;
  _focusedBody = null;
  _pickTargets = [];

  ctx.scene.background = new THREE.Color(0x030612);

  _solarRoot = new THREE.Group();
  ctx.scene.add(_solarRoot);
  _removables.push(_solarRoot);

  const ambientLight = new THREE.AmbientLight(0x8899bb, 0.95);
  _solarRoot.add(ambientLight);
  _removables.push(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xaaccff, 0x222244, 0.45);
  _solarRoot.add(hemiLight);
  _removables.push(hemiLight);

  const sunLight = new THREE.PointLight(0xfff4d6, 3.8, AU * 30, 0.35);
  _solarRoot.add(sunLight);
  _removables.push(sunLight);

  _gs = createGestureState();
  createSolarSystem();
  createUI();
  setupRaycasting();

  // Release continuous planet tracking smoothly whenever the user drags OrbitControls
  _unsubDrag = ctx.cameraRig.onUserDragStart(() => {
    if (_focusedBody) {
      _focusedBody = null;
    }
  });

  // Set proper initial overview distance (AU * 5)
  ctx.cameraRig.resetToOverview(AU * 5, Math.PI / 3, Math.PI / 4);
  ctx.setFieldCard?.(PLANET_FACTS.Overview);
}

function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1>Solar System</h1>
    <div class="subtitle">Unit 5 · Patterns &amp; Cycles in Space</div>
  `;
  container.appendChild(_hudEl);

  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';

  const overviewBtn = document.createElement('button');
  overviewBtn.className = 'scene-btn active';
  overviewBtn.textContent = 'Overview';
  overviewBtn.id = 'btn-overview';
  overviewBtn.addEventListener('click', () => selectOverview());
  _uiEl.appendChild(overviewBtn);

  _celestialBodies.forEach(body => {
    if (!body.orbitCenter || body.data.name === 'Sun') {
      const btn = document.createElement('button');
      btn.className = 'scene-btn';
      btn.textContent = body.data.name;
      btn.id = `btn-${body.data.name.toLowerCase()}`;
      btn.addEventListener('click', () => focusOnBody(body));
      _uiEl.appendChild(btn);
    }
  });

  container.appendChild(_uiEl);
}

export function update(dt, cmd) {
  if (!_ctx || !_solarRoot) return;

  applyGestureControl(_solarRoot, cmd, _gs, dt);

  _celestialBodies.forEach(body => {
    body.mesh.rotation.y += (body.data.isLightSource ? 0.12 : 0.45) * dt;

    if (body.data.orbitRadius && body.data.speed) {
      body.angle += body.data.speed * dt * 28;
      const radius = body.data.orbitRadius;
      const x = radius * Math.cos(body.angle);
      const z = radius * Math.sin(body.angle);

      if (body.orbitCenter) {
        body.mesh.position.set(x, 0, z);
      } else if (body.systemGroup) {
        body.systemGroup.position.set(x, 0, z);
      }
    }
  });

  // Continuously track focused planet's moving orbit position
  if (_focusedBody && !_ctx.cameraRig.isUserDragging) {
    _solarRoot.updateMatrixWorld(true);
    _focusedBody.mesh.getWorldPosition(_tempVec);
    _deltaVec.subVectors(_tempVec, _lastFocusPos);
    if (_deltaVec.lengthSq() > 0) {
      _ctx.cameraRig.followDelta(_deltaVec);
      _lastFocusPos.copy(_tempVec);
    }
  }
}

export function dispose() {
  if (_unsubDrag) {
    _unsubDrag();
    _unsubDrag = null;
  }
  if (_ctx && _ctx.renderer && _ctx.renderer.domElement) {
    if (_onPointerDown) _ctx.renderer.domElement.removeEventListener('pointerdown', _onPointerDown);
    if (_onPointerUp) _ctx.renderer.domElement.removeEventListener('pointerup', _onPointerUp);
  }
  _onPointerDown = null;
  _onPointerUp = null;
  _pointerDownPos = null;
  _focusedBody = null;

  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl = null;

  _removables.forEach(obj => {
    if (obj.parent) obj.parent.remove(obj);
  });
  _disposables.forEach(({ geometry, material }) => {
    if (geometry) geometry.dispose();
    if (material) {
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    }
  });
  _textures.forEach(tex => {
    if (tex) tex.dispose();
  });
  _textures = [];
  if (_ctx) {
    _ctx.scene.background = null;
  }
  _removables = [];
  _disposables = [];
  _celestialBodies = [];
  _pickTargets = [];
  _solarRoot = null;
  _gs = null;
  _ctx = null;
}
