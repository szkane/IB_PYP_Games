This monorepo does not use a shared frontend style system. Each learning game is a self-contained HTML5 app that ships its own stylesheet(s) and fonts, resulting in several independent visual identities rather than one unified design language.

**Approach per game**
- **MoveSpell** (`src/literacy/movespelling/css/style.css`) — child-friendly theme built on CSS custom properties (`:root` variables for colors, spacing, font sizes via `clamp()`). Supports two named themes via body class (`body.theme-fantasy`). Uses Google Fonts (Fredoka + Nunito), heavy use of `box-shadow`/`border` for a "sticker" look, and explicit media queries for iPad landscape/portrait plus 2K/4K breakpoints.
- **WordQuest** (`src/literacy/wordquest/css/style.css`) — Duolingo-inspired palette defined in `:root` (`--bg`, `--ink`, `--accent`, `--good`, `--bad`, `--star`, `--shadow`, `--radius`). Consistent card/button system using thick borders + offset shadows, grid-based layouts, and responsive breakpoints at 820px / 640px.
- **MC Words** (`src/literacy/mc_words/css/mc_words_styles.css`) — Minecraft pixel-art aesthetic with a repeating background image, green/gold/brown palette, pixelated images (`image-rendering: pixelated`), and extensive iPad mini portrait/landscape overrides.
- **Single-file games** under `src/math/`, `src/science/`, `src/Chinese/` — many are single `.html` files that either inline styles or load Tailwind CSS from the CDN (`https://cdn.tailwindcss.com`) directly in the `<head>`. A few import Google Fonts inline.

**No build-time CSS pipeline**
There is no PostCSS, Sass, Tailwind config, or CSS-in-JS setup. Styles are plain `.css` files referenced via `<link>` tags, or Tailwind loaded at runtime from CDN. The Vite config at the repo root exists but is not used to bundle CSS; each game is served as-is.

**Design tokens & theming**
Tokens live inside each game's CSS file as `:root` variables — there is no cross-app token registry. Themes are switched by toggling a body class (e.g. `theme-fantasy`) rather than through a centralized theme engine.

**Responsive strategy**
- Mobile-first where applicable, but most games rely on explicit `@media` blocks for tablet landscape/portrait and large desktops (1024px, 768px, 480px, 2560px, 3840px).
- Font sizing uses `clamp()` in MoveSpell; WordQuest uses fixed rem values with breakpoint adjustments.
- Touch-friendly defaults: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, large hit targets.

**Conventions developers should follow**
1. Keep styles scoped to the game directory — do not share CSS across games unless you introduce a common package.
2. Use CSS custom properties (`:root`) for colors, spacing, and typography so new themes can be added by overriding variables.
3. Prefer `clamp()` for fluid typography/sizing when building new interactive scenes.
4. For quick prototypes, Tailwind CDN is acceptable, but prefer a dedicated `.css` file with variables for consistency with existing games.
5. Include iPad portrait/landscape media queries early — many games target this viewport explicitly.