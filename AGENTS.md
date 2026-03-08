# AGENTS.md - Development Guide for IB PYP Games

## Project Overview

**Type**: Vite-based educational HTML5 games for IB PYP students  
**Stack**: Vanilla JavaScript, Three.js, Phaser, MediaPipe Hands, TailwindCSS  
**Structure**: Multi-game hub with category-based organization (Chinese, Literacy, Math, Science)

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Production build (auto-generates index.html + sw.js cache version)
npm run build

# Preview production build
npm run preview
```

**Build Process**: The `scripts/generate-index.js` script runs before Vite build to:
- Auto-generate `src/index.html` navigation page from all HTML game files
- Update `sw.js` cache version with timestamp for cache invalidation

**Running Individual Games**: Games are standalone HTML files in `src/{category}/`. Access directly via dev server:
- `http://localhost:5173/literacy/movespelling/index.html`
- `http://localhost:5173/science/solar_system.html`

**No test framework configured** - this is a visual/interactive game project. Manual testing in browser is the primary validation method.

---

## Project Structure

```
IB_PYP_Games/
├── scripts/
│   └── generate-index.js      # Auto-generates navigation & updates sw.js
├── src/
│   ├── index.html             # Auto-generated game hub (DO NOT EDIT MANUALLY)
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker for offline support
│   ├── icon-*.png             # PWA icons
│   ├── Chinese/
│   ├── literacy/
│   │   ├── movespelling/      # Full game subdirectory
│   │   │   ├── index.html
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   │   ├── main.js    # Entry point
│   │   │   │   ├── core/      # Reusable modules (audio, hand-tracker)
│   │   │   │   └── game/      # Phaser scenes
│   │   │   └── assets/
│   │   └── spelling_bee.html
│   ├── math/
│   └── science/
├── dist/                      # Build output (gitignored)
├── vite.config.js
└── package.json
```

---

## Code Style Guidelines

### JavaScript Style

**No TypeScript** - This is a vanilla JavaScript project with JSDoc for type hints.

#### Naming Conventions
```javascript
// Classes: PascalCase
class HandTracker { }
class AudioManager { }

// Variables/Functions: camelCase
let handTracker = null;
function initGame(wordData) { }

// Constants: UPPER_SNAKE_CASE
const CACHE_VERSION = '20260108123456';
const FIST_THRESHOLD = 0.08;

// Files: kebab-case (preferred) or snake_case
hand-tracker.js
audio-manager.js
scene-results.js
```

#### Imports & Module Pattern
```javascript
// ES Modules (type: "module" in package.json)
// No bundler imports for CDN libraries - use importmaps in HTML

// Global instances (when no bundler)
let handTracker = null;
let audioManager = null;

// JSDoc for type hints
/**
 * Initialize MediaPipe Hands and camera
 * @param {HTMLVideoElement} videoElement - Video element for camera feed
 * @param {HTMLCanvasElement} canvasElement - Canvas for debug drawing (optional)
 */
async init(videoElement, canvasElement = null) { }
```

#### Code Organization
```javascript
// 1. File header comment with purpose
/**
 * MoveSpell - Main Entry Point
 * Initializes Phaser game and all required modules.
 */

// 2. Global instances (if needed)
let handTracker = null;

// 3. DOMContentLoaded wrapper for DOM-dependent code
document.addEventListener('DOMContentLoaded', async () => {
  // Initialization code
});

// 4. Class definitions
class HandTracker {
  constructor() {
    // Properties first
    this.isTracking = false;
  }

  /**
   * Method with JSDoc
   */
  async init(videoElement) { }
}

// 5. Helper functions
function createParticleTexture(game) { }
```

#### Error Handling
```javascript
// Always log errors with context
try {
  await handTracker.startCamera();
} catch (cameraError) {
  console.error('[MoveSpell] Camera initialization failed:', cameraError);
  // Show user-friendly error to user
  permissionOverlay.appendChild(errorMsg);
}

// Graceful degradation for non-critical failures
try {
  await audioManager.unlockAudio();
} catch (err) {
  console.error('[MoveSpell] Audio unlock failed (non-critical):', err);
  // Continue execution - audio is optional
}
```

#### Async Patterns
```javascript
// Prefer async/await over .then()
document.addEventListener('DOMContentLoaded', async () => {
  await audioManager.unlockAudio();
  await handTracker.init(videoElement);
});

// Handle promises in parallel when independent
const [wordData, texture] = await Promise.all([
  fetch('assets/data/words.json').then(r => r.json()),
  loadTexture('player.png')
]);
```

---

### HTML Structure

```html
<!DOCTYPE html>
<html lang="zh-CN"> <!-- Match content language -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descriptive Title</title>
  
  <!-- PWA support -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#1a1a2e">
  
  <!-- CDN libraries via importmap (preferred for Three.js) -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <!-- Game container -->
  <div id="game-container"></div>
  
  <!-- UI overlays -->
  <div id="loading-screen">Loading...</div>
  
  <!-- Scripts at end -->
  <script type="module">
    import { main } from './main.js';
  </script>
</body>
</html>
```

---

### CSS Guidelines

```css
/* Use CSS custom properties for theming */
:root {
  --bg-primary: #0f0f1a;
  --accent-cyan: #00f5ff;
}

/* Utility classes for layout */
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

/* TailwindCSS allowed for quick prototypes */
/* Use <script src="https://cdn.tailwindcss.com"></script> */
```

---

## Development Patterns

### Game Architecture (Phaser)
```javascript
// Scene-based architecture
const config = {
  type: Phaser.AUTO,
  scene: [SetupScene, PlayScene, ResultsScene]
};

// Share data via game registry
game.registry.set('wordData', wordData);
game.registry.set('audioManager', audioManager);

// Access in scenes
const audioManager = this.game.registry.get('audioManager');
```

### MediaPipe Integration
```javascript
// Initialize with proper cleanup
class HandTracker {
  constructor() {
    this.animationFrameId = null; // Track for cleanup
  }

  async init(videoElement) {
    this.hands = new Hands({ /* options */ });
    this.hands.onResults((results) => this.onResults(results));
  }

  // Proper cleanup to prevent memory leaks
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
```

### Service Worker Cache Strategy
```javascript
// Cache version MUST be updated on each build
const CACHE_VERSION = '20260108123456'; // Auto-updated by generate-index.js

// Cache-first strategy for static assets
// Network-first for API calls (if any)
```

---

## Key Conventions

1. **No build step for games** - HTML files are standalone, served directly by Vite
2. **CDN for large libraries** - Three.js, MediaPipe loaded from CDN via importmap
3. **PWA-ready** - Every game should work offline after first load
4. **Mobile-first** - Touch events, responsive design, iOS Safari tested
5. **Camera/Mic permissions** - Always request on user interaction, never auto-start
6. **Error UX** - Show user-friendly messages, never leave user with broken UI

---

## Git Workflow

- `dist/` is gitignored - never commit build artifacts
- `src/index.html` is auto-generated - edits will be overwritten
- `.DS_Store` ignored (macOS)
- Create feature branches for new games
- Test on iPad/Safari before merging (primary target device)

---

## Adding a New Game

1. Create `src/{category}/your-game.html` (or subdirectory for complex games)
2. Add `<title>` tag - this becomes the game name in navigation
3. Run `npm run build` to auto-add to index.html
4. Test on localhost:5173 and iPad
5. Update PRD documentation if in `movespelling/prd.md` style

---

## Common Gotchas

- **iOS Audio**: Must unlock audio on user gesture (click/tap), not on load
- **HTTPS for Camera**: Camera API requires HTTPS (or localhost for dev)
- **Vite Root**: `root: 'src'` in vite.config.js - all paths relative to src/
- **Import External**: Three.js marked as external in rollup config - use CDN import
- **Minification**: Build uses terser + custom minify plugin - test production builds

---

## Linting & Quality

**No linter configured** - follow existing code patterns in:
- `src/literacy/movespelling/js/` for game architecture
- `src/science/` for Three.js examples
- Match indentation (2 spaces), semicolons, and JSDoc style

---

## Contact & Support

For questions about specific games, check:
- `README.md` - Project overview
- `QWEN.md` / `GEMINI.md` - AI assistant context
- Individual game `prd.md` files - Product requirements
