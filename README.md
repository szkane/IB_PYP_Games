# IB PYP Games

This project consists of a series of interactive example games created via Vibe Coding, specifically designed for students in the IB PYP phase.

这个项目是给在 IB PYP 阶段的学生，通过 Vibe Coding 创建的一些实例互动游戏。

## Curriculum Structure

The project is now organized around the IB PYP inquiry flow:

```text
Grade -> Unit of Inquiry -> Subject lane -> Game
```

- `Grade 1` is active and mapped to Hilson's current UOI learning portfolio.
- `Grade 2` to `Grade 5` are visible on the homepage as planned curriculum spaces, ready for future UOI documents.
- Grade 1 units connect UOI, Literacy, Math, Science, and Chinese 中文 games where they support the inquiry theme.
- The homepage is generated from `src/data/curriculum-map.json`; do not hand-edit `src/index.html`.

## Key Files

- `src/data/curriculum-map.json` - source of truth for grades, units, subjects, descriptions, game paths, and unit-specific launch URLs.
- `scripts/generate-index.js` - generates the Grade/Unit/Subject homepage and refreshes the service worker cache version.
- `scripts/qa-curriculum.js` - validates curriculum coverage, generated links, return links, responsive basics, and standalone UOI game rules.
- `docs/grade1-uoi-map.md` - explains the Grade 1 UOI mapping decisions and remaining visual QA gate.
- `docs/manual-visual-qa.md` - browser, iPad landscape, and desktop visual QA checklist.
- `docs/refactor-completion-audit.md` - requirement-by-requirement status for the active refactor goal.
- `src/uoi/*.html` - new standalone Grade 1 UOI games. These are single-file HTML5 activities with embedded CSS and JavaScript.

## Commands

```bash
npm install
npm run dev
npm run qa:curriculum
npm run qa:urls
npm run build
npm run preview
```

Run `npm run qa:curriculum` before committing curriculum or game-map changes. It checks that:

- 5 grades are present.
- Grade 1 has 5 UOI units.
- Every standalone HTML game is assigned in the curriculum map.
- Every game page has a viewport meta tag and a return link to the PYP map.
- New UOI games remain standalone and touch-friendly.
- The generated homepage contains the expected grade, unit, subject, and game links.

## Adding or Reorganizing Games

1. Add the game HTML under `src/{category}/` or as a standalone UOI game under `src/uoi/`.
2. Add or update the matching entry in `src/data/curriculum-map.json`.
3. Use `href` when a reusable game should open with a unit-specific query string, such as `literacy/spelling_bee.html?set=uoi3`.
4. Run `npm run qa:curriculum`.
5. Run `npm run build` to regenerate `src/index.html` and `src/sw.js`.

## Design Expectations

- Keep child-facing pages simple, encouraging, and visually clear for Grade 1-5 learners.
- Use large touch targets, ideally at least 44px high.
- Keep standalone UOI games self-contained with embedded CSS and JavaScript.
- Design for iPad landscape and desktop first, with responsive fallback for smaller screens.
- Camera, microphone, and audio interactions must start from a user gesture.
