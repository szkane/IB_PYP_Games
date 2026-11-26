/**
 * Gesture Cosmos Hub — Main Entry Point
 *
 * Sets up shared Three.js renderer/scene/camera, instantiates core
 * modules (HandEngine, GestureRouter, CameraRig, SceneHost), registers
 * 6 scene modules, wires dual-mode entry (Hand Gestures / Touch & Mouse),
 * live gesture status indicator, Web Audio chimes, PYP Unit 5 Cosmic Field
 * Card with TTS Read-Aloud, and IB PYP Passport stamping (Inquirer).
 */
import * as THREE from 'three';
import { HandEngine } from './core/hand-engine.js';
import { GestureRouter } from './core/gesture-router.js';
import { CameraRig } from './core/camera-rig.js';
import { SceneHost } from './core/scene-host.js';

// Scene modules (imported dynamically on first switch)
const sceneModules = {
  'solar-system': () => import('./scenes/scene-solar-system.js'),
  'neon-planets': () => import('./scenes/scene-neon-planets.js'),
  'galaxy-spiral': () => import('./scenes/scene-galaxy-spiral.js'),
  'crystal-galaxy': () => import('./scenes/scene-crystal-galaxy.js'),
  'milky-way': () => import('./scenes/scene-milky-way.js'),
  'shape-motion': () => import('./scenes/scene-shape-motion.js'),
};

const SCENE_FIELD_CARDS = {
  'solar-system': {
    title: 'Solar System Overview',
    badge: 'UNIT 5 · PATTERNS & CYCLES',
    fact: 'Eight planets orbit our Sun in repeating elliptical cycles. Inner planets are rocky, while outer giants are made of gas and ice.',
    inquiry: 'Tap any planet in 3D space or on the right panel to ride along its orbit!'
  },
  'neon-planets': {
    title: 'Neon Particle Planets',
    badge: 'UNIT 5 · PLANETARY MATTER',
    fact: 'Every world is built from countless particles held together by gravity — from rocky Mercury to gas giant Jupiter and ringed Saturn.',
    inquiry: 'Try clenching a fist (camera mode) or rotating the glowing planet to compare sizes!'
  },
  'galaxy-spiral': {
    title: 'Spiral Galaxy Explorer',
    badge: 'UNIT 5 · COSMIC PATTERNS',
    fact: 'Billions of stars swirl around a bright galactic center, forming giant spiral arms that rotate over hundreds of millions of years.',
    inquiry: 'Switch between Milky Way, Andromeda, Whirlpool, and Sombrero to compare spiral shapes!'
  },
  'crystal-galaxy': {
    title: 'Crystal Star Cluster',
    badge: 'UNIT 5 · STAR FORMATION',
    fact: 'Galaxies contain bright cores, sweeping star arms, and dark cosmic dust lanes where new stars and planets are born.',
    inquiry: 'Look closely at the bright central bar and outer star arms — what repeating spiral pattern do you notice?'
  },
  'milky-way': {
    title: 'Our Milky Way Home',
    badge: 'UNIT 5 · WHERE WE ARE IN SPACE',
    fact: 'Our Solar System lives on a quiet arm of the Milky Way Galaxy, one of over 100 billion stars spinning in a barred spiral disc.',
    inquiry: 'How does our place in the Milky Way connect to the night sky we see from Earth?'
  },
  'shape-motion': {
    title: 'Cosmic Shape Lab',
    badge: 'UNIT 5 · FORCES & MOTION',
    fact: 'Particles respond to invisible forces and energy, reorganizing into spirals, rings, spheres, and helixes across nature and space.',
    inquiry: 'Watch how thousands of particles flow smoothly from one geometric pattern into another!'
  }
};

// DOM refs
const container = document.getElementById('canvas-container');
const loaderEl = document.getElementById('loader');
const navBar = document.getElementById('nav-bar');
const permissionOverlay = document.getElementById('permission-overlay');
const enableBtn = document.getElementById('enable-gestures');
const touchBtn = document.getElementById('explore-touch');
const gestureIndicator = document.getElementById('gesture-indicator');
const toastEl = document.getElementById('toast');
const videoEl = document.querySelector('.input_video');
const cameraPip = document.getElementById('camera-pip');
const pipSkeleton = document.getElementById('pip-skeleton');
const pipToggleBtn = document.getElementById('pip-toggle-btn');
const pipReopenBtn = document.getElementById('pip-reopen-btn');
const navGestureToggle = document.getElementById('nav-gesture-toggle');
const permissionHint = document.getElementById('permission-hint');

// Field Card & PYP Reflection DOM refs
const fieldCardEl = document.getElementById('field-card');
const fieldToggleBtn = document.getElementById('field-card-toggle');
const fieldBadgeEl = document.getElementById('field-badge');
const fieldTitleEl = document.getElementById('field-title');
const fieldFactEl = document.getElementById('field-fact');
const fieldInquiryEl = document.getElementById('field-inquiry');
const fieldReadBtn = document.getElementById('field-read-btn');
const openReflectBtn = document.getElementById('open-reflect-btn');
const reflectModal = document.getElementById('pyp-reflect-modal');
const claimStampBtn = document.getElementById('btn-claim-stamp');
const closeReflectBtn = document.getElementById('btn-close-reflect');
const stampStatusEl = document.getElementById('pyp-stamp-status');
const reflectChips = document.querySelectorAll('.reflect-chip');

// Subtle Web Audio Cosmic Chime
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (_) {}
}

function playCosmicChime(freq = 523.25) {
  try {
    unlockAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.5, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.46);
    osc2.stop(now + 0.46);
  } catch (_) {}
}

// TTS Read-Aloud synced with shared IB PYP voice preference
const JOKE_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox|fred|junior|kathy|ralph|wobble/i;
let currentCardData = SCENE_FIELD_CARDS['solar-system'];

function pickVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;
  const saved = localStorage.getItem('ib_pyp_voice_name');
  if (saved) {
    const match = voices.find(v => v.name === saved);
    if (match) return match;
  }
  const enVoices = voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('en') && !JOKE_VOICES.test(v.name));
  const preferred = ['samantha', 'daniel', 'google uk english female', 'google us english', 'karen', 'serena'];
  for (const p of preferred) {
    const found = enVoices.find(v => v.name.toLowerCase().includes(p));
    if (found) return found;
  }
  return enVoices[0] || voices.find(v => v.default) || voices[0] || null;
}

function speakText(text, btn) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-US';
  u.rate = 0.9;
  if (btn) {
    btn.classList.add('speaking');
    u.onend = u.onerror = () => btn.classList.remove('speaking');
  }
  window.speechSynthesis.speak(u);
}

function setFieldCard(data) {
  if (!data) return;
  currentCardData = data;
  if (fieldBadgeEl) fieldBadgeEl.textContent = data.badge || 'UNIT 5 · SPACE INQUIRY';
  if (fieldTitleEl) fieldTitleEl.textContent = data.title || 'Cosmic Discovery';
  if (fieldFactEl) fieldFactEl.textContent = data.fact || '';
  if (fieldInquiryEl) fieldInquiryEl.textContent = data.inquiry || '';
}

if (fieldToggleBtn && fieldCardEl) {
  fieldToggleBtn.addEventListener('click', () => {
    const collapsed = fieldCardEl.classList.toggle('collapsed');
    fieldToggleBtn.setAttribute('aria-expanded', String(!collapsed));
    playCosmicChime(collapsed ? 440 : 587.33);
  });
}

if (fieldReadBtn) {
  fieldReadBtn.addEventListener('click', () => {
    playCosmicChime(659.25);
    const fullText = `${currentCardData.title}. ${currentCardData.fact} ${currentCardData.inquiry}`;
    speakText(fullText, fieldReadBtn);
  });
}

// IB PYP Reflection & Passport Stamp (Inquirer)
let selectedReflection = 'I noticed how planets follow repeating orbital cycles around the Sun.';
reflectChips.forEach(chip => {
  chip.addEventListener('click', () => {
    reflectChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedReflection = chip.dataset.reflection || chip.textContent;
    playCosmicChime(587.33);
  });
});

function hasExistingStamp() {
  try {
    const raw = localStorage.getItem('ib_pyp_passport');
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Array.isArray(data.completed) && data.completed.includes('science/gesture-cosmos-hub.html');
  } catch (_) {
    return false;
  }
}

function savePassportStamp() {
  try {
    const raw = localStorage.getItem('ib_pyp_passport');
    const data = raw ? JSON.parse(raw) : { stamps: [], completed: [] };
    const stamps = new Set(Array.isArray(data.stamps) ? data.stamps : []);
    const completed = new Set(Array.isArray(data.completed) ? data.completed : []);
    stamps.add('Inquirer');
    completed.add('science/gesture-cosmos-hub.html');
    localStorage.setItem('ib_pyp_passport', JSON.stringify({ stamps: [...stamps], completed: [...completed] }));
    if (stampStatusEl) stampStatusEl.textContent = `✅ Inquirer stamp saved! Reflection: "${selectedReflection}"`;
    if (claimStampBtn) claimStampBtn.textContent = '✅ Stamped in Passport!';
    playCosmicChime(783.99);
    setTimeout(() => playCosmicChime(1046.5), 140);
  } catch (_) {}
}

if (openReflectBtn && reflectModal) {
  openReflectBtn.addEventListener('click', () => {
    playCosmicChime(523.25);
    if (hasExistingStamp() && stampStatusEl && !stampStatusEl.textContent) {
      stampStatusEl.textContent = '⭐ Already stamped in your IB PYP Passport — feel free to reflect again!';
    }
    reflectModal.classList.add('open');
  });
}
if (claimStampBtn) claimStampBtn.addEventListener('click', savePassportStamp);
if (closeReflectBtn && reflectModal) {
  closeReflectBtn.addEventListener('click', () => reflectModal.classList.remove('open'));
}
if (reflectModal) {
  reflectModal.addEventListener('click', (e) => {
    if (e.target === reflectModal) reflectModal.classList.remove('open');
  });
}

// Shared Three.js objects
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 120, 220);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

// Core modules
const handEngine = new HandEngine();
const gestureRouter = new GestureRouter();
if (pipSkeleton) handEngine.setSkeletonCanvas(pipSkeleton);
const cameraRig = new CameraRig(camera, renderer.domElement);
const sceneHost = new SceneHost();

window.__cosmosDebug = {
  handEngine,
  gestureRouter,
  processLandmarks: (r) => {
    handEngine.lastResults = r;
  }
};

// Context passed to every scene
const ctx = {
  scene,
  camera,
  renderer,
  textureLoader,
  cameraRig,
  handEngine,
  gestureRouter,
  setFieldCard,
  playChime: playCosmicChime,
};

sceneHost.setContext(ctx);

// Toast helper
let toastTimer = null;
function showToast(msg, duration = 3200) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), duration);
}

// Gesture indicator state tracking
let interactionMode = 'pending'; // 'pending' | 'camera' | 'touch'
let lastIndicatorText = '';
function setGestureIndicator(text, highlight = false) {
  if (!gestureIndicator) return;
  if (text !== lastIndicatorText) {
    gestureIndicator.textContent = text;
    lastIndicatorText = text;
  }
  gestureIndicator.classList.toggle('active-gesture', highlight);
}

// Nav handling — preserve valid active tab if load or init fails
let currentSceneName = null;

function syncNavActive(sceneKey) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scene === sceneKey);
  });
}

async function switchScene(name) {
  if (name === currentSceneName) return;
  const btn = document.querySelector(`[data-scene="${name}"]`);
  if (!btn) return;

  const previousScene = currentSceneName;
  syncNavActive(name);

  if (!sceneHost.scenes.has(name)) {
    try {
      const mod = await sceneModules[name]();
      sceneHost.register(name, mod.default || mod);
    } catch (e) {
      console.error(`[Hub] Failed to load scene "${name}":`, e);
      showToast(`Scene "${name}" unavailable`);
      syncNavActive(previousScene);
      return;
    }
  }

  try {
    sceneHost.switchTo(name);
    currentSceneName = name;
    syncNavActive(name);
    if (SCENE_FIELD_CARDS[name] && name !== 'solar-system') {
      setFieldCard(SCENE_FIELD_CARDS[name]);
    }
    if (previousScene !== null) {
      playCosmicChime(587.33);
    }
  } catch (e) {
    console.error(`[Hub] Failed to init scene "${name}":`, e);
    showToast(`Scene "${name}" init error`);
    syncNavActive(previousScene);
  }
}

navBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (btn) switchScene(btn.dataset.scene);
});

// Dual Entry CTAs: Touch / Mouse (zero camera prompt) vs Hand Gestures
function syncGestureButtons() {
  const isCam = interactionMode === 'camera';
  if (navGestureToggle) {
    navGestureToggle.textContent = isCam ? '✋ Gestures: ON' : '✋ Gestures: OFF';
    navGestureToggle.classList.toggle('on', isCam);
  }
}

function stopCameraMode() {
  handEngine.stop();
  interactionMode = 'touch';
  if (cameraPip) {
    cameraPip.classList.add('inactive');
    cameraPip.classList.remove('minimized');
  }
  if (pipReopenBtn) pipReopenBtn.classList.remove('visible');
  syncGestureButtons();
  gestureIndicator.classList.add('visible');
  setGestureIndicator('👆 Touch / Mouse Mode · Drag to orbit · Scroll/Pinch to zoom · Tap planets');
}

async function startCameraMode(triggerBtn = null) {
  unlockAudio();
  playCosmicChime(587.33);

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const diag = 'Camera access requires HTTPS or localhost. Using Touch / Mouse controls!';
    if (permissionHint) permissionHint.textContent = diag;
    showToast(diag, 4500);
    if (interactionMode === 'pending') {
      stopCameraMode();
      permissionOverlay.classList.remove('visible');
    }
    return;
  }

  const origLabel = triggerBtn ? triggerBtn.textContent : '';
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'STARTING CAMERA...';
  }
  try {
    // Call getUserMedia FIRST inside click handler so Safari user activation never expires
    await handEngine.startCamera(videoEl);
    await handEngine.init(videoEl);
    interactionMode = 'camera';
    permissionOverlay.classList.remove('visible');
    if (cameraPip) {
      cameraPip.classList.remove('inactive', 'minimized');
    }
    if (pipReopenBtn) pipReopenBtn.classList.remove('visible');
    syncGestureButtons();
    gestureIndicator.classList.add('visible');
    setGestureIndicator('👋 Hand Tracking Ready · Show your open palm to explore');
    showToast('Hand gestures active — open palm to rotate & scale, make a fist to burst particles!');
  } catch (err) {
    console.error('[Hub] Camera/MediaPipe init failed:', err);
    stopCameraMode();
    permissionOverlay.classList.remove('visible');
    showToast(`${err.message || 'Camera unavailable'} — switched to Touch / Mouse controls`, 4000);
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = origLabel;
    }
    syncGestureButtons();
  }
}

if (touchBtn) {
  touchBtn.addEventListener('click', () => {
    unlockAudio();
    playCosmicChime(523.25);
    permissionOverlay.classList.remove('visible');
    stopCameraMode();
    showToast('Touch & Mouse exploration active — drag to orbit and tap planets to follow them!');
  });
}

if (enableBtn) {
  enableBtn.addEventListener('click', () => startCameraMode(enableBtn));
}

if (navGestureToggle) {
  navGestureToggle.addEventListener('click', () => {
    if (interactionMode === 'camera') {
      stopCameraMode();
      showToast('Camera stopped — Touch / Mouse controls active');
    } else {
      startCameraMode(navGestureToggle);
    }
  });
}

if (pipToggleBtn && cameraPip) {
  pipToggleBtn.addEventListener('click', () => {
    cameraPip.classList.add('minimized');
    if (pipReopenBtn) pipReopenBtn.classList.add('visible');
  });
}
if (pipReopenBtn && cameraPip) {
  pipReopenBtn.addEventListener('click', () => {
    cameraPip.classList.remove('minimized');
    pipReopenBtn.classList.remove('visible');
  });
}

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Render Loop ----
let prevTime = 0;
let bgStars = null;

function createBackgroundStars() {
  const geom = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < 4000; i++) {
    pos.push(
      (Math.random() - 0.5) * 1600,
      (Math.random() - 0.5) * 1600,
      (Math.random() - 0.5) * 1600
    );
  }
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x6f7ea3, size: 1.1, sizeAttenuation: true });
  bgStars = new THREE.Points(geom, mat);
  scene.add(bgStars);
}
createBackgroundStars();

function animate(time) {
  requestAnimationFrame(animate);

  const dt = prevTime ? Math.min((time - prevTime) / 1000, 0.05) : 0.016;
  prevTime = time;

  // Process gesture only if camera hand engine has results
  const cmd = interactionMode === 'camera' ? gestureRouter.process(handEngine.lastResults, dt) : null;

  if (interactionMode === 'camera') {
    if (!cmd) {
      setGestureIndicator('👋 No hand detected · Raise hand or drag with mouse/touch', false);
    } else if (cmd.fist) {
      setGestureIndicator('✊ Fist Detected · Expanding Cosmic Burst!', true);
    } else if (Math.abs(cmd.rotateY) > 0.015) {
      setGestureIndicator(`🖐 Open Palm · Rotating & Scaling (${Math.round(cmd.handDepth * 100)}%)`, true);
    } else {
      setGestureIndicator(`🖐 Hand Tracked · Scale ${Math.round(cmd.handDepth * 100)}% · Slide left/right to spin`, true);
    }
  }

  // Drive camera rig
  cameraRig.applyCommand(cmd);

  // Update current scene
  sceneHost.update(dt, cmd);

  // Slow background star rotation
  if (bgStars) bgStars.rotation.y += dt * 0.008;

  renderer.render(scene, camera);
}

// Start with first scene
switchScene('solar-system').then(() => {
  if (loaderEl) loaderEl.style.display = 'none';
});

animate(0);
