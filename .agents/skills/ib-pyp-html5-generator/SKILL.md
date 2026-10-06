---
name: ib-pyp-html5-generator
description: Design and build IB PYP curriculum-aligned HTML5 learning games for this repo, starting from the unit of inquiry (transdisciplinary theme, central idea, lines of inquiry, key concepts, learner profile, ATL skills) and turning it into a set of inquiry-driven, project-based standalone games with Neobrutalism styling, switchable-accent TTS read-aloud, Web Audio feedback, and iPad-landscape layouts. Use this skill whenever the user mentions IB, PYP, UOI, unit of inquiry, central idea, lines of inquiry, transdisciplinary theme, learner profile, ATL, a Grade 1-5 (g1_ to g5_) game or activity, a curriculum or project-based learning activity, or asks to add read-aloud/voice/TTS to a game, even if they only paste a unit planner, a PDF of school topics, or a list of weekly learning goals. Prefer it over kids-html5-generator when the request is tied to a PYP unit, a grade-level curriculum, or needs the shared TTS pattern.
---

# IB PYP HTML5 Generator

Turn an IB PYP unit (or a single learning goal inside one) into kid-ready, standalone HTML5 games that live in this Vite repo's curriculum hub (Grade → Unit → Subject lane → Game). The goal is not "a quiz with colours": each game should let a 6–11 year old *inquire* — try, notice, explain, and act — while the page quietly does formative assessment.

`kids-html5-generator` covers generic child-friendly game scaffolding. This skill adds the PYP planning layer, the house visual system, the shared TTS pattern, and the lessons learned from real classroom feedback in this repo.

## Reference files (read when needed)

| File | Read it when |
| --- | --- |
| [references/pyp-framework.md](references/pyp-framework.md) | Unpacking a unit: themes, key concepts, learner profile, ATL, inquiry cycle, PBL mapping, mechanic ideas per theme |
| [references/design-system.md](references/design-system.md) | Writing CSS/HTML: Neobrutalism tokens, page skeleton, compact header, iPad landscape rules |
| [references/tts-pattern.md](references/tts-pattern.md) | Any text a child should hear: accent dropdown, `TTS_MANAGER`, speaker buttons, when to auto-speak |
| [references/audio-and-interaction.md](references/audio-and-interaction.md) | Sound effects, shuffling, drag/debounce, 3D scenes, numeric inputs, state bugs |

Also skim `AGENTS.md`, `GLOSSARY.md`, and one recent game such as `src/uoi/g2_vocabulary.html` or `src/math/g2_times_table_challenge.html` before writing code, so new work matches what is already there.

## Workflow

### 1. Unpack the unit (plan before code)

Pull out, from the user's text, PDF, or `src/data/curriculum-map.json`:

- Grade, unit number, transdisciplinary theme, central idea.
- Lines of inquiry (usually 3). If missing, draft them from the central idea and say so.
- Key concepts (2–3 of Form, Function, Causation, Change, Connection, Perspective, Responsibility) and related concepts.
- Learner profile attributes and ATL skills already listed for the unit.
- Subject goals inside the unit (math, literacy, science) — PYP units are transdisciplinary, so subject practice belongs under the unit it supports.

Write a short **unit-to-game map** in your reply (or an artifact for larger units): one row per game with line of inquiry, key concept, mechanic, and file name. One learning objective per file — a "Learn / Build / Detect" progression may share a file only when it is the same objective at rising difficulty (see `g2_angle_explorer.html`).

If the unit is ambiguous (grade unknown, theme unclear, Chinese vs English content), ask one focused question before building.

### 2. Design each game around inquiry

For every game decide:

- **Driving question** a child would actually ask ("Why does my shadow get longer?"). Show it in the UI or read it aloud.
- **Authentic context** — real places, routines, and characters. Hilson, the student this hub was built for, loves Minecraft; Minecraft-flavoured items and goals are welcome where they fit naturally.
- **Mechanic that models thinking**, not recall alone: sort evidence, sequence a cycle, build a model, test a variable, choose and see consequences, fix an error. Prefer manipulatives (SVG clocks, balance scales, draggable cards, sliders, 3D models) over text lists.
- **Agency**: learner chooses mode, range, story, or path (e.g. table groups ×2–4 / ×5–7 / ×8–9 plus single tables). Self-directed exploration before testing.
- **Formative feedback**: immediate, specific, kind — say what worked and the next step. Low-stakes retries; no harsh game-over. Avoid timers for ages 6–8 unless requested.
- **Reflect / act**: end with a one-line takeaway or a "what will you do now?" choice tied to the learner profile.

Age calibration: Grade 1–2 = one short task at a time, read-aloud for all prompts, tap/drag; Grade 3–4 = sort/compare/sequence with hints; Grade 5 = plan, infer, optimise, short written reasoning.

### 3. Build the standalone file

- Location: UOI games in `src/uoi/`, subject practice in `src/math/`, `src/literacy/`, `src/science/`, Chinese in `src/Chinese/`.
- Name with grade prefix and snake_case: `g3_water_cycle_quest.html`.
- Single file, embedded CSS and JS, CDN only for heavy libs (Three.js via importmap). Follow the skeleton in `references/design-system.md`.
- Required: viewport meta, `<title>`, `<a class="pyp-map-link" href="../index.html">← PYP Map</a>`, `lang` matching content.
- Header stays compact: one row with map link, unit tag, and accent dropdown on the right; a small hero with title and stats. Skip eyebrow/subtitle blocks — on an iPad in landscape every vertical pixel goes to the play area.
- English only for non-Chinese games. Every full-sentence option ends with correct punctuation; questions end with `?`. Children copy what they see.
- Shuffle answer options every round; the correct answer must not sit in a fixed slot.
- Math conventions used here: smaller factor first (`4 × 8`), plausible distractors, ranges that match the grade.

### 4. Add read-aloud (TTS)

Copy the accent dropdown and `TTS_MANAGER` from `references/tts-pattern.md` verbatim — the shared `localStorage['ib_pyp_voice_name']` key means a voice picked in one game carries to all others. Then decide per text:

- **Click to hear** (🔊 `.btn-speaker` next to the text): titles, prompts, scenarios, stories.
- **Auto-speak on change**: a new question, equation, or case appearing (Grade 1–2 especially).
- **Speak on interaction**: tapping a word tile, material button, or option.
- **Debounced speak** (~400 ms) for continuous input such as sliders and drag-rotations.
- **Reward speak**: read the completed sentence/answer after success.

### 5. Sound and polish

Add a small Web Audio synth class (click, correct chime, error buzz, fanfare) per `references/audio-and-interaction.md`; unlock on first gesture; keep the same "Next" sound across games. Celebrate completion with a modal plus "Play Again".

### 6. Register and verify

1. Add the game to `src/data/curriculum-map.json` under the right grade → unit → subject. Fill `theme`, `centralIdea`, `learnerProfile`, `atlSkills` on the unit if they are new. Never hand-edit `src/index.html`.
2. Run `npm run qa:curriculum`, then `npm run build`.
3. Open `http://localhost:5173/<path>` and check desktop plus iPad landscape (1180×820 / 1024×768): no clipped content, no console errors, all targets ≥44 px, TTS dropdown opens and speaks.
4. Report what was built, the unit-to-game map, and anything not verified.

## Quality checklist

- [ ] Game traces to a line of inquiry and at least one key concept.
- [ ] Driving question visible or spoken; context is authentic.
- [ ] Learner has a choice (mode, range, path) and can explore before being tested.
- [ ] Feedback is immediate, specific, kind; retry is always possible.
- [ ] Options shuffled; grammar and punctuation correct; English-only unless Chinese subject.
- [ ] Neobrutalism tokens, compact header, iPad landscape fits without excessive scroll.
- [ ] Accent dropdown top-right; 🔊 buttons on prompts; auto-speak where appropriate; `.speaking` state clears on end.
- [ ] Web Audio SFX unlocked on gesture; game works silently if audio fails.
- [ ] PYP Map link, viewport meta, grade-prefixed file name, curriculum map entry.
- [ ] `npm run qa:curriculum` and `npm run build` pass.
