# Game Archetypes & Differentiated Gameplay Guide

A comprehensive, project-agnostic guide to the 9 interactive page archetypes for IB PYP learning games. Use this reference to:
1. **Recommend** the best-fitting archetype(s) based on the user's learning content and grade level.
2. **Justify** the recommendation with clear pedagogical and cognitive rationales (including why it outperforms alternatives).
3. **Construct** the differentiated interactive gameplay using the self-contained starter templates in [`examples/`](../examples/).

> [!TIP]
> **100% Standalone & Portable**:
> Every archetype has a complete, zero-dependency starter template bundled directly inside [`examples/`](../examples/). You never need external repository files or internet access to inspect or adapt these architectures.

---

## Contents
1. [Quick Selection Decision Matrix](#1-quick-selection-decision-matrix)
2. [Contrastive Rationale Guide: When to Choose X vs. Y](#2-contrastive-rationale-guide-when-to-choose-x-vs-y)
3. [Master Differentiated Gameplay Comparison Table](#3-master-differentiated-gameplay-comparison-table)
4. [Detailed Archetype Specifications & Sub-Variants (Types 1–9)](#4-detailed-archetype-specifications--sub-variants-types-19)

---

## 1. Quick Selection Decision Matrix

| User's Learning Content & Objective | Primary Recommended Archetype | Bundled Starter Template | Secondary / Hybrid Option | Pedagogical Rationale (Why This Fits Best) |
| :--- | :--- | :--- | :--- | :--- |
| **Physical handwriting, character stroke order, paper math homework** | **Type 1: Worksheet Generator & Print** | [`examples/worksheet-print-starter.html`](../examples/worksheet-print-starter.html) | Type 9: Speed Arcade | Bridges screen and paper; generates fresh customizable problem pools while formatting for physical Tian Zi Ge / Mi Zi Ge or aligned math columns via `@media print`. |
| **Sight words, vocabulary definitions, factual recall, phoneme sounds** | **Type 2: Multimedia Flashcards & Audio** | [`examples/flashcards-starter.html`](../examples/flashcards-starter.html) | Type 9: Speed Arcade | Low cognitive friction; pairs visual icons, orthography, and switchable-accent TTS with self-paced 3D card flipping before testing recall. |
| **Continuous scientific/math relationships (waves, ratios, arrays, angles, gears)** | **Type 3: Concept Labs & Manipulatives** | [`examples/concept-lab-starter.html`](../examples/concept-lab-starter.html) | Type 4: 3D Spatial Inspector | Abstract rules become tangible through continuous slider/handle manipulation and live visual/audio feedback (*Explore-First* before testing rules). |
| **3D spatial depth, perspective, shadow formation, solid geometry, orbits** | **Type 4: 3D Spatial Inspectors** | [`examples/spatial-3d-starter.html`](../examples/spatial-3d-starter.html) | Type 3: Concept Lab | Flat 2D diagrams fail to convey occlusion, depth, and viewing angles; Three.js orbit controls let learners inspect 3D projections from any vantage point. |
| **Kinesthetic play, gross/fine motor coordination, active phonics catching** | **Type 5: Computer Vision & Gestures** | [`examples/gesture-tracking-starter.html`](../examples/gesture-tracking-starter.html) | Type 9: Speed Arcade | Turns passive screen time into whole-body movement; connects physical hand pinches and waves directly to floating targets or particle physics. |
| **Narrative retell, daily routines, biological life cycles, timelines** | **Type 6: Sequence Builders & Retell** | [`examples/sequence-builder-starter.html`](../examples/sequence-builder-starter.html) | Type 7: Category Sorter | Enforces temporal logic, cause-and-effect, and narrative structure (e.g., 5-Finger Retell or circular life cycle loops) rather than isolated facts. |
| **Community roles, living thing needs, ecological classification, word roots** | **Type 7: Category Sorters & Matchers** | [`examples/category-sorter-starter.html`](../examples/category-sorter-starter.html) | Type 8: Decision Quest | Builds inductive reasoning and conceptual schemas by requiring learners to evaluate item attributes against multi-category drop bins. |
| **Balanced lifestyle habits, emotional regulation, ethical dilemmas, goal setting** | **Type 8: Scenario Decision Quests** | [`examples/decision-quest-starter.html`](../examples/decision-quest-starter.html) | Type 6: Sequence Builder | Targets IB Learner Profile (*Balanced, Reflective, Caring*); makes real-life trade-offs visible via multi-attribute gauges (Energy, Health, Mood). |
| **Automaticity drills, times tables, phonics popping, grammar error-spotting** | **Type 9: Speed Arcades & Clinics** | [`examples/speed-arcade-starter.html`](../examples/speed-arcade-starter.html) | Type 2: Flashcards | Gamified momentum (streak combos, bubble popping) builds rapid retrieval fluency, while diagnostic "Doctor Clinics" turn editing rules into tactile token healing. |

---

## 2. Contrastive Rationale Guide: When to Choose X vs. Y

When recommending game types to users, explicitly clarify why one archetype is chosen over similar alternatives:

- **Type 3 (2D Concept Lab) vs. Type 4 (3D Spatial Inspector)**:
  - Choose **Type 3** when the relationship is planar, numerical, or acoustic (e.g., 2D door angles, row × column arrays, sound wave frequency/amplitude, clock hands, gear ratios). 2D SVG manipulatives load instantly and offer pixel-precise drag handles.
  - Choose **Type 4** only when **3D depth, camera viewpoint rotation, or 3D ray occlusion** is essential to the concept (e.g., how light angle and object opacity cast shadows on a floor, counting hidden faces/vertices on 3D polyhedra, Earth-Moon-Sun orbital illumination).
- **Type 6 (Sequence Builder) vs. Type 7 (Category Sorter)**:
  - Choose **Type 6** when **order and progression** matter ($A \rightarrow B \rightarrow C \rightarrow D$, or circular loops like Egg $\rightarrow$ Larva $\rightarrow$ Pupa $\rightarrow$ Adult).
  - Choose **Type 7** when **set membership and shared attributes** matter regardless of order (e.g., sorting items into Doctor / Firefighter / Teacher bins, or Living vs. Non-Living).
- **Type 2 (Flashcards) vs. Type 9 (Speed Arcade & Clinic)**:
  - Choose **Type 2** for **initial exposure and low-anxiety study** (learning new vocabulary, hearing pronunciation, flipping to read definitions).
  - Choose **Type 9** for **consolidation, automaticity, and diagnostic application** once basics are introduced (e.g., popping digraph bubbles, sprinting times tables, or tapping injured words in a Sentence Doctor clinic).
- **Type 1 (Worksheet & Print) vs. Screen-Only Archetypes (Types 2–9)**:
  - Choose **Type 1** whenever the learning goal requires **physical penmanship, stroke order memory, pencil stamina, or offline classroom/home paper routines**, optionally paired with an on-screen preview or audio dictation mode.

---

## 3. Master Differentiated Gameplay Comparison Table

Each archetype constructs a fundamentally different gameplay loop, state model, and UI layout:

| Archetype | Step 1: Explore / Setup Mode | Step 2: Mission / Output Mode | Core JS State Architecture | Primary UI / DOM / Canvas Mechanics | Feedback & Assessment Loop |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Worksheet & Print** | Parameter sidebar: configure problem type, range, grid style (Tian Zi Ge / Mi Zi Ge), item count, & answer key toggle | On-screen interactive fill-in + one-click `window.print()` A4 physical paper output (plus optional Audio Dictation) | `config: { type, count, showAnswers }, problems: [{ q, ans }]` | Two-pane layout: `.control-panel` (hidden in `@media print`) + `.a4-paper` (`210mm × 297mm`, `break-inside: avoid`) | On-screen instant check or printed Answer Key page (`page-break-after: always`) |
| **2. Flashcards & Audio** | Category pill filtering, search, 3D card flip (`rotateY(180deg)`), and TTS speaker playback | Self-check recall quiz or pair-matching challenge mode | `deck: [...], activeCat: 'all', flippedIds: Set, quizCase: { choice: null }` | Responsive CSS Grid of `.flashcard` containers with `.card-front` & `.card-back` + top-right `TTS_MANAGER` | Flip reveal + gentle match chime / retry nudge |
| **3. Concept Labs** | Free sandbox: drag SVG handles or sliders to observe live wave/angle/array changes and hear synthesized tones | Case tabs (`Case 1–3`): configure manipulative or pick zero-preselected options to solve real-world scenarios | `sandbox: { freq, amp }, cases: [...], activeCase: 0, choice: null` | Two-column `.play-grid`: left interactive SVG/Canvas manipulative + right Detective Console | Live readout badges (`440 Hz`, `90° Right Angle`) + formative case explanations |
| **4. 3D Spatial Inspectors** | Free 3D Orbit: rotate camera, move 3D light source, toggle material opacity (Opaque/Translucent/Transparent) | Spatial detective missions testing shadow length, occlusion, or 3D geometry properties | `scene3D: { lightPos, material }, activeCase: 0, choice: null` | Three.js `WebGLRenderer` with `PCFSoftShadowMap`, `OrbitControls`, and `touch-action: none` | Real-time 3D shadow projection on floor plane + detective case verification |
| **5. Gesture Tracking** | Camera mirror preview + open-palm/pinch calibration in a pressure-free playground | Catch floating phonics letters or trigger cosmic states by pinching thumb & index finger | `hand: { x, y, isPinching, detected }, targets: [...], score: 0` | `<video>` PIP mirror + `<canvas>` 60fps loop + MediaPipe `Hands` landmark distance math + touch fallback | Visual pinch cursor change + particle burst & arpeggio chime on catch |
| **6. Sequence Builders** | Read/listen to story cards or inspect nature cycle stage cards in the discovery tray | Drag or tap scrambled cards into numbered timeline slots (`1 → 2 → 3 → 4`) or circular cycle rings | `tray: [...], slots: [null, null, null, null], activeCase: 0` | Numbered `.slot` drop zones (`border: 2.5px dashed`) + `.stage-card` items supporting both drag and tap-to-slot | Chronological playback read-aloud when order is verified; specific hint on misordered stage |
| **7. Category Sorters** | Inspect items in the deck tray with audio labels and attribute clues | Sort all cards from the tray into 2–4 thematic drop bins; verify classification | `tray: [...], bins: { catA: [], catB: [], catC: [] }` | Multi-column `.bin-grid` with live count badges (`0 / 2`) + tap-to-cycle or drag-and-drop placement | Snappy green highlight when bin criteria match; gentle shake if an item is misplaced |
| **8. Decision Quests** | Meet the character, review initial well-being gauges (Energy ⚡, Health 🍎, Mood 😊), and hear the context | Multi-scene branching dilemmas where every choice dynamically shifts the status meters | `meters: { energy: 70, health: 70, mood: 70 }, sceneIdx: 0, choice: null` | Top `.meter-grid` with animated progress bars + central `.quest-card` with dilemma options & reflection modal | Non-judgmental formative reflection explaining trade-offs + final Learner Profile summary |
| **9. Speed Arcades & Clinics** | Warm-up preview / rule clinic: test a sample target or inspect grammar bandage rules with zero timer pressure | **Arcade**: User-initiated timed sprint with streak combos.<br>**Clinic**: Tap injured words in a sentence to apply healing bandages | `arcade: { running: false, timeLeft: 30, streak: 0 }, clinic: { tokens: [...] }` | High-contrast target stage or clickable `.word-token` spans that transform into `.healed` bandages | Escalating combo chimes for speed streaks; instant visual token healing (`we` $\rightarrow$ `We`) |

---

## 4. Detailed Archetype Specifications & Sub-Variants (Types 1–9)

### Type 1: Worksheet Generator & Printable Practice (练习生成与纸笔打印型)
* **Bundled Starter Template**: [`examples/worksheet-print-starter.html`](../examples/worksheet-print-starter.html)
* **Pedagogical Purpose**: Develops physical penmanship, character stroke order memory, vertical calculation alignment, and offline homework habits.
* **Sub-Variants & Layout Differences**:
  1. **Chinese Penmanship Grid (田字格 / 米字格)**:
     - Uses CSS `--grid-cell: 14mm`, outer solid border (`1.5px solid #000`), and internal dashed crosshairs (`::before` horizontal, `::after` vertical; plus diagonal SVG lines for Mi Zi Ge).
     - Displays Pinyin ruby header above or beside each row, 1 dark model character (`#000`), 3 light gray trace characters (`#D0D0D0`), and blank practice cells.
  2. **Math Vertical Column Calculation (竖式计算)**:
     - Uses monospace alignment (`Courier New`), right-aligned place values (Hundreds, Tens, Ones), operator symbol on the left, solid bottom rule (`border-bottom: 2px solid #000`), and optional small dashed carry/borrow boxes.
  3. **Mixed Horizontal Operations & Number Bonds**:
     - Multi-column (`grid-template-columns: repeat(3, 1fr)`) equations with blank answer boxes (`[   ]`) for missing addends or totals.
  4. **Audio Dictation Mode (报听写助手 - Optional Screen Companion)**:
     - Lets a child click "🎧 Start Dictation" on screen: the page speaks each word or math problem via TTS with a configurable pause interval while the child writes on physical paper, then reveals the printed/on-screen answer sheet for self-checking.
* **Mandatory Printing Engineering Rules**:
  - `@page { size: A4 portrait; margin: 8mm 10mm; }`
  - In `@media print`: force `background: #FFF !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;`.
  - Hide all screen controls (`.control-panel, .nav-bar, .no-print { display: none !important; }`).
  - Prevent equations or character rows from splitting across page boundaries using `break-inside: avoid; page-break-inside: avoid;`.
  - Support a toggleable **Answer Key Page** separated by `.page-break { page-break-after: always; break-after: page; }`.

---

### Type 2: Multimedia Flashcards & Audio Drills (多模态闪卡与音形认知型)
* **Bundled Starter Template**: [`examples/flashcards-starter.html`](../examples/flashcards-starter.html)
* **Pedagogical Purpose**: Sight word recognition, academic vocabulary acquisition, phonics sound-symbol association, and natural cycle card study.
* **Constructed Gameplay Flow**:
  - **Step 1 (Study & Flip Deck)**: Filter cards by unit/category pills. Tap any card to flip 180° in 3D (`perspective: 1000px`, `backface-visibility: hidden`). Front shows icon + word + 🔊 speaker button; back shows age-calibrated definition + concrete example sentence.
  - **Step 2 (Recall Check / Match Quiz)**: Switch to Challenge tab where a definition or audio clip is presented with zero pre-selection (`❓ Tap to choose`), asking the child to pick the matching vocabulary card.

---

### Type 3: Interactive Concept Labs & Virtual Manipulatives (概念探究与具象实验沙盒型)
* **Bundled Starter Template**: [`examples/concept-lab-starter.html`](../examples/concept-lab-starter.html)
* **Pedagogical Purpose**: PYP *Finding Out* & *Sorting Out* inquiry phases. Lets learners manipulate continuous variables to discover scientific and mathematical laws firsthand.
* **Constructed Gameplay Flow**:
  - **Step 1 (Free Explore Sandbox)**: Manipulate SVG sliders, drag rays/hands on a protractor or clock face, or adjust row × column counters on an array grid. Live visual readouts and Web Audio synthesizers respond in real time.
  - **Step 2 (Detective Mission Cases)**: Present 3–5 structured cases via `[Case 1] [Case 2] [Case 3]` tabs. The learner uses the manipulative to test hypotheses and selects the answer (starting from `null` / `❓ Tap to choose`).

---

### Type 4: 3D Spatial Inspectors & Virtual Dioramas (3D 空间检视与微缩模型型)
* **Bundled Starter Template**: [`examples/spatial-3d-starter.html`](../examples/spatial-3d-starter.html)
* **Pedagogical Purpose**: 3D geometry inspection (faces, edges, vertices, 3D angles), light and shadow optics, and planetary day/night rotation.
* **Constructed Gameplay Flow**:
  - **Step 1 (3D Diorama Exploration)**: Orbit the 3D scene (`OrbitControls` with `enableDamping`), drag the directional light angle slider, or toggle 3D object materials (Opaque block vs. Translucent tinted glass vs. Transparent clear glass) while observing real-time `PCFSoftShadowMap` shadows on the floor.
  - **Step 2 (Spatial Detective Cases)**: Solve case challenges that require rotating the 3D camera or testing light positions to verify the answer.

---

### Type 5: Computer Vision & Gesture-Controlled Worlds (体感交互与手势识别型)
* **Bundled Starter Template**: [`examples/gesture-tracking-starter.html`](../examples/gesture-tracking-starter.html)
* **Pedagogical Purpose**: Kinesthetic phonics spelling, gross-motor engagement, and interactive particle/cosmos exploration.
* **Constructed Gameplay Flow**:
  - **Step 1 (Camera Calibration & Playground)**: User clicks an explicit button to request webcam permission (never auto-start camera without user gesture). A corner PIP mirror shows the hand with a live status badge (`✋ Open` vs `🤏 Pinching`).
  - **Step 2 (Gesture Catch / Control Mission)**: Floating letter bubbles or cosmic particle targets move across the canvas; pinching thumb tip (landmark 4) and index tip (landmark 8) within Euclidean distance `< 0.08` catches the target. Always includes automatic touch/mouse fallback so the game remains 100% playable without a webcam.

---

### Type 6: Sequence Builders & Narrative Retell Maps (逻辑排序与叙述建构型)
* **Bundled Starter Template**: [`examples/sequence-builder-starter.html`](../examples/sequence-builder-starter.html)
* **Pedagogical Purpose**: Chronological ordering, cause-and-effect timelines, 5-Finger Story Retell (*Setting, Characters, Problem, Events, Solution*), and biological life cycles.
* **Constructed Gameplay Flow**:
  - **Step 1 (Story / Cycle Discovery)**: Listen to the story or inspect each stage card with TTS read-aloud.
  - **Step 2 (Sequence Construction)**: Drag or tap scrambled cards from the tray into numbered sequence slots (`1 → 2 → 3 → 4`). Supports both **Linear Timelines** (Before/After, Story Retell) and **Circular Cycle Loops** (Plant/Frog/Butterfly metamorphosis). Clicking "Verify Order" plays back the sequence in order or gives a targeted clue on the first misordered slot.

---

### Type 7: Category Sorters & Entity Classifiers (分类归纳与概念匹配型)
* **Bundled Starter Template**: [`examples/category-sorter-starter.html`](../examples/category-sorter-starter.html)
* **Pedagogical Purpose**: Conceptual classification (e.g., Community Helpers & Tools, Living vs. Non-Living Needs, Habitat Sorting, Chinese Radical Grouping).
* **Constructed Gameplay Flow**:
  - **Step 1 (Inspect Item Deck)**: Tap items in the tray to hear their names and observe their visual clues.
  - **Step 2 (Multi-Bin Sorting)**: Drag or tap-to-place cards into 2–4 labeled category bins. Each bin tracks its item count (`0 / 2`). Submitting an incomplete tray triggers a warm upward reminder; submitting a complete tray highlights correct placements in green and shakes misplaced items with a gentle hint.

---

### Type 8: Scenario Decision Quests & Role-Play Inquiries (情境决策与探索冒险型)
* **Bundled Starter Template**: [`examples/decision-quest-starter.html`](../examples/decision-quest-starter.html)
* **Pedagogical Purpose**: Developing IB Learner Profile attributes (*Balanced, Caring, Principled, Reflective*) and ATL Self-Management skills through realistic daily dilemmas.
* **Constructed Gameplay Flow**:
  - **Step 1 (Context & Meter Baseline)**: Observe the multi-attribute dashboard (e.g., `⚡ Energy: 70%`, `🍎 Physical Health: 70%`, `😊 Mood: 70%`) and read/listen to the opening scenario.
  - **Step 2 (Dilemma Choices & Consequence Reflection)**: Across 3–5 scenes, choose an action (starting unselected). Each choice animates the status meters up or down and opens a warm formative reflection card explaining *why* that trade-off occurred, culminating in a Learner Profile badge summary.

---

### Type 9: Gamified Speed Arcades & Diagnostic Clinics (街机竞速冲关与诊所排错型)
* **Bundled Starter Template**: [`examples/speed-arcade-starter.html`](../examples/speed-arcade-starter.html)
* **Pedagogical Purpose**: Building rapid retrieval automaticity (multiplication facts, phonics digraphs, tally reading) and diagnostic editing skills (capitalization, punctuation, verb tense).
* **Constructed Gameplay Flow**:
  - **Sub-Variant A: Speed Sprint Arcade**:
    - Starts in a calm **Warm-Up / Ready** state (never auto-start a countdown timer on page load).
    - Once the child taps `▶️ Start Sprint`, a timer and streak combo multiplier (`🔥 Streak`) track rapid target hits with escalating Web Audio chimes.
  - **Sub-Variant B: Diagnostic "Sentence Doctor" Clinic**:
    - Displays a "patient" sentence or equation composed of clickable `.word-token` spans.
    - The child diagnoses errors (e.g., lowercase sentence start `we` or missing period on `shadows`) and taps the injured tokens to apply green healing bandages (`We`, `shadows.`).
