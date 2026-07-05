This repository uses a lightweight, Vite-driven build system tailored for a monorepo of standalone HTML5 learning games. There is no Makefile, Dockerfile, or CI pipeline present; the entire build surface lives in package.json and vite.config.js.

What system/approach is used:
- Bundler: Vite 5 with Rollup under the hood. The project is an ES module (type: module).
- Minification: Terser via vite-plugin-minify with drop_console: false so runtime logs survive production builds.
- Static asset handling: A custom Vite plugin runs in closeBundle to copy per-game js/, css/, assets/, res/ trees and root PWA files (manifest.json, sw.js, icons) into dist/.
- CDN externalization: three, three/*, and any https:// import are marked external so they are loaded at runtime via script type="importmap" rather than bundled.

Key files and packages:
- package.json — declares scripts (dev, build, preview, qa:curriculum, qa:urls) and devDependencies (vite, vite-plugin-minify, javascript-obfuscator, three).
- vite.config.js — multi-entry discovery, static-copy plugin, minify/Terser options, output layout.
- scripts/generate-index.js — pre-build step that regenerates the hub index before bundling.
- scripts/qa-curriculum.js / scripts/list-qa-urls.js — QA helpers invoked from npm scripts.
- src/ — source tree organized by category (Chinese, literacy, math, science); each game is a self-contained directory with its own index.html.

Architecture and conventions:
- Multi-entry Rollup input: findHtmlFiles(src) recursively collects every .html under src; each becomes a Rollup entry whose name is the relative path with / replaced by _. This means adding a new game folder automatically produces a new bundle without touching config.
- Output layout mirrors source: root: 'src', outDir: '../dist', base: '/' preserves the category/game/index.html URL shape in dist/.
- Static assets copied verbatim: The copy-static-files plugin walks each game directory and copies known subdirs (js, css, assets, res) plus any other directory containing image/audio/video/json assets. Root-level PWA files are also duplicated into dist/ and dist/assets/ to satisfy the rewritten manifest.
- Pre/post hooks via npm scripts: npm run build first runs node scripts/generate-index.js, then npm run qa:curriculum, then vite build. QA checks gate the build.
- No CI / no containerization: No GitHub Actions workflows, Dockerfiles, or release tooling were found in the repo.

Rules developers should follow:
- Place each new game as a sibling directory under one of src/Chinese|literacy|math|science; it will be auto-discovered by the build.
- Keep non-module JS/CSS/images inside the game's js/, css/, assets/, or res/ directories so the copy plugin picks them up.
- Import Three.js and other libraries via CDN URLs (or importmap) rather than npm install-ed modules, since those paths are externalized.
- Run npm run build locally before committing; it will regenerate the hub index and run curriculum QA checks.
- If you add a new top-level static file needed by the PWA (e.g., another icon), add it to the staticFiles list in the copy-static-files plugin.