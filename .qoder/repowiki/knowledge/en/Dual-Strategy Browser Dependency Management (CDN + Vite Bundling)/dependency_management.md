This monorepo uses a hybrid dependency strategy split between two delivery modes, each with its own versioning and update model.

**1. Standalone HTML5 games — runtime CDN imports**
Most single-file games under `src/{Chinese,literacy,math,science}/*.html` load third-party libraries directly from CDNs via `<script src>` tags or an `<script type="importmap">`. The primary sources are:
- `cdn.jsdelivr.net/npm/` for Three.js (`0.163.0`), MediaPipe Hands/Camera Utils, Phaser (`3.60.0`), pinyin-pro (`3.19.0`), GSAP (`3.12.5`)
- `unpkg.com` for React 18 UMD bundles and Babel standalone (used only by `g1_Kangaroo_Math.html`)
- `cdnjs.cloudflare.com` for legacy Three.js r128 and Tween.js (found in older science/_archive pages)
- `cdn.tailwindcss.com` for the Tailwind Play CDN (development-time CSS framework)

There is no centralized manifest for these runtime dependencies; versions are pinned inline per HTML file. This means different games can reference different major/minor versions of the same library (e.g., Three.js 0.128 vs 0.163) without build-time conflict resolution.

**2. Build-time toolchain — npm + lockfile**
The repository root declares a single `package.json` with `type: "module"` and four devDependencies:
- `vite@^5.0.0` — multi-page bundler that discovers every `.html` under `src/` as a Rollup input
- `three@^0.163.0` — kept in sync with the runtime importmap version used by the gesture-cosmos hub
- `javascript-obfuscator@^4.1.0` and `vite-plugin-minify@^1.5.2` — minification pipeline
- A `package-lock.json` at the repo root pins exact transitive versions.

`vite.config.js` externalizes `three`, `three/*`, and any `https://` URL so those modules are never bundled — they continue to be loaded at runtime from the CDN importmap defined in the HTML. A custom `closeBundle` plugin copies static assets (`manifest.json`, `sw.js`, icons, plus per-game `js/`, `css/`, `assets/`, `res/`) into `dist/`.

**Conventions and constraints**
- Runtime ESM libraries (Three.js, MediaPipe) use an `importmap` pointing at a fixed jsDelivr tag; changing the version requires editing the HTML template.
- Legacy UMD libraries (React, old Three.js r128) are loaded via unpkg/cdnjs script tags and cannot be tree-shaken.
- Tailwind is intentionally left on the Play CDN for rapid iteration; it is not part of the production bundle.
- No vendoring, private registry, or `overrides`/`resolutions` field exists; all packages resolve from public registries.