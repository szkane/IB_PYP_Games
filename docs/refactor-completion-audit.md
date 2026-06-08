# PYP Refactor Completion Audit

This audit tracks the original refactor objective against current evidence in the worktree.

## Requirement Matrix

| Requirement | Evidence | Status |
| --- | --- | --- |
| Create a new branch for the refactor | Current branch: `codex/pyp-uoi-refactor` | Proven |
| Read and use the existing project structure | Existing pages are still present under `src/Chinese`, `src/literacy`, `src/math`, and `src/science`; all 31 standalone/nested HTML games are mapped by `npm run qa:curriculum` | Proven |
| Read and use Grade 1 UOI curriculum documents | Grade 1 units and central ideas are recorded in `src/data/curriculum-map.json` and summarized in `docs/grade1-uoi-map.md` | Proven for Grade 1 source material used in this refactor |
| Homepage shows Grade 1 through Grade 5 | `src/data/curriculum-map.json` contains 5 grades; `npm run qa:curriculum` checks generated grade labels and planned panels | Proven statically |
| Games are reorganized by Grade, Unit, and Subject | `scripts/generate-index.js` renders Grade panels, Unit bands, Subject lanes, and game links from `src/data/curriculum-map.json` | Proven statically |
| Grade 1 games are reorganized according to UOI units | `docs/grade1-uoi-map.md` lists Unit 1-5 decisions; `npm run qa:curriculum` verifies Grade 1 has 5 units and all mapped paths exist | Proven statically |
| UOI is the learning center connecting Literacy, Math, Science, and Chinese 中文 | Grade 1 Unit 1-5 subject lanes are defined in `src/data/curriculum-map.json`; Unit 4-5 include Science where the documents support science inquiry | Proven statically |
| Add new games based on Hilson Grade 1 UOI learning portfolio | Five new standalone UOI games exist in `src/uoi/` and are mapped to Unit 1-5 | Proven statically |
| New games should be as standalone HTML5 as possible | `npm run qa:curriculum` checks the five new UOI games for embedded CSS/JS and no external script/stylesheet links | Proven for new UOI games |
| Existing reusable games should support unit-specific learning where useful | `spelling_bee.html` supports `?set=uoi1` to `?set=uoi5`; `arithmetic.html` supports `?preset=uoi1` to `?preset=uoi3`; `before_after.html` supports `?mode=days/months` | Proven statically |
| Pages should be child-friendly and beautiful | New UOI games use large touch targets, friendly copy, immediate feedback, and responsive layouts; old games receive PYP Map return links and some UOI copy alignment | Partially proven by code/static QA; requires visual QA |
| Adapt to iPad landscape and PC | Homepage and new UOI games include viewport tags and responsive CSS; all game pages have viewport tags | Partially proven by static QA; requires browser/iPad visual QA |
| Every game should be reachable from the curriculum map | `npm run qa:curriculum` validates all 31 HTML game pages are assigned and mapped paths exist | Proven statically |
| Every game can return to the PYP map | `npm run qa:curriculum` validates every HTML game page contains a `PYP Map` return link marker | Proven statically |
| Root entry should not show stale category homepage | Root `index.html` redirects and links to `src/index.html`; `npm run qa:curriculum` validates this | Proven statically |
| PWA cache follows the new curriculum map | `scripts/generate-index.js` writes curriculum game URLs into `src/sw.js`; `npm run qa:curriculum` verifies every mapped href is present in the service worker precache list | Proven statically |
| Build should guard the new structure | `npm run build` runs `generate-index`, `qa:curriculum`, then Vite build | Proven |

## Current Verification Commands

```bash
npm run qa:curriculum
npm run qa:urls
npm run build
```

`npm run build` is the primary gate because it regenerates the homepage, runs curriculum QA, and then runs the Vite production build.

## Remaining Gate

The remaining unproven requirement is live visual/browser QA for:

- desktop viewport
- iPad landscape viewport
- small fallback viewport
- actual game interaction and console health

Use `docs/manual-visual-qa.md` and `npm run qa:urls` when a browser runtime can open the project.

In the current Codex environment:

- Binding a local dev server to `127.0.0.1:5173` was denied by sandbox policy.
- Browser navigation to local `file://` pages was denied by Browser Use URL policy.

Because of that, this refactor should not be marked fully complete until visual QA is run in an environment that can open the app.
