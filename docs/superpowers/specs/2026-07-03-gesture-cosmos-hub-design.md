# Gesture Cosmos Exploration Hub - Design

- **Date**: 2026-07-03
- **Status**: Approved (user-approved in brainstorm)
- **Scope**: Merging 6 standalone science games into one gesture-driven cosmos exploration shell with a navigation bar.

## Goal

Merge the following six standalone HTML games under `src/science/` into a single gesture-controlled cosmos exploration hub with a navigation bar for switching between scenes:

1. `g1_solar_system.html` — Three.js solar system (mouse OrbitControls, no camera/gesture)
2. `g1_3D_camara_solar.html` — NEON PLANETS particle engine
3. `g1_3D_camara_galaxy.html` — Ultimate Galaxy Engine (spiral)
4. `g1_3D_camara_galaxy2.html` — Crystal Galaxy
5. `g1_3D_camara_milkyway.html` — Milky Way Gesture Control
6. `g1_3D_camara_obj.html` — Hand-Controlled Particle System / shape & motion

All six already use Three.js (and five of them also use MediaPipe Hands), but each initializes its own renderer/camera/MediaPipe pipeline and re-declares boilerplate. The hub consolidates these shared systems and exposes an in-page navigation bar to switch between scenes.

## User-Approved Decisions

These choices were confirmed one-by-one with the user during brainstorming:

1. **Navigation vs gesture division of labor**: The top navigation bar switches the 6 sub-scenes (mouse/touch click); MediaPipe gestures drive only the 3D content within the current scene. The navigation bar always stays clickable (no gesture switching). Simplest and most reliable.
2. **Merge approach**: Create a new shell page (`gesture-cosmos-hub.html`) plus a modular directory `gesture-cosmos/` that holds the 6 scenes extracted as ES modules with a shared core. Avoid inline copy-paste and avoid `iframe` embedding.
3. **Gesture unification**: All 6 scenes share a single gesture → command mapping (orbit / pinch-zoom / reset / select). Drop per-game idiosyncratic gesture logic in favor of one consistent mental model.
4. **Original file handling**: Remove the 6 originals from `src/science/` (move to `src/science/_archive/`). Update `src/data/curriculum-map.json` so the 6 entries collapse into a single card pointing to the hub. Avoid duplicate navigation.
5. **solar_system gesture integration**: Originally mouse-only. In the hub, it adopts the same unified gesture mapping as the other 5 scenes (no exception).
6. **Performance on scene switch**: Destroy-and-rebuild. Switching disposes the previous scene's geometries/materials/textures and clears their render-loop updates, then constructs the next. Lower memory, cleanest lifetime management.

## Scope Boundaries

In-scope:
- One new shell page `src/science/gesture-cosmos-hub.html`.
- One new directory `src/science/gesture-cosmos/` with 4 core modules + 6 scene modules.
- Reuse of asset URLs (textures) already referenced by the originals — no new CDN assets.
- Update `src/data/curriculum-map.json` to replace 6 entries with 1 hub card.
- Run `npm run qa:curriculum` and `npm run build` to validate.

Out-of-scope:
- `g1_3D_camera_blueball.html` and `g1_3D_camera_dragonball.html` stay as-is (not in user's list of 6).
- Themes other than the existing dark-cosmos look — no restyling beyond what's needed to integrate.
- New curriculum categories/grades — changes are local to Grade 1 science.
- Build-pipeline changes beyond what's already in `vite.config.js`.

## Architecture

```
src/science/
├── gesture-cosmos-hub.html              # Shell: nav bar + public container + importmap
├── gesture-cosmos/                      # Resource dir for the merged game
│   ├── main.js                          # Entry: renderer/scene/camera, wire nav, scene dispatch
│   ├── core/
│   │   ├── hand-engine.js               # Public MediaPipe Hands core (singleton)
│   │   ├── gesture-router.js            # Gesture → unified commands (orbit/zoom/select/reset)
│   │   ├── camera-rig.js                # Unified camera orbit rig (gestures + mouse fallback)
│   │   └── scene-host.js                # Scene lifecycle: init/dispose/switch
│   └── scenes/
│       ├── scene-solar-system.js        # From g1_solar_system, gains gesture support
│       ├── scene-neon-planets.js        # From g1_3D_camara_solar
│       ├── scene-galaxy-spiral.js       # From g1_3D_camara_galaxy
│       ├── scene-crystal-galaxy.js      # From g1_3D_camara_galaxy2
│       ├── scene-milky-way.js           # From g1_3D_camara_milkyway
│       └── scene-shape-motion.js        # From g1_3D_camara_obj
└── _archive/                            # Original 6 HTML files moved here (kept for reference)
    ├── g1_solar_system.html
    ├── g1_3D_camara_solar.html
    ├── g1_3D_camara_galaxy.html
    ├── g1_3D_camara_galaxy2.html
    ├── g1_3D_camara_milkyway.html
    └── g1_3D_camara_obj.html
```

### Public layer (gesture-cosmos/core)

`main.js` builds **one** `THREE.WebGLRenderer`, **one** `THREE.PerspectiveCamera`, and **one** shared `THREE.Scene`. A single `requestAnimationFrame` loop drives `scene-host.update(dt, command)` each frame. The renderer/camera are reused across scenes; per-scene objects (lights, geometry, particle systems) are added by each scene's `init()` and removed by its `dispose()`.

`hand-engine.js` wraps MediaPipe Hands + camera feed as a singleton; it publishes `handResults` to `gesture-router`. Not started until a user gesture (per iOS audio/camera rules) acknowledges permission.

`gesture-router.js` consumes landmark results and produces a normalized command stream:

| Command | Payload | Trigger |
|---|---|---|
| `orbit` | `{dx, dy}` | Palm position delta (single hand) |
| `zoom` | `{factor}` | Thumb↔index pinch distance (single hand) |
| `reset` | — | Open 5-finger palm held ~0.6s |
| `select` | `{screen:{x,y}}` | Index finger pointing held ~0.8s (point into viewport) |
| `null` | — | No hand present → router emits `null`, mouse OrbitControls takes over |

`camera-rig.js` is the single source of camera state (similar to `OrbitControls` but gesture-aware). It exposes `applyOrbit(dx,dy)`, `applyZoom(factor)`, `reset()` and frames the focused target. Each scene only needs to handle `update(dt, command)` and decide what to do on `select` (e.g., solar system focuses a planet; particle scenes can ignore it or pin a particle).

`scene-host.js` exposes:

```js
export const Scene = {
  name,            // unique scene key
  init(ctx),       // ctx = { scene, camera, renderer, textureLoader, hand: HandEngine }
  update(dt, cmd), // called each frame; cmd from gesture-router (may be null)
  dispose(),       // release all non-shared objects: geometries/materials/textures removed from scene
};
```

`scene-host.switchTo(name)` calls `prev.dispose()` (if any), then `next.init(ctx)`. A blanket `scene.clear()` is **not** used — only what `init` added is removed in `dispose`, so the shared camera/renderer/background SDK contract stays intact.

### Per-scene responsibilities

Each scene is a single JS module exporting the `Scene` interface. The body of each scene is a faithful port of the original game's Three.js setup; only the input handling is replaced with consumption of the unified command stream.

- **scene-solar-system.js**: keeps AU/SIZES/ORBITS/SPEEDS/COLORS/TEXTURES from `g1_solar_system.html`. Builds sun + 8 planets + moons + Saturn ring + orbit lines per the original. The original "control buttons" become optional sub-buttons; on `select`, raycasts and focuses a planet (matches the original focusOnObject behavior). The original focus button row can be hidden by default and exposed via the existing UI controls panel.
- **scene-neon-planets.js**: docs particles + neon planet visuals from `g1_3D_camara_solar.html`; gesture drives the same particle parameters the original did (orbit position, color cycle) — but via the unified `orbit` / `zoom` commands.
- **scene-galaxy-spiral.js**: spiral galaxy particle field from `g1_3D_camara_galaxy.html`. Pinch zoom now scales camera distance; orbit pans the galaxy; `reset` returns to gallery view.
- **scene-crystal-galaxy.js**: crystal/particle variant from `g1_3D_camara_galaxy2.html`. Same treatment.
- **scene-milky-way.js**: milk-way model from `g1_3D_camara_milkyway.html`. Same.
- **scene-shape-motion.js**: shape/scene switching lab from `g1_3D_camara_obj.html`. Each scene-specific `update(dt, cmd)` mirrors the original's gesture handling but in the unified command shape.

### UI

- **Top nav bar**: 6 buttons in pill style; the active scene is highlighted. Responsive: wraps on narrow viewports (mobile/iPad portrait).
- **Right: PYP Map return link** — reuses project's `.pyp-map-link` style block so it matches every other game.
- **Loading overlay**: `LoadingManager` callbacks update a centered overlay; same UX as original `g1_solar_system.html`.
- **Camera video debug**: hidden by default; add `?debug=1` query param to show a small picture-in-picture of the camera feed in the bottom-right corner.
- **Camera permission overlay**: a modal that asks for camera permission only on first user click / explicit "Enable gestures" button. Falls back to mouse OrbitControls on deny.

### Error handling / degradation

- MediaPipe script load failure → console.error + show non-blocking toast; fallback to OrbitControls-only; nav still works.
- Camera permission denied → same degradation; user gets a hint toast.
- Single scene `init()` throw → caught in `scene-host.switchTo`; restore navBar to last known good scene, show scene-specific "unavailable" placeholder, do **not** crash the hub.
- Texture load failures per scene — surfaces the existing per-scene fallback (e.g., `MeshStandardMaterial` with color) already present in the original games.

## Testing

No test framework. Manual validation matrix:

1. `npm run dev` → open `http://localhost:5173/science/gesture-cosmos-hub.html`.
2. Click each of the 6 nav buttons: scene swaps, previous scene's objects are gone, no console errors accumulate.
3. With camera granted: pinch-zoom, palm-orbit, open-palm reset all work in every scene; in solar system, index-finger point + hold selects a planet and the camera focuses it.
4. Without camera: mouse OrbitControls (drag + wheel) works in every scene.
5. iPad Safari (landscape): nav bar wraps correctly, gestures responsive.
6. `npm run qa:curriculum` — passes; the single hub card validates and the removed paths no longer exist (QA's missing-path check should still pass because we replace rather than orphan).
7. `npm run build` — regenerates `src/index.html` and bumps `sw.js` cache version; the hub appears under Grade 1 science.

## Risks / Open Items

- **MediaPipe timing**: gesture→command smoothing (e.g., debounce `reset` 0.6s, `select` 0.8s) needs empirical tuning during implementation. Document the chosen thresholds in `gesture-router.js`.
- **Per-scene gesture semantics loss**: dropping each original's custom gesture mapping may subtly change how the particle scenes "feel". Mitigation: keep each scene's `update` free to ignore commands it doesn't care about, and tune the unified commands so the particle scenes' parameter space is still reachable.
- **Vite root**: `vite.config.js` uses `root: 'src'`. Hub HTML lives at `src/science/gesture-cosmos-hub.html`, accessed at `/science/gesture-cosmos-hub.html`. Module imports inside the hub use relative paths (`./gesture-cosmos/main.js`) — same convention used by `movespelling`.

## Implementation Outline

1. Create `src/science/gesture-cosmos/` and write 4 core modules (`hand-engine.js`, `gesture-router.js`, `camera-rig.js`, `scene-host.js`).
2. Port 6 originals into scene modules. Keep each under ~300 lines; reuse original inline logic where possible, only swapping input handling.
3. Write `src/science/gesture-cosmos-hub.html` (importmap, nav bar, container, module entry).
4. Move 6 originals to `src/science/_archive/`.
5. Edit `src/data/curriculum-map.json`: remove the 6 cards, add 1 card `"Gesture Cosmos Exploration Hub"` → `science/gesture-cosmos-hub.html`.
6. Run `npm run qa:curriculum`, `npm run build`; manual walkthrough on desktop + iPad Safari.

(End of spec — implementation plan to follow via writing-plans skill.)
