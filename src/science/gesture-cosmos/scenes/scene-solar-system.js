/**
 * Solar System Scene
 * Ported from g1_solar_system.html
 */
import * as THREE from 'three';

export const name = 'solar-system';

let _ctx = null;
let _celestialBodies = [];
let _removables = [];
let _disposables = [];
let _uiEl = null;
let _hudEl = null;

const AU = 50;
const SIZES = {
  sun: 5, mercury: 0.4, venus: 0.8, earth: 1, mars: 0.7,
  jupiter: 3.5, saturn: 3, uranus: 2, neptune: 1.9,
  moon: 0.2, phobos: 0.1, deimos: 0.08,
  io: 0.3, europa: 0.25, ganymede: 0.4, callisto: 0.38,
  titan: 0.4, rhea: 0.2,
  titania: 0.2, oberon: 0.18,
  triton: 0.25
};
const ORBITS = {
  mercury: 0.39 * AU, venus: 0.72 * AU, earth: 1 * AU, mars: 1.52 * AU,
  jupiter: 3.2 * AU, saturn: 5.5 * AU, uranus: 8 * AU, neptune: 12 * AU,
  moon: SIZES.earth + 1.5, phobos: SIZES.mars + 0.8, deimos: SIZES.mars + 1.2,
  io: SIZES.jupiter + 2, europa: SIZES.jupiter + 2.5, ganymede: SIZES.jupiter + 3, callisto: SIZES.jupiter + 3.5,
  titan: SIZES.saturn + 2.5, rhea: SIZES.saturn + 3,
  titania: SIZES.uranus + 1.5, oberon: SIZES.uranus + 2,
  triton: SIZES.neptune + 1.8
};
const SPEEDS = {
  mercury: 0.02, venus: 0.015, earth: 0.01, mars: 0.008,
  jupiter: 0.004, saturn: 0.003, uranus: 0.002, neptune: 0.001,
  moon: 0.1, phobos: 0.2, deimos: 0.15,
  io: 0.1, europa: 0.08, ganymede: 0.06, callisto: 0.05,
  titan: 0.07, rhea: 0.06,
  titania: 0.05, oberon: 0.04,
  triton: 0.06
};
const COLORS = {
  sun: 0xffff33,
  mercury: 0xcccccc,
  venus: 0xffe033,
  earth: 0x33aaff,
  mars: 0xff6633,
  jupiter: 0xffb333,
  saturn: 0xffc266,
  uranus: 0xbbeeff,
  neptune: 0x6699cc,
  moon: 0xdddddd,
  phobos: 0xcccccc,
  deimos: 0xdddddd,
  io: 0xffffcc,
  europa: 0xccccff,
  ganymede: 0xdddddd,
  callisto: 0x999999,
  titan: 0xffe6b3,
  rhea: 0xdddddd,
  titania: 0xdddddd,
  oberon: 0xcccccc,
  triton: 0xccccff,
  orbit: 0xcccccc,
  ring: 0x8c7853
};
const TEXTURES = {
  background: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/starmap_g4k.jpg',
  Earth: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/earth_atmos_2048.jpg',
  Moon: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/moon_1024.jpg',
  Mars: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/mars_1k_color.jpg',
  Jupiter: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/jupiter.jpg',
  Saturn: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/saturn.jpg',
  SaturnRing: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/saturn_ring.png',
  Uranus: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/uranus.jpg',
  Neptune: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/planets/neptune.jpg',
};

function createOrbitLine(radius, parent) {
  const points = [];
  const divisions = 128;
  for (let i = 0; i <= divisions; i++) {
    const angle = (i / divisions) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: COLORS.orbit, transparent: true, opacity: 0.5 });
  const line = new THREE.Line(geometry, material);
  line.castShadow = false;
  line.receiveShadow = false;
  parent.add(line);
  _removables.push(line);
  _disposables.push({ geometry, material });
}

function createCelestialBody(data, parentGroup = null, orbitCenter = null) {
  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  let material;
  const textureUrl = TEXTURES[data.name];

  if (data.isLightSource) {
    material = new THREE.MeshBasicMaterial({ color: data.color });
  } else if (textureUrl) {
    const texture = _ctx.textureLoader.load(textureUrl);
    material = new THREE.MeshStandardMaterial({
      map: texture, color: 0xffffff, roughness: 0.8, metalness: 0.1
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      color: data.color, roughness: 0.7, metalness: 0.1,
      emissive: new THREE.Color(data.color).multiplyScalar(0.05)
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;

  if (!data.isLightSource) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  const body = {
    mesh,
    data,
    orbitCenter,
    angle: Math.random() * Math.PI * 2,
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

  return body;
}

function createSolarSystem() {
  const scene = _ctx.scene;

  const sunData = { name: 'Sun', radius: SIZES.sun, color: COLORS.sun, isLightSource: true };
  const sun = createCelestialBody(sunData, null, null);
  sun.mesh.castShadow = false;
  sun.mesh.receiveShadow = false;
  scene.add(sun.mesh);
  _removables.push(sun.mesh);
  _celestialBodies.push(sun);

  const planetsData = [
    { name: 'Mercury', radius: SIZES.mercury, color: COLORS.mercury, orbitRadius: ORBITS.mercury, speed: SPEEDS.mercury, moons: [] },
    { name: 'Venus', radius: SIZES.venus, color: COLORS.venus, orbitRadius: ORBITS.venus, speed: SPEEDS.venus, moons: [] },
    {
      name: 'Earth', radius: SIZES.earth, color: COLORS.earth, orbitRadius: ORBITS.earth, speed: SPEEDS.earth, moons: [
        { name: 'Moon', radius: SIZES.moon, color: COLORS.moon, orbitRadius: ORBITS.moon, speed: SPEEDS.moon }
      ]
    },
    {
      name: 'Mars', radius: SIZES.mars, color: COLORS.mars, orbitRadius: ORBITS.mars, speed: SPEEDS.mars, moons: [
        { name: 'Phobos', radius: SIZES.phobos, color: COLORS.phobos, orbitRadius: ORBITS.phobos, speed: SPEEDS.phobos },
        { name: 'Deimos', radius: SIZES.deimos, color: COLORS.deimos, orbitRadius: ORBITS.deimos, speed: SPEEDS.deimos }
      ]
    },
    {
      name: 'Jupiter', radius: SIZES.jupiter, color: COLORS.jupiter, orbitRadius: ORBITS.jupiter, speed: SPEEDS.jupiter, moons: [
        { name: 'Io', radius: SIZES.io, color: COLORS.io, orbitRadius: ORBITS.io, speed: SPEEDS.io },
        { name: 'Europa', radius: SIZES.europa, color: COLORS.europa, orbitRadius: ORBITS.europa, speed: SPEEDS.europa },
        { name: 'Ganymede', radius: SIZES.ganymede, color: COLORS.ganymede, orbitRadius: ORBITS.ganymede, speed: SPEEDS.ganymede },
        { name: 'Callisto', radius: SIZES.callisto, color: COLORS.callisto, orbitRadius: ORBITS.callisto, speed: SPEEDS.callisto }
      ]
    },
    {
      name: 'Saturn', radius: SIZES.saturn, color: COLORS.saturn, orbitRadius: ORBITS.saturn, speed: SPEEDS.saturn, hasRing: true, moons: [
        { name: 'Titan', radius: SIZES.titan, color: COLORS.titan, orbitRadius: ORBITS.titan, speed: SPEEDS.titan },
        { name: 'Rhea', radius: SIZES.rhea, color: COLORS.rhea, orbitRadius: ORBITS.rhea, speed: SPEEDS.rhea }
      ]
    },
    {
      name: 'Uranus', radius: SIZES.uranus, color: COLORS.uranus, orbitRadius: ORBITS.uranus, speed: SPEEDS.uranus, moons: [
        { name: 'Titania', radius: SIZES.titania, color: COLORS.titania, orbitRadius: ORBITS.titania, speed: SPEEDS.titania },
        { name: 'Oberon', radius: SIZES.oberon, color: COLORS.oberon, orbitRadius: ORBITS.oberon, speed: SPEEDS.oberon }
      ]
    },
    {
      name: 'Neptune', radius: SIZES.neptune, color: COLORS.neptune, orbitRadius: ORBITS.neptune, speed: SPEEDS.neptune, moons: [
        { name: 'Triton', radius: SIZES.triton, color: COLORS.triton, orbitRadius: ORBITS.triton, speed: SPEEDS.triton }
      ]
    }
  ];

  planetsData.forEach(planetData => {
    const planetSystem = new THREE.Group();
    scene.add(planetSystem);
    _removables.push(planetSystem);

    const planet = createCelestialBody(planetData, planetSystem, null);
    planetSystem.add(planet.mesh);
    _celestialBodies.push(planet);

    createOrbitLine(planetData.orbitRadius, scene);

    if (planetData.moons && planetData.moons.length > 0) {
      planetData.moons.forEach(moonData => {
        const moon = createCelestialBody(moonData, planetSystem, planet.mesh);
        planetSystem.add(moon.mesh);
        _celestialBodies.push(moon);
        planet.moons.push(moon);
        createOrbitLine(moonData.orbitRadius, planet.mesh);
      });
    }

    if (planetData.hasRing && TEXTURES.SaturnRing) {
      const ringGeometry = new THREE.RingGeometry(planetData.radius * 1.2, planetData.radius * 2, 64);
      const ringTexture = _ctx.textureLoader.load(TEXTURES.SaturnRing);
      const pos = ringGeometry.attributes.position;
      const v3 = new THREE.Vector3();
      const uv = ringGeometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        uv.setXY(i, (v3.length() - planetData.radius * 1.2) / (planetData.radius * 0.8), v3.angleTo(new THREE.Vector3(1, 0, 0)) / (Math.PI * 2));
      }
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringTexture, side: THREE.DoubleSide, color: 0xffffff, transparent: true, alphaTest: 0.1, opacity: 0.8, roughness: 0.9, metalness: 0.1
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.receiveShadow = true;
      ringMesh.castShadow = false;
      planet.mesh.add(ringMesh);
      planet.ring = ringMesh;
      _removables.push(ringMesh);
      _disposables.push({ geometry: ringGeometry, material: ringMaterial });
    } else if (planetData.hasRing) {
      const ringGeometry = new THREE.RingGeometry(planetData.radius * 1.2, planetData.radius * 2, 64);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.ring, side: THREE.DoubleSide, transparent: true, opacity: 0.6, roughness: 0.9, metalness: 0.1
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.receiveShadow = true;
      planet.mesh.add(ringMesh);
      planet.ring = ringMesh;
      _removables.push(ringMesh);
      _disposables.push({ geometry: ringGeometry, material: ringMaterial });
    }
  });
}

export function init(ctx) {
  _ctx = ctx;

  const ambientLight = new THREE.AmbientLight(0x404040);
  ctx.scene.add(ambientLight);
  _removables.push(ambientLight);

  const sunLight = new THREE.PointLight(0xffffff, 4, AU * 50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = AU * 20;
  ctx.scene.add(sunLight);
  _removables.push(sunLight);

  ctx.textureLoader.load(TEXTURES.background, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    ctx.scene.background = texture;
  }, undefined, (err) => {
    console.error('[SolarSystem] Error loading background:', err);
    ctx.scene.background = new THREE.Color(0x000000);
  });

  createSolarSystem();
  createUI();
}

function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  // HUD
  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1>Solar System</h1>
    <div class="subtitle">Unit 5: Patterns and Cycles</div>
  `;
  container.appendChild(_hudEl);

  // Sidebar Controls
  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';
  _uiEl.style.maxHeight = 'calc(100vh - 120px)';
  _uiEl.style.overflowY = 'auto';

  const overviewBtn = document.createElement('button');
  overviewBtn.className = 'scene-btn active';
  overviewBtn.textContent = 'Overview';
  overviewBtn.id = 'btn-overview';
  overviewBtn.addEventListener('click', () => {
    _ctx.cameraRig.resetToOverview(AU * 5, Math.PI / 3, Math.PI / 4);
    setActiveButton(overviewBtn);
  });
  _uiEl.appendChild(overviewBtn);

  _celestialBodies.forEach(body => {
    if (!body.orbitCenter || body.data.name === 'Sun') {
      const btn = document.createElement('button');
      btn.className = 'scene-btn';
      btn.textContent = body.data.name;
      btn.id = `btn-${body.data.name.toLowerCase()}`;
      btn.addEventListener('click', () => {
        focusOnBody(body);
        setActiveButton(btn);
      });
      _uiEl.appendChild(btn);
    }
  });

  container.appendChild(_uiEl);
}

function focusOnBody(body) {
  const pos = new THREE.Vector3();
  body.mesh.getWorldPosition(pos);
  const offset = body.data.radius * 5 + 10;
  _ctx.cameraRig.focusOn(pos, offset);
}

function setActiveButton(activeBtn) {
  if (!_uiEl) return;
  const buttons = _uiEl.querySelectorAll('.scene-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}

export function update(dt, cmd) {
  if (!_ctx) return;

  _celestialBodies.forEach(body => {
    body.mesh.rotation.y += 0.05 * dt;

    if (body.data.orbitRadius && body.data.speed) {
      body.angle += body.data.speed * dt * 50;
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

  if (cmd && cmd.type === 'select') {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (cmd.screenX / window.innerWidth) * 2 - 1,
      -(cmd.screenY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, _ctx.camera);

    const meshes = _celestialBodies.map(b => b.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const body = _celestialBodies.find(b => b.mesh === hitMesh);
      if (body) {
        focusOnBody(body);
        const btn = document.getElementById(`btn-${body.data.name.toLowerCase()}`);
        if (btn) setActiveButton(btn);
      }
    }
  }
}

export function dispose() {
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
  if (_ctx) {
    _ctx.scene.background = null;
  }
  _removables = [];
  _disposables = [];
  _celestialBodies = [];
  _ctx = null;
}
