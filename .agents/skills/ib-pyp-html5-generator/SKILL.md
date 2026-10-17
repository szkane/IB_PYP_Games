---
name: ib-pyp-html5-generator
description: Design and build standalone HTML5 educational learning games for IB Primary Years Programme (PYP) students (Grades 1–5, ages 6–12). Use this skill whenever the user mentions IB, PYP, UOI, Unit of Inquiry, central idea, lines of inquiry, transdisciplinary theme, learner profile, ATL skills, a Grade 1–5 (g1_ to g5_) activity, an inquiry or project-based learning activity, or asks for standalone kid-friendly HTML5 games with Neobrutalism styling, Web Audio feedback, and switchable TTS read-aloud. Operates independently from any specific build tool (Vite, npm, bundlers) by generating zero-dependency single-file HTML apps, while intelligently adapting to either greenfield setups (offering an index hub) or existing project architectures.
---

# IB PYP HTML5 Generator

The core purpose of this skill is to help users create standalone HTML-based IB inquiry interactive web games (HTML5 + CSS + vanilla JavaScript), enabling students in the IB PYP phase (Grades 1–5, ages 6–12) to conduct in-depth exploration, inquiry, and hands-on learning of curriculum concepts.

This skill is **usable independently from any specific project's technical architecture** and is not tied to deployment-related tools like npm or Vite. Each game is designed as a standalone, zero-dependency single-file HTML application that runs immediately in any web browser, iPad/tablet, local file system, or static web host.

---

## Reference files (read when needed)

| File | Read it when |
| --- | --- |
| [references/pyp-framework.md](references/pyp-framework.md) | Unpacking a unit: themes, key concepts, learner profile, ATL, inquiry cycle, PBL mapping, mechanic ideas per theme, and Section 10 Grade-Level Language Standards |
| [references/design-system.md](references/design-system.md) | Writing CSS/HTML: Neobrutalism tokens, page skeleton, compact header, iPad landscape rules |
| [references/tts-pattern.md](references/tts-pattern.md) | Any text a child should hear: accent dropdown, `TTS_MANAGER`, speaker buttons, when to auto-speak |
| [references/audio-and-interaction.md](references/audio-and-interaction.md) | Sound effects, zero pre-selection pattern, explore-first flow, audio etiquette, 3D scenes |

---

## Workflow

### 1. Detect Project Context & Inquire

Before generating files, inspect the current environment to adapt seamlessly:

- **Scenario A: New / Greenfield Project (or standalone task)**:
  - If there is no existing project structure, **ask the user whether they would like to create an index navigation page** (e.g. `index.html`) to organize and link their newly built course pages.
  - Recommended layout for standalone projects:
    ```
    my-pyp-games/
    ├── index.html        # Central curriculum hub / navigation map
    └── uoi/ (or games/)  # Standalone HTML5 activity files
        └── g2_sound_and_light_studio.html
    ```
- **Scenario B: Existing Project with Established Architecture**:
  - Check for compatibility with the project's folder structure, curriculum maps (e.g., `src/data/curriculum-map.json`), navigation routers, or build tools.
  - Assist the user in implementing the relevant architecture, file paths, and linking logic within their existing conventions (e.g., placing games in `src/uoi/`, maintaining return links like `../index.html`, or updating existing manifest files).
  - Run project-specific build or QA commands (e.g., `npm run qa:curriculum`, `npm run build`) **only if** they are already configured in that project.

---

### 2. Unpack the IB PYP Unit (Inquiry Planning)

Extract or ask for the unit parameters:
- **Grade level**: Grade 1 to Grade 5 (Ages 6–12).
- **Transdisciplinary Theme**:
  - *Who We Are* (identity, health, beliefs, relationships)
  - *Where We Are in Place and Time* (history, journeys, maps, personal growth)
  - *How We Express Ourselves* (ideas, feelings, beliefs, culture, creative arts)
  - *How the World Works* (physical and biological science, matter, forces, tech)
  - *How We Organize Ourselves* (community systems, economics, jobs, rules)
  - *Sharing the Planet* (ecosystems, finite resources, rights, sustainability)
- **Central Idea & Lines of Inquiry** (usually 3 lines).
- **Key Concepts** (Form, Function, Causation, Change, Connection, Perspective, Responsibility).
- **Learner Profile Attributes & ATL Skills** (e.g. Communicator, Inquirer, Thinker).
- **Subject integration**: Math, Literacy, Science, Social Studies, Arts embedded inside the unit.

Write a short **Unit-to-Game Plan**: One learning objective per standalone game file.

---

### 3. Design Around Inquiry & Interaction Logic

Every game must embody authentic inquiry rather than a plain multiple-choice quiz:

1. **Explore-First Sequence (Two-Step Flow)**:
   - **Step 1 (Free Discovery & Sandbox)**: Children freely tap, listen, manipulate, and observe real-world concepts first with zero pressure (e.g. hearing animals, dragging lights, testing materials).
   - **Step 2 (Challenge / Mission)**: Hands-on problem-solving applying what was discovered in Step 1. Always provide an easy `[⬅️ Back to Explore]` button so children can revisit concepts anytime.

2. **Strict Grade-Level Language Calibration**:
   - **Grade 1 (Age 6–7)**: 5–10 words per sentence, basic sight words, concrete nouns, emoji on every noun, TTS auto-speak enabled.
   - **Grade 2 (Age 7–8)**: 8–14 words per sentence, high-frequency vocabulary, direct cause-and-effect, relatable real-world metaphors (e.g. T-Rex stomp, baby bird calling mom, ambulance clearing traffic). Avoid obscure adult terms (use "sunglasses 🕶️" not "frosted wax", "deep ocean 🌊" not "abyss").
   - **Grade 3–5 (Age 8–11)**: 12–18 words per sentence, structured scientific/social terms introduced in context, multi-step inquiry.
   - *Follow `references/pyp-framework.md#10-grade-level-language--storytelling-standards-age-611` for prompt, clue, and feedback wording.*

3. **Zero Pre-Selection in Challenges**:
   - **Strict Rule**: Challenge/mission buttons must **never** be pre-selected in HTML markup or initial JS state.
   - All choices initialize to `null`, buttons remain neutral, and badges show `❓ Tap to choose` with dashed borders.
   - Switching between challenge cases automatically resets uncompleted choices to `null` and clears `.active` classes.

4. **Gentle Guard Checks Before Submission**:
   - If a child presses the action/submit button before selecting all required choices, do NOT penalize or check empty values. Show a warm upward nudge (e.g., *"👆 Please choose both a Pitch and a Volume first!"*).

5. **Clear Case Navigation**:
   - Present one challenge at a time with visible case tabs (`[Case 1] [Case 2] [Case 3]`). Solved cases receive a green background and `✅` checkmarks.
   - Context-aware controls: only show inputs and previews relevant to the active case.

6. **Audio Etiquette on Page Load**:
   - Strictly **zero sound effects on page load**. `DOMContentLoaded` runs with `playSound = false` so sirens, alarms, and roars never startle young children or trigger browser audio policy blocks.

7. **Learner Agency & Formative Feedback**:
   - Children make meaningful choices (scenarios, variables, materials).
   - Immediate, encouraging feedback explains *why* an answer works and suggests the next step. Retries are unlimited and low-stakes.

---

### 4. Build the Standalone HTML5 Application

- **Self-Contained Architecture**: Single `.html` file with embedded `<style>` and `<script>` blocks. No external CSS/JS build pipeline required.
- **CDN Libraries via Importmap**: If Three.js or MediaPipe is needed, load via CDN importmaps (e.g. `unpkg.com`), not npm bundlers.
- **Neobrutalism Design System**:
  - Bold black borders (`3.5px solid #111`), hard offset drop shadows (`4px 4px 0 #111`), candy colors, tactile button depression (`translate(2px, 2px)`).
  - Use semantic tokens from `references/design-system.md`.
- **iPad Landscape Optimization (1024×768 / 1180×820)**:
  - Compact header (one nav row + one small hero, no sticky banners or tall subtitles eating vertical screen height).
  - Responsive two-column play grid (`1.2fr 1fr` in landscape, stacked on narrow mobile).
  - Large touch targets (≥44px height/width, `touch-action: manipulation`).
  - Use `100dvh` for full-height views to avoid Safari toolbar clipping.
- **Return Navigation Link**:
  - Include `<a class="hub-link" href="index.html">← Hub / Map</a>` (or project-appropriate relative path like `../index.html`).

---

### 5. Add Voice Read-Aloud (TTS) & Web Audio SFX

- **Switchable Accent TTS**:
  - Copy the accent dropdown and `TTS_MANAGER` from `references/tts-pattern.md` verbatim.
  - Uses browser native Web Speech API (`window.speechSynthesis`) and persists voice choice across activities via `localStorage['ib_pyp_voice_name']`.
  - Provide 🔊 `.btn-speaker` buttons next to titles, prompts, stories, and clues.
- **Pure Web Audio Synthesizer**:
  - Include the zero-dependency `SoundFX` synthesizer class from `references/audio-and-interaction.md` (click, correct chime, gentle buzz, fanfare).
  - Unlocked automatically on the first user interaction (touch/click).
  - Operates reliably offline without external sound files.

---

### 6. Integration, Verification & Delivery

1. **Project Integration**:
   - *In New Projects*: Deliver the standalone game file. If the user approved an index page, generate or update `index.html` with card links, badges, and grade tags for the new activity.
   - *In Existing Projects*: Place the file in the designated directory (e.g. `src/uoi/`), update project registries/curriculum maps if present, and execute existing project QA/build scripts if configured.
2. **Verification Checklist**:
   - Open in browser or dev server.
   - Check desktop and iPad landscape viewport (1180×820 / 1024×768).
   - Verify zero console errors, zero audio playing on load, touch targets ≥44px, and TTS voice read-aloud working.

---

## Quality checklist

- [ ] **Independent Standalone App**: Single HTML5 file with embedded CSS/JS; runs directly in any browser without npm build requirements.
- [ ] **Project Context Handled**: In new projects, user was asked about creating an index hub; in existing projects, existing structure and paths are respected.
- [ ] **IB PYP Alignment**: Traces clearly to transdisciplinary theme, central idea, lines of inquiry, key concepts, learner profile, and ATL skills.
- [ ] **Explore-First Sequence**: Free exploration/discovery (Step 1) precedes challenge/mission (Step 2), with an easy return path.
- [ ] **Grade-Level Language**: Short sentences (8–14 words for G2), sight words, concrete everyday examples, zero adult academic jargon.
- [ ] **Zero Pre-Selection**: Challenge buttons start unselected; state variables initialized to `null`; badges show `❓ Tap to choose`.
- [ ] **Case Navigation & State Reset**: Visible case tabs (`[Case 1] [Case 2] [Case 3]`), unsolved choices reset on case switch, guard checks on empty submit.
- [ ] **Audio Etiquette**: Strictly zero sound effects auto-playing on page load; audio only triggers on explicit user gestures.
- [ ] **Neobrutalism UI & iPad Landscape**: Bold borders (`3.5px #111`), hard drop shadows (`4px 4px 0 #111`), compact header, fits without excessive vertical scrolling.
- [ ] **TTS Read-Aloud**: Top-right accent dropdown present; 🔊 buttons on prompts; voice choice saved in `localStorage`.
- [ ] **Synthetic Audio**: Pure Web Audio API SFX; unlocks on first gesture; silent graceful degradation if audio is unavailable.
- [ ] **Return Navigation**: Includes return link (`.hub-link` / `.pyp-map-link`) pointing to index hub or homepage.
