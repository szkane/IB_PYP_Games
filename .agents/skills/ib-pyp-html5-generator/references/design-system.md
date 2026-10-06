# Design System: Neobrutalism for Kids on iPad

House style for every game. Bold borders, hard shadows, candy colours, tactile presses. Copy tokens exactly so games feel like one product.

## Tokens

```css
:root {
  --bg: #FFFDF0;
  --ink: #111111;
  --yellow: #FFE156;
  --coral: #FF6584;
  --teal: #4ECDC4;
  --blue: #38B6FF;
  --purple: #B388FF;
  --green: #86EFAC;
  --white: #FFFFFF;
  --border: 3.5px solid var(--ink);
  --shadow: 4px 4px 0 var(--ink);
  --shadow-sm: 2px 2px 0 var(--ink);
  --radius: 14px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  padding: 14px 16px 36px;
}
.container { max-width: 900px; margin: 0 auto; }
```

## Tactile components

```css
.btn {
  min-height: 44px;
  padding: 10px 18px;
  background: var(--yellow);
  border: var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--ink); }
.btn:active { transform: translate(2px, 2px); box-shadow: var(--shadow-sm); }
.btn:focus-visible { outline: 3px solid var(--blue); outline-offset: 3px; }

.card {
  background: var(--white);
  border: var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px 18px;
}
.choice.correct { background: var(--green); }
.choice.wrong { background: var(--coral); animation: shake 0.3s; }
@keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
```

## Page skeleton

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Water Cycle Quest</title>
  <style>/* tokens + components + TTS CSS */</style>
</head>
<body>
  <div class="container">
    <nav class="nav-bar">
      <div class="nav-left">
        <a class="pyp-map-link" href="../index.html">← PYP Map</a>
        <span class="unit-tag">🌍 Grade 3 · Sharing the Planet</span>
      </div>
      <!-- TTS accent dropdown (references/tts-pattern.md) -->
    </nav>

    <header class="hero-card">
      <div class="hero-title">
        <h1>Water Cycle Quest 💧 <button class="btn-speaker" id="btnSpeakTitle" aria-label="Read aloud">🔊</button></h1>
      </div>
      <div class="stat-tray"><div class="stat-badge" id="badgeScore">⭐ 0</div></div>
    </header>

    <main class="arena-card card"><!-- play area --></main>
    <div class="feedback-banner" id="feedback" aria-live="polite"></div>
  </div>
  <div class="modal-overlay" id="winModal"><!-- celebration + Play Again --></div>
  <script>/* audio class, TTS_MANAGER, game state, init */</script>
</body>
</html>
```

```css
.nav-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.nav-left { display: flex; align-items: center; gap: 10px; }
.pyp-map-link {
  display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px;
  background: var(--yellow); color: var(--ink); text-decoration: none; font-weight: 900;
  border: var(--border); border-radius: var(--radius); box-shadow: var(--shadow);
}
.pyp-map-link:active { transform: translate(2px, 2px); box-shadow: var(--shadow-sm); }
.unit-tag { background: var(--coral); color: var(--white); border: var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 8px 14px; font-weight: 800; min-height: 44px; display: inline-flex; align-items: center; }
.hero-card { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.hero-title h1 { font-size: clamp(1.2rem, 2.5vw, 1.6rem); font-weight: 900; display: flex; align-items: center; gap: 10px; }
```

## Header rules

- One nav row + one compact hero. No eyebrow labels, no long subtitles, no sticky bars. The user removed these from `g2_vocabulary.html` because they ate iPad landscape height.
- Put the driving question or instructions inside the play area next to a 🔊 button, not in a tall header.

## iPad landscape rules

- Design for 1024×768 and 1180×820 first. The full activity (prompt, manipulative, choices, feedback) should fit with little or no scrolling.
- Use two-column layouts in landscape (manipulative left, controls/choices right) and stack under ~760px:

```css
.play-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
@media (max-width: 760px) { .play-grid { grid-template-columns: 1fr; } }
@media (orientation: landscape) and (max-height: 820px) {
  body { padding-top: 10px; }
  .hero-card { padding: 10px 14px; margin-bottom: 10px; }
}
```

- Touch targets ≥44px; `touch-action: manipulation` on buttons; `touch-action: none` on drag surfaces and canvases.
- Fixed sizes for boards and cards so feedback text never shifts the layout.
- Use `100dvh` rather than `100vh` for full-height layouts so Safari toolbars do not clip content.

## Visual content

- Prefer inline SVG manipulatives (clocks, protractors, scales, number lines, story cards) and emoji icons over plain text lists.
- Use progress gauges and badges (streak 🔥, score ⭐, stars) for visible progress.
- Celebration modal: big emoji badge, title, one-line learning takeaway, "Play Again 🔄".
