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

In structured repos or hubs, units can be registered in a curriculum map or manifest (such as `src/data/curriculum-map.json` or `curriculum-map.json`), storing `theme`, `centralIdea`, `learnerProfile`, and `atlSkills`. In standalone setups, keep these in the game's header comments or companion planning markdown.

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

---

## 10. Grade-Level Language & Storytelling Standards (Age 6–11)

Inquiry games fail when 7-year-olds cannot understand the prompt or drown in adult academic jargon. All text, narratives, scenarios, clues, and feedback must strictly match the developmental reading level of the target grade.

### Developmental Language Matrix

| Grade | Age | Max Sentence Length | Vocabulary & Syntax | Story Structure | Visual/TTS Scaffolding |
| --- | --- | --- | --- | --- | --- |
| **Grade 1** | 6–7 | 5–10 words | Basic sight words, CVC words, short vowels, present tense. | 1 short sentence setup + 1 direct question. | Large emojis on every noun; TTS auto-speak enabled. |
| **Grade 2** | 7–8 | 8–14 words | High-frequency words, simple compounds, clear cause-and-effect. | Short 2-sentence story: Context + action + direct question. | Action emojis (🦖, 🐣, ⛵); speaker buttons on all prompts. |
| **Grade 3–4** | 8–10 | 12–18 words | Descriptive adjectives, scientific terms introduced in context. | Multi-sentence scenario with characters, goals, and trade-offs. | Diagram annotations, glossary tooltips. |
| **Grade 5** | 10–11 | 15–22 words | Technical vocabulary, conditional clauses, nuanced perspectives. | Case briefs, real-world simulations, data interpretation. | Interactive charts, multi-tab briefs. |

### Concrete Examples: What to Avoid vs What to Use

Children think in terms of objects they can touch, see, and hear in everyday life. Never use obscure or adult academic examples when an intuitive everyday alternative exists:

| Concept | ❌ DO NOT USE (Too abstract / obscure) | ✅ ALWAYS USE (Relatable everyday items) |
| --- | --- | --- |
| **Translucent** | "Frosted wax", "Paraffin paper", "Greaseproof film" | "Beach sunglasses 🕶️", "Colored juice bottles", "Tinted car windows" |
| **Transparent** | "Optical acrylic", "Silica pane" | "Clean window glass 🪟", "Eyeglasses", "Fish tank" |
| **Opaque** | "Dense timber block", "Lead sheet" | "Solid toy dinosaur 🦖", "Wooden door", "Book" |
| **Low Pitch** | "Low frequency acoustic wave" | "Big elephant rumble 🐘", "Distant thunder", "Bass drum" |
| **High Pitch** | "Rapid hertz vibration" | "Tiny mouse squeak 🐭", "Referee whistle", "Baby bird chirp" |
| **Loud Volume** | "High decibel energy amplitude" | "Lion roar 🦁", "Airplane jet engine", "Cheering crowd" |
| **Soft Volume** | "Low kinetic sound pressure" | "Quiet whisper 🤫", "Falling snow", "Rustling dry leaves" |
| **Deep Water** | "Deep sea trench abyss" | "Deep ocean submarine 🌊", "Underwater coral reef" |

### Prompt Narrative Construction (Grade 2 Formula)

Always format challenge prompts using this simple 3-part formula:
1. **The Hook** (Context + Emoji): *"Movie Scene: A giant T-Rex is walking! 🦖"*
2. **The Cause-and-Effect Detail**: *"Each heavy footstep shakes the cinema floor."*
3. **The Clear Action Call**: *"What sound makes the footsteps feel heavy and strong?"*

### Clues & Formative Feedback Rules
- **Clues must give guidance, not abstract theory**:
  - *Bad*: *"Consider how sound frequency correlates inversely with vibrating mass."*
  - *Good (Grade 2)*: *"Big, heavy things make deep, low sounds with lots of power! Pick Low Rumble and Loud Roar."*
- **Hints on mistakes must point to the specific choice**:
  - *"🤔 A tiny mouse squeaks high. A giant T-Rex makes a deep Low Rumble!"*
  - *"🤔 Clear glass lets light pass right through! Pick the Solid Toy Dino to block light."*
- **Celebration feedback must reinforce the learning takeaway**:
  - *"🌟 ROAR! Big heavy dinosaurs make a deep low rumble and a loud roar!"*

