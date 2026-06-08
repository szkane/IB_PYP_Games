# Grade 1 UOI Game Map

This document records the Grade 1 curriculum decisions behind `src/data/curriculum-map.json`.
The JSON file remains the source of truth for the generated homepage.

## Layout Decision

The homepage uses this navigation model:

```text
Grade -> Unit of Inquiry -> Subject lane -> Game
```

This matches the IB PYP pattern where the Unit of Inquiry is the learning center, and Literacy, Math, Science, and Chinese 中文 connect back to the inquiry theme.

## Grade 1 Units

| Unit | PYP theme | Inquiry focus | New UOI game | Connected subject lanes |
| --- | --- | --- | --- | --- |
| Unit 1 | Who We Are | Goal setting and action steps | `Goal Steps Quest` | UOI, Literacy, Math, Chinese 中文 |
| Unit 2 | How We Organize Ourselves | Community roles and responsibilities | `Community Helpers Sort` | UOI, Literacy, Math, Chinese 中文 |
| Unit 3 | How We Express Ourselves | Storytelling and expressing meaning | `Story Sequencer` | UOI, Literacy, Math, Chinese 中文 |
| Unit 4 | Sharing the Planet | Needs and protection of living things | `Needs of Living Things` | UOI, Literacy, Math, Science, Chinese 中文 |
| Unit 5 | How the World Works | Patterns, cycles, and changes in nature | `Life Cycle Builder` | UOI, Literacy, Math, Science, Chinese 中文 |

## Reused Game Adaptations

Some existing games now launch with unit-specific query strings from the curriculum map:

- `literacy/spelling_bee.html?set=uoi1` through `?set=uoi5` provide UOI vocabulary sets.
- `math/arithmetic.html?preset=uoi1` through `?preset=uoi3` provide unit-specific math worksheet presets.
- `literacy/before_after.html?mode=days` supports Unit 3 sequencing.
- `literacy/before_after.html?mode=months` supports Unit 5 cycle and calendar sequencing.

## New Standalone UOI Games

The new UOI activities live in `src/uoi/`:

- `goal_steps_quest.html`
- `community_helpers_sort.html`
- `story_sequencer.html`
- `needs_of_living_things.html`
- `life_cycle_builder.html`

Each new UOI game is a standalone HTML5 file with embedded CSS and JavaScript, a viewport meta tag, a `PYP Map` return link, large touch targets, and a tablet responsive layout.

## Grade 2-5 Status

Grades 2-5 are visible on the homepage as planned curriculum spaces with the six PYP transdisciplinary themes. They are intentionally not filled with Grade-specific games yet because no Grade 2-5 UOI documents are currently included in this worktree.

When those documents are available:

1. Extract each grade's unit titles, central ideas, and subject connections.
2. Add units under the matching grade in `src/data/curriculum-map.json`.
3. Map existing games first, then add standalone UOI games where the inquiry needs a new activity.
4. Run `npm run qa:curriculum`.
5. Run `npm run build`.

## Verification

Current static verification command:

```bash
npm run qa:curriculum
```

Current build command:

```bash
npm run build
```

Browser/iPad visual QA still needs a runtime environment that can serve or open the app. In the current Codex environment, localhost binding and `file://` navigation are blocked by policy, so visual QA should be completed once the app can be opened on an iPad landscape viewport and a desktop browser.

Use `docs/manual-visual-qa.md` for the manual browser and iPad checklist.
