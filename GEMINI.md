# Gemini Context: IB PYP Games

## Project Overview

**IB PYP Games** is a collection of interactive educational web games designed for students in the International Baccalaureate (IB) Primary Years Programme (PYP). The project covers multiple subjects including Chinese, Literacy, Math, and Science.

It acts as a static web application where the main entry point (`index.html`) dynamically lists available games. Some games, like "MoveSpell", are sophisticated Single Page Applications (SPAs) utilizing computer vision (MediaPipe) and game engines (Phaser 3), while others are simpler HTML5 implementations.

## Key Technologies

*   **Core:** HTML5, CSS3, JavaScript (ES Modules)
*   **Build Tooling:** [Vite](https://vitejs.dev/)
*   **Game Engines/Libraries:**
    *   **Phaser 3:** Used for 2D game physics and rendering (e.g., in MoveSpell).
    *   **MediaPipe:** Used for hand tracking and gesture recognition.
    *   **Three.js:** Used for 3D visualizations (e.g., Solar System, Galaxy demos).
*   **PWA:** Service Worker (`sw.js`) and Manifest (`manifest.json`) for offline capabilities.

## Architecture

### Directory Structure

The `src` directory is organized by subject. Each HTML file in a subject folder represents a game or a demo.

```text
/
├── scripts/
│   └── generate-index.js   # Script to scan src/ and build the main index.html
├── src/
│   ├── index.html          # Auto-generated landing page
│   ├── sw.js               # Service Worker for caching
│   ├── Chinese/            # Chinese language games
│   ├── literacy/           # English literacy games
│   │   └── movespelling/   # "MoveSpell" - A complex game with its own assets/js
│   ├── math/               # Math games
│   └── science/            # Science demos (Solar system, 3D camera tests)
├── dist/                   # Production build output
└── vite.config.js          # Vite configuration
```

### Build Process

The build process involves two main steps:
1.  **Index Generation:** `scripts/generate-index.js` scans the `src` directory for HTML files and generates the root `src/index.html` with links to all games. It also updates the Service Worker cache list.
2.  **Vite Build:** Vite bundles the application, minifies assets, and handles static file copying (via a custom plugin in `vite.config.js`).

### Game Specifics: MoveSpell

The "MoveSpell" game (`src/literacy/movespelling/`) is a flagship example of a "Zero Touch" interactive game.
*   **Docs:** `src/literacy/movespelling/prd.md` contains detailed specs.
*   **Config:** `assets/data/words.json` allows for external configuration of vocabulary.
*   **Architecture:** Pure client-side, using MediaPipe for hand gestures to control the UI and gameplay.

## Development Workflow

### Prerequisites

*   Node.js (version capable of running Vite 5)
*   npm

### Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server using Vite. |
| `npm run build` | Generates `src/index.html` and builds the production version to `dist/`. |
| `npm run preview` | Locally previews the production build. |

### Adding a New Game

1.  Create a new HTML file in the appropriate subject folder under `src/` (e.g., `src/math/new-game.html`).
2.  (Optional) If the game has many assets, create a subdirectory (e.g., `src/math/new-game/index.html`) and put assets there.
3.  Run `npm run build` (or just `node scripts/generate-index.js`) to regenerate the main index and include your new game.

## Conventions

*   **No Backend:** The project is designed to be static-hostable. All logic must run in the browser.
*   **Asset Management:** Large assets or game-specific logic should be kept close to the game file (e.g., in a subdirectory) rather than in a global assets folder, to keep things modular.
*   **Service Worker:** Remember that `sw.js` caches files. If you change a file and don't see the update, you might need to refresh the Service Worker or clear the cache.
