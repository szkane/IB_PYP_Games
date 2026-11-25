/**
 * MoveSpell - Main Entry Point
 * Initializes Phaser game in either Hand-Tracking Camera Mode or Touch / Mouse Mode.
 */

let handTracker = null;
let audioManager = null;

async function fetchWordData() {
  const response = await fetch('assets/data/words.json?v=20261125');
  return response.json();
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[MoveSpell] Initializing...');

  audioManager = new AudioManager();

  const permissionOverlay = document.getElementById('permission-overlay');
  const permissionBtn = document.getElementById('permission-btn');
  const touchModeBtn = document.getElementById('touch-mode-btn');
  const loadingScreen = document.getElementById('loading-screen');

  // Touch / Mouse Mode — enters immediately with zero camera prompt
  if (touchModeBtn) {
    touchModeBtn.addEventListener('click', async () => {
      permissionOverlay.classList.add('hidden');
      loadingScreen.style.display = 'flex';
      loadingScreen.classList.remove('fade-out', 'hidden');
      loadingScreen.querySelector('.loading-text').textContent = 'Preparing Touch & Mouse mode...';

      try {
        await audioManager.unlockAudio();
      } catch (err) {
        console.error('[MoveSpell] Audio unlock failed (non-critical):', err);
      }

      try {
        loadingScreen.querySelector('.loading-text').textContent = 'Loading vocabulary...';
        const wordData = await fetchWordData();
        loadingScreen.querySelector('.loading-text').textContent = 'Starting game...';
        initGame(wordData, { playMode: 'touch' });
      } catch (error) {
        console.error('[MoveSpell] Failed to load word data:', error);
        loadingScreen.querySelector('.loading-text').textContent = 'Error loading data. Please refresh.';
      }
    });
  }

  // Camera Hand-Tracking Mode
  if (permissionBtn) {
    permissionBtn.addEventListener('click', async () => {
      permissionOverlay.classList.add('hidden');
      loadingScreen.style.display = 'flex';
      loadingScreen.classList.remove('fade-out', 'hidden');
      loadingScreen.querySelector('.loading-text').textContent = 'Starting camera...';

      try {
        await audioManager.unlockAudio();
      } catch (err) {
        console.error('[MoveSpell] Audio unlock failed (non-critical):', err);
      }

      try {
        handTracker = new HandTracker();
        const videoElement = document.getElementById('camera-video');
        const previewElement = document.getElementById('camera-preview');

        await handTracker.init(videoElement, null);
        await handTracker.startCamera();

        previewElement.srcObject = videoElement.srcObject;
        previewElement.play();

        loadingScreen.querySelector('.loading-text').textContent = 'Loading vocabulary...';
        const wordData = await fetchWordData();

        loadingScreen.querySelector('.loading-text').textContent = 'Starting game...';
        initGame(wordData, { playMode: 'camera' });
      } catch (cameraError) {
        permissionOverlay.classList.remove('hidden');
        loadingScreen.style.display = 'none';

        const errorMsg = document.createElement('p');
        errorMsg.className = 'permission-error';
        errorMsg.innerHTML = `
          <strong>⚠️ Camera Unavailable</strong><br>
          ${cameraError.message}<br>
          <small>
            You can tap <strong>👆 Play with Touch / Mouse</strong> above to play right away without a camera!
          </small>
        `;

        const existingError = permissionOverlay.querySelector('.permission-error');
        if (existingError) existingError.remove();
        const inner = permissionOverlay.querySelector('.permission-inner') || permissionOverlay;
        inner.appendChild(errorMsg);

        console.error('[MoveSpell] Camera initialization failed:', cameraError);
      }
    });
  }
});

/**
 * Initialize Phaser game
 * @param {Object} wordData
 * @param {{ playMode: 'camera' | 'touch' }} opts
 */
function initGame(wordData, { playMode = 'touch' } = {}) {
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [SetupScene, PlayScene, ResultsScene]
  };

  const game = new Phaser.Game(config);

  game.registry.set('wordData', wordData);
  game.registry.set('audioManager', audioManager);
  game.registry.set('handTracker', handTracker);
  game.registry.set('playMode', playMode);

  // Only emit hand events when camera tracking is active — Phaser scenes render the single clean cursor
  if (playMode === 'camera' && handTracker) {
    handTracker.onHandUpdate = (data) => {
      game.events.emit('handUpdate', data);
    };

    handTracker.onStateChange = (newState, oldState) => {
      game.events.emit('handStateChange', newState, oldState);
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        const preview = document.getElementById('camera-preview');
        if (preview) {
          preview.classList.toggle('hidden');
          handTracker.setDebugMode(!preview.classList.contains('hidden'));
        }
      }
    });
  }

  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 450);

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  console.log(`[MoveSpell] Game started in ${playMode} mode!`);
}

/**
 * Create a simple particle texture if not already loaded
 */
function createParticleTexture(game) {
  const graphics = game.make.graphics();
  graphics.fillStyle(0xffffff);
  graphics.fillCircle(8, 8, 8);
  graphics.generateTexture('particle', 16, 16);
  graphics.destroy();
}
