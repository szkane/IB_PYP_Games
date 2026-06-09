---
name: kids-html5-generator
description: Build or improve kid-friendly HTML5 educational games for this IB PYP Games project. Use this skill whenever the user asks for a new learning game, UOI activity, curriculum-aligned practice tool, child-facing interactive page, or gamified math/science/literacy/Chinese activity for ages 6-12, even if they do not say "HTML5" or "game." In this repo, route new Unit of Inquiry work through standalone files in src/uoi/, update src/data/curriculum-map.json instead of src/index.html, and verify with npm run qa:curriculum plus visual browser checks when possible.
---

# Kids HTML5 Generator for IB PYP Games

Create polished, age-appropriate HTML5 learning games for the IB PYP Games repo. This project is a Vite-served curriculum hub organized as Grade -> Unit of Inquiry -> Subject lane -> Game, so a good game is not just fun: it must fit the curriculum map, work on iPad landscape and desktop, and pass the repo QA checks.

## Project Fit

Start by locating the game in the curriculum:

- Grade and unit, especially Grade 1 Units 1-5 when the request is UOI-focused.
- Subject lane: `uoi`, `literacy`, `math`, `science`, or `chinese`.
- Learning objective, central idea connection, learner profile or ATL skill when relevant.
- Target age band: 6-8, 9-10, or 11-12.

For a new Unit of Inquiry activity, prefer a single standalone file in `src/uoi/your_game_name.html` with embedded CSS and JavaScript. For larger existing game families, follow the local folder pattern under `src/literacy/`, `src/math/`, `src/science/`, or `src/Chinese/`.

Do not manually edit `src/index.html`; it is generated from `src/data/curriculum-map.json`.

## Implementation Workflow

1. Read nearby examples before building:
   - New standalone UOI examples: `src/uoi/*.html`
   - Larger game architecture: `src/literacy/movespelling/`
   - Three.js examples: `src/science/`
   - Curriculum source: `src/data/curriculum-map.json`

2. Create or edit the game file:
   - Keep new UOI games standalone: embedded CSS and JS, no external script or stylesheet tags.
   - Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
   - Include a visible `PYP Map` return link. Use `href="../index.html"` from `src/uoi/` and adjust depth for other folders.
   - Match the document language to the content, for example `lang="en"` or `lang="zh-CN"`.
   - Use 2-space indentation, semicolons in JavaScript, camelCase names, and clear error logging.

3. Register the game:
   - Add or update the entry in `src/data/curriculum-map.json`.
   - Use `path` for the actual file and `href` when a game needs a unit-specific query string.
   - Write a short, curriculum-facing `description`; it should explain the learning activity, not the implementation.

4. Verify:
   - Run `npm run qa:curriculum`.
   - Run `npm run build` when the curriculum map, service worker, or generated homepage may be affected.
   - Start `npm run dev` and test the game URL directly, for example `http://localhost:5173/uoi/your_game_name.html`.
   - Use browser screenshots or manual checks at desktop, iPad landscape, and small viewport sizes when possible.

## Game Design Principles

Design for a real child using touch:

- Use large targets. Buttons, cards, draggable items, and key controls should be at least 44px tall/wide.
- Keep the first screen playable. Avoid landing-page framing; show the activity immediately with compact status and controls.
- Provide immediate, specific feedback. Tell the learner what worked and what to try next.
- Make failure low-stakes. Offer retry, hint, example, or reset paths without harsh "game over" states.
- Keep text age-appropriate. Ages 6-8 need short prompts and visual choices; ages 9-12 can handle more strategy and explanation.
- Celebrate progress, effort, and completion with motion or visual rewards that do not block play for too long.
- Avoid timed pressure for younger learners unless the user explicitly asks for it.

For PYP-aligned work, prefer mechanics that model inquiry:

- Sort or match evidence, roles, needs, actions, or responsibilities.
- Sequence events, story parts, lifecycle stages, or goal steps.
- Make choices and explain consequences.
- Build a pattern, diagram, route, cycle, or system.
- Reflect briefly after completion with one learner-friendly takeaway.

## Technical Patterns

Use vanilla JavaScript unless an existing game family already uses a library. For a standalone UOI file, keep state simple and local:

```javascript
const gameState = {
  score: 0,
  round: 0,
  attempts: 0,
  completed: false
};

function showFeedback(message, tone = "neutral") {
  const feedback = document.querySelector("#feedback");
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}
```

Prefer event listeners over inline handlers:

```javascript
document.querySelectorAll("[data-choice]").forEach((button) => {
  button.addEventListener("click", () => chooseAnswer(button.dataset.choice));
});
```

For audio, camera, or speech:

- Request permissions only after a user tap/click.
- Unlock audio on a user gesture for iOS Safari.
- Treat audio as enhancement; the game should still work if audio fails.
- Log errors with context and show friendly fallback text.

For layout:

- Use CSS custom properties for theme colors.
- Use stable dimensions for boards, cards, counters, and controls so feedback text cannot resize the layout.
- Use `touch-action: manipulation` on interactive surfaces when appropriate.
- Avoid nested cards and decorative page sections; games should feel like direct tools for play.

## Standalone UOI HTML Skeleton

Use this shape for new `src/uoi/` activities, adapting the theme and mechanics:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goal Steps Quest</title>
  <style>
    :root {
      --bg: #f6fbff;
      --ink: #19324d;
      --panel: #ffffff;
      --accent: #2563eb;
      --good: #15803d;
      --warn: #b45309;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, sans-serif;
      color: var(--ink);
      background: var(--bg);
    }

    .map-link {
      position: fixed;
      top: 12px;
      left: 12px;
      min-height: 44px;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      text-decoration: none;
      box-shadow: 0 2px 10px rgba(25, 50, 77, 0.14);
      z-index: 10;
    }

    main {
      width: min(960px, 100%);
      margin: 0 auto;
      padding: 72px 18px 24px;
    }

    button {
      min-height: 44px;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      touch-action: manipulation;
    }

    button:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 3px;
    }
  </style>
</head>
<body>
  <a class="map-link" href="../index.html">PYP Map</a>
  <main>
    <header>
      <h1>Goal Steps Quest</h1>
      <p>Choose three small actions that help the learner reach the goal.</p>
    </header>

    <section aria-label="Game board">
      <div id="board"></div>
      <p id="feedback" aria-live="polite"></p>
    </section>
  </main>

  <script>
    const gameState = {
      score: 0,
      selected: []
    };

    function initGame() {
      // Render activity and bind events.
    }

    document.addEventListener("DOMContentLoaded", initGame);
  </script>
</body>
</html>
```

## Curriculum Map Entry Pattern

Add entries under the appropriate grade/unit/subject:

```json
{
  "title": "Goal Steps Quest",
  "path": "uoi/goal_steps_quest.html",
  "type": "New",
  "description": "Choose small actions that help a learner reach a school goal."
}
```

When reusing an existing game for a unit-specific launch:

```json
{
  "title": "Spelling Bee for IB PYP G1",
  "path": "literacy/spelling_bee.html",
  "href": "literacy/spelling_bee.html?set=uoi3",
  "type": "Existing",
  "description": "Practice story, feeling, and audience vocabulary."
}
```

## Age Calibration

| Element | Ages 6-8 | Ages 9-10 | Ages 11-12 |
| --- | --- | --- | --- |
| Instructions | One short task at a time | Short task plus example | Can include strategy |
| Reading load | Minimal | Moderate | More detailed |
| Mechanics | Click, tap, simple drag | Sort, sequence, compare | Plan, infer, optimize |
| Feedback | Immediate and concrete | Immediate with hint | Specific explanation |
| Timer | Usually avoid | Optional | Acceptable when useful |

## Verification Checklist

Before calling the work complete:

- The page opens through Vite without console errors.
- Every core action is reachable by touch/click.
- The game has a visible `PYP Map` return link.
- The page includes a viewport meta tag.
- New UOI games stay standalone with embedded CSS/JS.
- Touch targets are at least 44px.
- Feedback is immediate, kind, and useful.
- The learner can restart or continue; there are no dead ends.
- `src/data/curriculum-map.json` is updated when the game should appear in the hub.
- `npm run qa:curriculum` passes.
- `npm run build` passes when generated index or PWA files are affected.
- Desktop and iPad landscape visual checks are completed or clearly called out as not run.
