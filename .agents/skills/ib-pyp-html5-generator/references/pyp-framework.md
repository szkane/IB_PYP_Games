# IB PYP Framework for Game Design

Use this to unpack a unit and choose mechanics. PYP is concept-driven and transdisciplinary: games should help children build understanding of a *central idea* through inquiry, not just drill isolated facts.

## Contents
1. Unit anatomy
2. Transdisciplinary themes → mechanic ideas
3. Key concepts → question stems and mechanics
4. Learner profile → in-game moments
5. ATL skills → what the game exercises
6. Inquiry cycle → game structure
7. Project-based learning layer
8. Assessment inside play
9. Worked example

## 1. Unit anatomy

| Element | What it is | How it shows up in a game |
| --- | --- | --- |
| Transdisciplinary theme | One of six global themes framing the unit | Unit tag in the header; context of scenarios |
| Central idea | The enduring understanding (one sentence) | The takeaway line at the end; what the mechanic proves |
| Lines of inquiry (3) | Sub-questions that structure the unit | Usually one game (or one mode) per line |
| Key concepts (2–3) | Lenses for thinking | Shape the question stems and the mechanic |
| Related concepts | Subject-specific ideas (e.g. "opacity", "habitat") | Vocabulary, labels, sorting categories |
| Learner profile | Attributes the unit develops | Reflection prompt, badge names, feedback wording |
| ATL skills | Skills practiced | What the child actually does (sort, explain, plan) |
| Action | What learners do with their understanding | Final "what will you do?" choice or real-world challenge |

Units in `src/data/curriculum-map.json` store `theme`, `centralIdea`, `learnerProfile`, `atlSkills`. Keep these filled when adding a unit.

## 2. Transdisciplinary themes → mechanic ideas

| Theme | Focus | Good mechanics |
| --- | --- | --- |
| Who We Are | Self, health, relationships, beliefs, choices | Balanced-choice scenarios, goal-step planners, feelings matching, routine builders |
| Where We Are in Place and Time | History, journeys, maps, timelines, personal growth | Timeline sequencing, map routes, then-vs-now sorting, time/calendar manipulatives |
| How We Express Ourselves | Stories, art, language, culture, media | Story retell (5-finger), sentence fixer, script director, sound/rhythm makers, vocabulary studios |
| How the World Works | Science, natural patterns, forces, technology | Variable testers (light/shadow, sound), cycle builders, 3D models (solar system), angle/shape explorers |
| How We Organize Ourselves | Systems, communities, jobs, economics, rules | Role matching, market/shop simulations, flowcharts, resource allocation |
| Sharing the Planet | Living things, environment, resources, fairness | Habitat sorting, food chains, recycling decisions, consequence simulators |

## 3. Key concepts → question stems and mechanics

| Concept | Question stem | Mechanic |
| --- | --- | --- |
| Form | What is it like? | Identify, label, sort by attributes |
| Function | How does it work? | Build/assemble, test what each part does |
| Causation | Why is it like this? | Change a variable and observe; cause→effect matching |
| Change | How is it changing? | Sequence stages, before/after, sliders over time |
| Connection | How is it connected to other things? | Link webs, food chains, matching pairs |
| Perspective | What are the points of view? | Role-play choices, "how would X feel?" |
| Responsibility | What is our responsibility? | Choose actions, see consequences, commit to an action |

## 4. Learner profile → in-game moments

Inquirers (explore mode, "try it" prompts) · Knowledgeable (fact cards after success) · Thinkers (explain-why options) · Communicators (read aloud, retell, record) · Principled (fair-choice scenarios) · Open-minded (perspective switches) · Caring (helping characters) · Risk-takers (hard mode, guesses welcomed) · Balanced (choice scenarios about well-being) · Reflective (end-of-game reflection line).

Use attribute names in badges and feedback ("Great Thinker move!") so children hear the vocabulary their teachers use.

## 5. ATL skills

| Skill | Game evidence |
| --- | --- |
| Thinking | Compare, classify, predict, check, transfer to a new case |
| Communication | Listen (TTS), read, sequence language, retell |
| Social | Perspective-taking scenarios, turn-based or pair play |
| Self-management | Choose own range/level, track streaks, set a goal before playing |
| Research | Gather clues, observe results, record findings |

## 6. Inquiry cycle → game structure

Map the inquiry cycle onto screens or modes:

1. **Tuning in** — hook: driving question, short story, read aloud.
2. **Finding out** — free exploration with a manipulative (Learn mode).
3. **Sorting out** — structured challenge that applies the idea (Build mode).
4. **Going further** — transfer to new/harder cases (Detective mode, mixed ranges).
5. **Reflecting** — one-line takeaway linked to the central idea.
6. **Taking action** — choose a real-world action or a next challenge.

`g2_angle_explorer.html` (Learn → Build → Detective) is the house example.

## 7. Project-based learning layer

When the user wants a project-based activity, add:

- **Driving question** that is open and real ("How can our class market make a fair profit?").
- **Sustained challenge** across several rounds or linked games rather than one quiz.
- **Voice and choice** — pick role, product, story, or strategy.
- **Authentic product** — something the child makes or can show: a built model, a retold story, a plan, a shop ledger, a printable/screenshot summary.
- **Critique and revision** — feedback lets them improve and retry, not just score.
- **Public moment** — a final summary screen a child can show a parent or teacher (exhibition mindset).

## 8. Assessment inside play

- Formative by default: immediate feedback with the reason and a next step.
- Track simple evidence in state (correct, attempts, hints used, streak) and show it as progress, not judgement.
- Mix item types so success requires understanding, not pattern-guessing (shuffled options, varied distractors).
- End-of-game summary can name the line of inquiry practised.

## 9. Worked example

Grade 2, Unit "How the World Works" — central idea: *Light and sound help us understand the world around us.*

| Line of inquiry | Key concept | Game | Mechanic |
| --- | --- | --- | --- |
| How shadows form | Causation | `g2_light_shadow_master.html` | Move a torch, pick material opacity, watch the shadow change |
| How sounds are made and travel | Function | `g2_sound_explorer.html` | Scenario cards; test pitch/volume; read-aloud scenarios |
| How we use light and sound safely | Responsibility | (new) | Choose safe actions, see consequences, commit to one at home |
