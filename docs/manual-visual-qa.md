# Manual Visual QA Checklist

Use this checklist after `npm run build` passes and the app can be opened in a browser.

## Setup

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

The root should show the generated PYP learning map from `src/index.html`.

To print every curriculum-driven QA URL from the current map:

```bash
npm run qa:urls
```

To use a deployed or preview base URL:

```bash
npm run qa:urls -- https://example.com/
```

## Viewports

Check these viewports at minimum:

| Device target | Size |
| --- | --- |
| Desktop | 1440 x 900 |
| iPad landscape | 1024 x 768 |
| Small tablet / phone fallback | 390 x 844 |

For each viewport:

- No horizontal page overflow except intentional grade/UOI tab scrolling on narrow screens.
- Grade tabs are reachable and clearly tappable.
- Text stays inside cards, buttons, and subject lanes.
- The first viewport clearly communicates `IB PYP Games` and the Grade/Unit/Subject structure.
- Grade 2-5 panels show planned PYP transdisciplinary theme spaces, not broken empty content.

## Homepage Flow

1. Open Grade 1.
2. Confirm five units appear:
   - Unit 1 Goal Setting
   - Unit 2 Community Roles
   - Unit 3 Storytelling
   - Unit 4 Living Things
   - Unit 5 Patterns and Cycles
3. Confirm each Grade 1 unit has UOI, Literacy, Math, and Chinese 中文 subject lanes.
4. Confirm Unit 4 and Unit 5 also have Science lanes.
5. Open Grade 2, Grade 3, Grade 4, and Grade 5 tabs.
6. Confirm each planned grade shows six PYP theme cards.

## New UOI Games

Open each page from the homepage and directly:

- `uoi/goal_steps_quest.html`
- `uoi/community_helpers_sort.html`
- `uoi/story_sequencer.html`
- `uoi/needs_of_living_things.html`
- `uoi/life_cycle_builder.html`

For each game:

- The page loads without console errors.
- The activity is playable with touch/click only.
- The main buttons and choices are at least comfortable iPad touch size.
- Feedback appears after a child action.
- `PYP Map` returns to the generated homepage.
- Layout works on desktop and iPad landscape.

## Unit-Specific Reused Games

Open these direct links and confirm they start in the intended unit mode:

| Link | Expected start state |
| --- | --- |
| `literacy/spelling_bee.html?set=uoi1` | Unit 1 goal/self-management words |
| `literacy/spelling_bee.html?set=uoi2` | Unit 2 community/responsibility words |
| `literacy/spelling_bee.html?set=uoi3` | Unit 3 story/expression words |
| `literacy/spelling_bee.html?set=uoi4` | Unit 4 living-things words |
| `literacy/spelling_bee.html?set=uoi5` | Unit 5 pattern/cycle words |
| `math/arithmetic.html?preset=uoi1` | Unit 1 facts within 20 |
| `math/arithmetic.html?preset=uoi2` | Unit 2 place-value subtraction |
| `math/arithmetic.html?preset=uoi3` | Unit 3 number-story mixed practice |
| `literacy/before_after.html?mode=days` | Days mode active |
| `literacy/before_after.html?mode=months` | Months mode active |

## Existing Game Sweep

From the homepage, spot-check at least one game in each category:

- Chinese 中文
- Literacy
- Math
- Science
- UOI

For each checked game:

- It opens from the generated homepage.
- It has a visible `PYP Map` return link.
- It remains usable on iPad landscape.
- Any camera, microphone, or audio permission is requested only after a user action.

## Pass Criteria

Manual visual QA passes when:

- Static checks pass: `npm run qa:curriculum`.
- Production build passes: `npm run build`.
- The homepage and sampled games meet the viewport and interaction checks above.
- Any visual defects are either fixed or recorded with the page path, viewport, screenshot, and reproduction steps.
