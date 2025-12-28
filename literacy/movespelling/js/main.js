/**
 * MoveSpell - Main Entry Point
 * Initializes Phaser game and all required modules.
 */

// Global instances
let handTracker = null;
let audioManager = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[MoveSpell] Initializing...');
  
  // Initialize Audio Manager
  audioManager = new AudioManager();
  
  // Show permission overlay
  const permissionOverlay = document.getElementById('permission-overlay');
  const permissionBtn = document.getElementById('permission-btn');
  const loadingScreen = document.getElementById('loading-screen');
  
  // Handle camera permission request
  permissionBtn.addEventListener('click', async () => {
    permissionOverlay.classList.add('hidden');
    loadingScreen.querySelector('.loading-text').textContent = 'Starting camera...';
    
    // Unlock audio on iOS/iPad (must be called on user interaction)
    console.log('[MoveSpell] Unlocking audio...');
    try {
      // This will now wait for the 'Welcome' speech to actually start
      await audioManager.unlockAudio();
      console.log('[MoveSpell] Audio unlock completed. Proceeding to camera.');
    } catch (err) {
      console.error('[MoveSpell] Audio unlock failed (non-critical):', err);
    }
    
    try {
      // Initialize hand tracker
      handTracker = new HandTracker();
      const videoElement = document.getElementById('camera-video');
      const previewElement = document.getElementById('camera-preview');
      
      // Initialize without debug canvas (we'll use video preview instead)
      await handTracker.init(videoElement, null);
      
      // Start camera (will throw error if fails)
      await handTracker.startCamera();
      
      // Share the same stream with preview element
      previewElement.srcObject = videoElement.srcObject;
      previewElement.play();
      
      // Keep camera preview hidden - we now show camera as full-screen background
      // Can be toggled with 'D' key for debugging
      
      // Load word data
      loadingScreen.querySelector('.loading-text').textContent = 'Loading vocabulary...';
      
      try {
        const response = await fetch('assets/data/words.json');
        const wordData = await response.json();
        
        // Start game
        loadingScreen.querySelector('.loading-text').textContent = 'Starting game...';
        initGame(wordData);
        
      } catch (error) {
        console.error('[MoveSpell] Failed to load word data:', error);
        loadingScreen.querySelector('.loading-text').textContent = 'Error loading data. Please refresh.';
      }
    } catch (cameraError) {
      // Show error message to user
      permissionOverlay.classList.remove('hidden');
      loadingScreen.classList.add('hidden');
      
      const errorMsg = document.createElement('p');
      errorMsg.className = 'permission-error';
      errorMsg.innerHTML = `
        <strong>⚠️ Camera Error</strong><br>
        ${cameraError.message}<br><br>
        <small>
          ${window.location.protocol === 'http:' && window.location.hostname !== 'localhost' 
            ? '📱 On iPad/iPhone, make sure you\'re using HTTPS or running on localhost.<br>' 
            : ''}
          Please check your browser settings and allow camera access for this site.
        </small>
      `;
      
      // Remove existing error message if any
      const existingError = permissionOverlay.querySelector('.permission-error');
      if (existingError) {
        existingError.remove();
      }
      
      permissionOverlay.appendChild(errorMsg);
      
      console.error('[MoveSpell] Camera initialization failed:', cameraError);
    }
  });
});

/**
 * Initialize Phaser game
 */
function initGame(wordData) {
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    transparent: true, // Make canvas transparent to show camera background
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
  
  // Store global references
  game.registry.set('wordData', wordData);
  game.registry.set('audioManager', audioManager);
  game.registry.set('handTracker', handTracker);
  
  // Set up hand tracking events
  const handCursor = document.getElementById('hand-cursor');
  
  handTracker.onHandUpdate = (data) => {
    game.events.emit('handUpdate', data);
    
    // Update hand cursor position and visibility
    if (data.state !== 'IDLE') {
      handCursor.style.left = data.position.x + 'px';
      handCursor.style.top = data.position.y + 'px';
      handCursor.classList.remove('hidden');
      handCursor.classList.add('detected');
      
      // Add grabbing class for FIST state
      if (data.state === 'FIST') {
        handCursor.classList.add('grabbing');
      } else {
        handCursor.classList.remove('grabbing');
      }
    } else {
      handCursor.classList.add('hidden');
      handCursor.classList.remove('detected', 'grabbing');
    }
  };
  
  handTracker.onStateChange = (newState, oldState) => {
    game.events.emit('handStateChange', newState, oldState);
  };
  
  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.classList.add('fade-out');
  
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 500);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
  
  // Toggle camera preview with 'D' key (debug)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      const preview = document.getElementById('camera-preview');
      preview.classList.toggle('hidden');
      handTracker.setDebugMode(!preview.classList.contains('hidden'));
    }
  });
  
  console.log('[MoveSpell] Game started!');
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
