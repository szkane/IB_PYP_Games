This repository does not implement a centralized logging system. There is no dedicated logger module, no logging framework dependency (no winston, pino, bunyan, debug, etc.), and no shared logging utility across the codebase.

**What exists instead:**
- Scattered `console.log`, `console.warn`, and `console.error` calls embedded directly in game source files (e.g., `src/literacy/movespelling/js/core/audio-manager.js`, `src/literacy/mc_words/js/app.js`).
- These calls are ad-hoc, per-file, with no unified level strategy, no structured fields, and no sink configuration.
- The only Node-side logging appears in build/agent scripts under `.agents/skills/minecraft-wiki-extractor/scripts/`, which also use bare `console.log` / `console.error` for CLI output.

**Why this category doesn't apply:**
The project is a collection of standalone browser-based HTML5 learning games built with Vite. Runtime logging is limited to developer-facing `console.*` statements sprinkled throughout individual game modules. There is no cross-cutting logging infrastructure, no log-level management, no structured log format, and no routing of logs to sinks or remote collectors. This is simply an absence of a logging system rather than an implemented one.