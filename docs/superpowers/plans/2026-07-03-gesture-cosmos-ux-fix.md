# Gesture Cosmos Hub UX Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the interactive control panels, HUDs, OrbitControls mouse/touch controls, and configurations for all 6 scenes within the single Gesture Cosmos Hub page.

**Architecture:** We will integrate OrbitControls directly in `CameraRig` for mouse and touch fallback. In `gesture-cosmos-hub.html`, we will add a container for scene-specific HUD and controls, which each scene module will dynamically populate on `init()` and clean up on `dispose()`.

**Tech Stack:** Vanilla JavaScript, Three.js (r163), HTML5 Canvas, CSS.

## Global Constraints
- Do not use build tools for individual games; use Three.js from CDN via importmaps.
- All styles must use vanilla CSS and comply with child-friendly UX guidelines (touch targets >= 44px).
- Avoid timed pressure, make failure low-stakes, and keep return links visible.

---

### Task 1: Integrate OrbitControls in CameraRig

**Files:**
- Modify: [camera-rig.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/core/camera-rig.js)

**Interfaces:**
- Consumes: `THREE` from standard library, `OrbitControls` from `three/addons/controls/OrbitControls.js`.
- Produces: Updated `CameraRig` instance driving camera orbit/zoom programmatically or falling back to OrbitControls dragging.

- [ ] **Step 1: Edit `camera-rig.js` to import and instantiate OrbitControls**

Replace the contents of [camera-rig.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/core/camera-rig.js) with:

```javascript
/**
 * CameraRig — unified camera orbit controller.
 * Can be driven by gesture commands or OrbitControls.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);
    this.minZoom = 5;
    this.maxZoom = 500;

    // Initialize OrbitControls
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = this.minZoom;
    this.orbitControls.maxDistance = this.maxZoom;
    this.orbitControls.target.copy(this.target);
  }

  /**
   * Apply orbit command from gesture router.
   */
  applyCommand(cmd) {
    if (!cmd) {
      this.orbitControls.update();
      return;
    }

    if (cmd.type === 'orbit') {
      const offset = new THREE.Vector3().copy(this.camera.position).sub(this.orbitControls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      spherical.theta -= cmd.dx * 0.05;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + cmd.dy * 0.05));
      
      if (cmd.zoomFactor) {
        spherical.radius /= cmd.zoomFactor;
        spherical.radius = Math.max(this.minZoom, Math.min(this.maxZoom, spherical.radius));
      }

      const newOffset = new THREE.Vector3().setFromSpherical(spherical);
      this.camera.position.copy(this.orbitControls.target).add(newOffset);
      this.camera.lookAt(this.orbitControls.target);
      this.orbitControls.update();
    } else if (cmd.type === 'reset') {
      this.resetToOverview();
    }
  }

  /**
   * Focus on a world position.
   */
  focusOn(position, offsetRadius) {
    this.orbitControls.target.copy(position);
    const offset = new THREE.Vector3(0, offsetRadius * 0.5, offsetRadius);
    this.camera.position.copy(position).add(offset);
    this.camera.lookAt(position);
    this.orbitControls.update();
  }

  /**
   * Reset to overview.
   */
  resetToOverview(radius = 60, phi = Math.PI / 4, theta = Math.PI / 4) {
    this.orbitControls.target.set(0, 0, 0);
    const spherical = new THREE.Spherical(radius, phi, theta);
    const offset = new THREE.Vector3().setFromSpherical(spherical);
    this.camera.position.copy(this.orbitControls.target).add(offset);
    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();
  }

  /**
   * Update called every frame.
   */
  update() {
    this.orbitControls.update();
  }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/science/gesture-cosmos/core/camera-rig.js
git commit -m "feat: integrate OrbitControls in CameraRig for mouse/touch fallback"
```

---

### Task 2: Create UI Container and Stylesheets

**Files:**
- Modify: [gesture-cosmos-hub.html](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos-hub.html)

**Interfaces:**
- Consumes: DOM structures.
- Produces: HTML container `#scene-ui-container` and CSS rules for HUD overlay and control buttons.

- [ ] **Step 1: Modify HTML to include container and add general overlay styles**

Modify [gesture-cosmos-hub.html](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos-hub.html) to insert `#scene-ui-container` and CSS rules for sidebar panel button configurations.
Insert `#scene-ui-container` right inside `<body>`:

```html
  <div id="scene-ui-container"></div>
```

Add these styles inside `<style>` block in [gesture-cosmos-hub.html](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos-hub.html):

```css
    /* Scene UI Container Overlay Styles */
    #scene-ui-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }
    #scene-ui-container * {
      pointer-events: auto;
    }
    
    /* Shared control panel styles */
    .scene-controls {
      position: absolute;
      top: 50%;
      right: 30px;
      transform: translateY(-50%);
      width: 140px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 20;
    }
    
    .scene-btn {
      width: 100%;
      min-height: 44px;
      padding: 8px 12px;
      background: rgba(10, 20, 30, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.5);
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 4px;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      backdrop-filter: blur(8px);
      text-align: center;
    }
    
    .scene-btn:hover {
      border-color: rgba(255, 255, 255, 0.5);
      color: #fff;
      transform: translateX(-5px);
    }
    
    .scene-btn.active {
      background: rgba(0, 243, 255, 0.1);
      border: 1px solid #00f3ff;
      color: #00f3ff;
      box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
      text-shadow: 0 0 5px #00f3ff;
      transform: translateX(-5px);
    }
    
    /* HUD block styles */
    .scene-hud {
      position: absolute;
      bottom: 40px;
      left: 40px;
      color: #fff;
      z-index: 20;
      pointer-events: none;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
    }
    
    .scene-hud h1 {
      font-size: 3.5rem;
      margin: 0;
      letter-spacing: 6px;
      font-weight: 700;
      background: linear-gradient(to right, #fff, #88ccff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
    }
    
    .scene-hud .subtitle {
      font-size: 1.1rem;
      letter-spacing: 3px;
      color: #6688aa;
      margin-top: 5px;
      text-transform: uppercase;
    }

    .scene-status {
      position: absolute;
      top: 50px;
      right: 40px;
      text-align: right;
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.8rem;
      letter-spacing: 1px;
      line-height: 1.5;
    }
    .scene-status span {
      color: #00f3ff;
      font-weight: bold;
    }
```

- [ ] **Step 2: Commit HTML changes**

```bash
git add src/science/gesture-cosmos-hub.html
git commit -m "style: add scene UI container and overlay stylesheet rules to Cosmos Hub"
```

---

### Task 3: Restore Solar System Controls and HUD

**Files:**
- Modify: [scene-solar-system.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-solar-system.js)

- [ ] **Step 1: Update `scene-solar-system.js` to create HUD & buttons on `init()` and remove them on `dispose()`**

Open [scene-solar-system.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-solar-system.js) and modify the `init` and `dispose` exports, and implement the sidebar rendering and focus transitions.
In `scene-solar-system.js`:

Add variables at top:
```javascript
let _uiEl = null;
let _hudEl = null;
```

Update `init(ctx)`:
```javascript
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
```

Add UI functions:
```javascript
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
```

Update `update(dt, cmd)` raycasting section to trigger active button state:
```javascript
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
```

Update `dispose()` to cleanup UI:
```javascript
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
```

- [ ] **Step 2: Commit Solar System Scene Changes**

```bash
git add src/science/gesture-cosmos/scenes/scene-solar-system.js
git commit -m "feat: restore Solar System control sidebar and HUD overlay"
```

---

### Task 4: Restore Neon Planets Controls and HUD

**Files:**
- Modify: [scene-neon-planets.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-neon-planets.js)

- [ ] **Step 1: Update `scene-neon-planets.js` to create HUD & buttons, and load planets dynamically**

In [scene-neon-planets.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-neon-planets.js):

Add UI variables at top:
```javascript
let _uiEl = null;
let _hudEl = null;
```

Update `init(ctx)`:
```javascript
export function init(ctx) {
  _ctx = ctx;

  ctx.scene.background = new THREE.Color(0x020205);
  ctx.scene.fog = new THREE.FogExp2(0x020205, 0.02);

  _glowTexture = createGlowTexture();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  ctx.scene.add(ambientLight);
  _disposables.push(ambientLight);

  _bgStars = createBackgroundStars();
  ctx.scene.add(_bgStars);

  loadPlanet('Sun');
  createUI();
}
```

Add UI functions:
```javascript
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
```

Update `dispose()` to cleanup UI elements:
```javascript
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

  _disposables.forEach(obj => {
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
  _ctx = null;
}
```

- [ ] **Step 2: Commit Neon Planets Scene Changes**

```bash
git add src/science/gesture-cosmos/scenes/scene-neon-planets.js
git commit -m "feat: restore Neon Planets selection buttons and HUD overlay"
```

---

### Task 5: Restore Spiral Galaxy Controls and HUD

**Files:**
- Modify: [scene-galaxy-spiral.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-galaxy-spiral.js)

- [ ] **Step 1: Update `scene-galaxy-spiral.js` to create HUD & buttons**

In [scene-galaxy-spiral.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-galaxy-spiral.js):

Add UI variables at top:
```javascript
let _uiEl = null;
let _hudEl = null;
let _statusEl = null;
```

Update `init(ctx)`:
```javascript
export function init(ctx) {
  _ctx = ctx;

  ctx.scene.fog = new THREE.FogExp2(0x000000, 0.002);

  _glowTexture = createGalaxyTexture();

  _bgStars = createBackground();
  ctx.scene.add(_bgStars);

  generateGalaxy(GALAXIES['milkyway']);
  createUI();
}
```

Add UI functions:
```javascript
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
```

Update `update(dt, cmd)` to calculate and display tracking status and FPS:
```javascript
export function update(dt, cmd) {
  if (!_ctx) return;
  _time += 0.002;

  let energy = 0;
  if (cmd) {
    const dx = cmd.dx || 0;
    const dy = cmd.dy || 0;
    energy = Math.min(1, Math.abs(dx) + Math.abs(dy));
  }

  // Update FPS / Status indicator
  const statusEl = document.getElementById('spiral-tracking-status');
  if (statusEl) {
    if (_ctx.handEngine.isRunning && _ctx.handEngine.lastResults && _ctx.handEngine.lastResults.multiHandLandmarks && _ctx.handEngine.lastResults.multiHandLandmarks.length > 0) {
      statusEl.textContent = 'GESTURE ACTIVE';
    } else {
      statusEl.textContent = 'MOUSE CONTROL';
    }
  }
  const fpsEl = document.getElementById('spiral-fps');
  if (fpsEl && dt > 0) {
    fpsEl.textContent = Math.round(1 / dt);
  }

  if (_particleSystem) {
    const rotSpeed = 0.0003 + energy * 0.005;
    _particleSystem.rotation.y -= rotSpeed;

    if (_particleSystem.scale.x < 1) {
      _particleSystem.scale.addScalar(0.05);
    }

    if (energy > 0.01) {
      const orig = _particleSystem.geometry.userData.originalPos;
      const positions = _particleSystem.geometry.attributes.position.array;
      const pulse = 1 + Math.sin(_time * 10) * 0.05 * energy;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = orig[i] * pulse + (Math.random() - 0.5) * energy;
        positions[i + 1] = orig[i + 1] * pulse + (Math.random() - 0.5) * energy;
        positions[i + 2] = orig[i + 2] * pulse + (Math.random() - 0.5) * energy;
      }
      _particleSystem.geometry.attributes.position.needsUpdate = true;
    }
  }
}
```

Update `dispose()`:
```javascript
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
    if (_bgStars.geometry) _bgStars.geometry.dispose();
    _bgStars = null;
  }

  _disposables.forEach(d => {
    if (d.dispose) d.dispose();
  });

  _ctx.scene.fog = null;
  _disposables = [];
  _ctx = null;
}
```

- [ ] **Step 2: Commit Spiral Galaxy Scene Changes**

```bash
git add src/science/gesture-cosmos/scenes/scene-galaxy-spiral.js
git commit -m "feat: restore Spiral Galaxy buttons and HUD overlays"
```

---

### Task 6: Restore Crystal Galaxy Controls and HUD

**Files:**
- Modify: [scene-crystal-galaxy.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-crystal-galaxy.js)

- [ ] **Step 1: Update `scene-crystal-galaxy.js` to support galaxy options and HUD**

Modify [scene-crystal-galaxy.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-crystal-galaxy.js) to import and update configs, and add HUD elements:

Add GALAXIES config definition and variables at top:
```javascript
const GALAXIES = {
  'milkyway': {
    name: "MILKY", span: "WAY", subtitle: "200,000 DISCRETE PARTICLES",
    count: 200000,
    colors: { core: [0.5, 0.35, 0.15], arm: [0.2, 0.4, 0.9], dust: [0.1, 0.05, 0.2] },
    params: { r: 50, spin: 3, arms: 2, bar: 12 }
  },
  'andromeda': {
    name: "ANDRO", span: "MEDA", subtitle: "220,000 DISCRETE PARTICLES",
    count: 220000,
    colors: { core: [0.6, 0.6, 0.55], arm: [0.3, 0.5, 0.7], dust: [0.1, 0.15, 0.2] },
    params: { r: 60, spin: 5, arms: 4, bar: 0 }
  },
  'whirlpool': {
    name: "WHIRL", span: "POOL", subtitle: "180,000 DISCRETE PARTICLES",
    count: 180000,
    colors: { core: [0.6, 0.6, 0.6], arm: [0.5, 0.3, 0.6], dust: [0.2, 0.0, 0.05] },
    params: { r: 45, spin: 4, arms: 2, bar: 0 }
  },
  'sombrero': {
    name: "SOMB", span: "RERO", subtitle: "160,000 DISCRETE PARTICLES",
    count: 160000,
    colors: { core: [0.6, 0.3, 0.05], arm: [0.4, 0.15, 0.05], dust: [0.0, 0.0, 0.0] },
    params: { r: 50, spin: 10, arms: 0, bar: 0, bulge: 10 }
  }
};

let _uiEl = null;
let _hudEl = null;
```

Modify `generateGalaxy` to consume dynamic galaxy configurations:
```javascript
function generateGalaxy(cfg) {
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
  const colCore = cfg.colors.core;
  const colArm = cfg.colors.arm;
  const colDust = cfg.colors.dust;
  const barL = cfg.params.bar || 0;

  for (let i = 0; i < count; i++) {
    let x, y, z, r, angle;
    let cr = 0, cg = 0, cb = 0;
    let size = Math.random();

    if (size > 0.98) size = 2.5;
    else if (size > 0.9) size = 1.2;
    else size = 0.5;

    if (barL > 0 && i < count * 0.2) {
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
      
      let arm = 0;
      if (cfg.params.arms > 0) {
        arm = (Math.floor(Math.random() * cfg.params.arms) / cfg.params.arms) * Math.PI * 2;
      }
      
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
  
  const mesh = new THREE.Points(geom, material);
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
```

Update `init(ctx)`:
```javascript
export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x000000);
  ctx.scene.fog = new THREE.FogExp2(0x000000, 0.002);

  _starField = createStarField();
  ctx.scene.add(_starField);
  _removables.push(_starField);

  generateGalaxy(GALAXIES['milkyway']);
  createUI();
}
```

Add UI functions:
```javascript
function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  // HUD
  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1 id="crystal-galaxy-name">MILKY <span>WAY</span></h1>
    <div class="subtitle" id="crystal-galaxy-sub">200,000 DISCRETE PARTICLES</div>
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
      generateGalaxy(galaxy);
      
      const title = document.getElementById('crystal-galaxy-name');
      if (title) title.innerHTML = `${galaxy.name} <span>${galaxy.span}</span>`;
      const subtitle = document.getElementById('crystal-galaxy-sub');
      if (subtitle) subtitle.textContent = galaxy.subtitle;

      const buttons = _uiEl.querySelectorAll('.scene-btn');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    _uiEl.appendChild(btn);
  });

  container.appendChild(_uiEl);
}
```

Update `dispose()`:
```javascript
export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl = null;

  _removables.forEach(obj => {
    if (obj.parent) obj.parent.remove(obj);
  });
  disposeTracked();
  
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
```

- [ ] **Step 2: Commit Crystal Galaxy Changes**

```bash
git add src/science/gesture-cosmos/scenes/scene-crystal-galaxy.js
git commit -m "feat: restore Crystal Galaxy config selector and HUD"
```

---

### Task 7: Restore Milky Way Controls and HUD

**Files:**
- Modify: [scene-milky-way.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-milky-way.js)

- [ ] **Step 1: Update `scene-milky-way.js` to support multiple galaxy presets**

Modify [scene-milky-way.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-milky-way.js) to configure options:

Add GALAXIES configuration and UI variables:
```javascript
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

let _uiEl = null;
let _hudEl = null;
```

Update `generateMilkyWay` to consume configurations:
```javascript
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
```

Update `init(ctx)`:
```javascript
export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x000000);
  ctx.scene.fog = new THREE.FogExp2(0x000000, 0.002);

  _starField = createStarField();
  ctx.scene.add(_starField);
  _removables.push(_starField);

  generateMilkyWay(GALAXIES['milkyway']);
  createUI();
}
```

Add UI functions:
```javascript
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
```

Update `dispose()`:
```javascript
export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl = null;

  _removables.forEach(obj => {
    if (obj.parent) obj.parent.remove(obj);
  });
  disposeTracked();
  
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
```

- [ ] **Step 2: Commit Milky Way Changes**

```bash
git add src/science/gesture-cosmos/scenes/scene-milky-way.js
git commit -m "feat: restore Milky Way presets switcher and HUD"
```

---

### Task 8: Restore Shape Lab Controls and HUD

**Files:**
- Modify: [scene-shape-motion.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-shape-motion.js)

- [ ] **Step 1: Update `scene-shape-motion.js` to create shape selectors and HUD overlays**

Modify [scene-shape-motion.js](file:///Users/kane/Code/IB_PYP_Games/src/science/gesture-cosmos/scenes/scene-shape-motion.js):

Add UI variables at top:
```javascript
let _uiEl = null;
let _hudEl = null;
```

Update `init(ctx)`:
```javascript
export function init(ctx) {
  _ctx = ctx;
  ctx.scene.background = new THREE.Color(0x050505);
  ctx.scene.fog = new THREE.FogExp2(0x050505, 0.03);

  const system = createParticleSystem();
  ctx.scene.add(system);
  _removables.push(system);

  calculateShape('heart');
  createUI();
}
```

Add UI functions:
```javascript
function createUI() {
  const container = document.getElementById('scene-ui-container');
  if (!container) return;

  // HUD
  _hudEl = document.createElement('div');
  _hudEl.className = 'scene-hud';
  _hudEl.innerHTML = `
    <h1 id="shape-lab-title">HEART</h1>
    <div class="subtitle">Unit 5: Patterns and Cycles</div>
  `;
  container.appendChild(_hudEl);

  // Sidebar Controls
  _uiEl = document.createElement('div');
  _uiEl.className = 'scene-controls';

  const shapes = ['heart', 'flower', 'saturn', 'helix', 'sphere', 'galaxy'];
  shapes.forEach(shapeName => {
    const btn = document.createElement('button');
    btn.className = 'scene-btn' + (shapeName === 'heart' ? ' active' : '');
    btn.textContent = shapeName;
    btn.addEventListener('click', () => {
      calculateShape(shapeName);
      
      const title = document.getElementById('shape-lab-title');
      if (title) title.textContent = shapeName.toUpperCase();

      const buttons = _uiEl.querySelectorAll('.scene-btn');
      buttons.forEach(b => {
        if (b.id !== 'btn-auto-color') b.classList.remove('active');
      });
      btn.classList.add('active');
    });
    _uiEl.appendChild(btn);
  });

  // Auto color button
  const autoColorBtn = document.createElement('button');
  autoColorBtn.className = 'scene-btn';
  autoColorBtn.id = 'btn-auto-color';
  autoColorBtn.textContent = 'Auto Color: Off';
  autoColorBtn.addEventListener('click', () => {
    _autoColor = !_autoColor;
    if (_autoColor) {
      autoColorBtn.textContent = 'Auto Color: On';
      autoColorBtn.classList.add('active');
    } else {
      autoColorBtn.textContent = 'Auto Color: Off';
      autoColorBtn.classList.remove('active');
      _material.color.setHex(0x00ffcc); // Reset to base color
    }
  });
  _uiEl.appendChild(autoColorBtn);

  container.appendChild(_uiEl);
}
```

Update `dispose()`:
```javascript
export function dispose() {
  if (_hudEl && _hudEl.parentNode) _hudEl.parentNode.removeChild(_hudEl);
  if (_uiEl && _uiEl.parentNode) _uiEl.parentNode.removeChild(_uiEl);
  _hudEl = null;
  _uiEl = null;

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
```

- [ ] **Step 2: Commit Shape Lab Changes**

```bash
git add src/science/gesture-cosmos/scenes/scene-shape-motion.js
git commit -m "feat: restore Shape Lab shape selectors and HUD overlays"
```

---

### Task 9: Verification and QA

**Files:**
- Test: Live Dev Server

- [ ] **Step 1: Run static curriculum QA checks**

Run: `npm run qa:curriculum`
Expected: Passes with no errors.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Passes and builds assets.

- [ ] **Step 3: Commit all remaining verification files**

```bash
git commit -am "chore: clean up service worker and finalize gesture cosmos UX fix"
```
