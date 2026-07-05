# WordQuest - Vocabulary Games Suite

<cite>
**Referenced Files in This Document**
- [index.html](file://src/literacy/wordquest/index.html)
- [main.js](file://src/literacy/wordquest/js/main.js)
- [router.js](file://src/literacy/wordquest/js/router.js)
- [screens.js](file://src/literacy/wordquest/js/screens.js)
- [data.js](file://src/literacy/wordquest/js/data.js)
- [progress.js](file://src/literacy/wordquest/js/progress.js)
- [audio.js](file://src/literacy/wordquest/js/audio.js)
- [voice-control.js](file://src/literacy/wordquest/js/voice-control.js)
- [controller.js (Word Search)](file://src/literacy/wordquest/js/wordsearch/controller.js)
- [grid.js (Word Search)](file://src/literacy/wordquest/js/wordsearch/grid.js)
- [controller.js (Crossword)](file://src/literacy/wordquest/js/crossword/controller.js)
- [generator.js (Crossword)](file://src/literacy/wordquest/js/crossword/generator.js)
- [layout.js (Crossword)](file://src/literacy/wordquest/js/crossword/layout.js)
- [manifest.json](file://src/manifest.json)
- [sw.js](file://src/sw.js)
- [convert-vocab.js](file://scripts/convert-vocab.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
WordQuest is a vocabulary games suite that provides two interactive activities: Word Search and Crossword puzzles. It uses a modular architecture with separate controllers for each game, shared data management for word lists and utilities, and a progressive progress tracking system. The app includes a hash-based routing system for navigation, responsive screen management, audio feedback via speech synthesis and oscillator-based sound effects, and voice control integration for accessibility. It also supports PWA capabilities with offline functionality through a service worker and manifest configuration.

## Project Structure
The WordQuest application is organized under src/literacy/wordquest with clear separation between UI, routing, screens, game controllers, generators, and utilities. The entry point loads the main module which initializes routing, audio unlocking, and voice control. Screens render grade/category/mode selection and orchestrate game instances. Each game type has its own controller and supporting modules.

```mermaid
graph TB
A["index.html"] --> B["js/main.js"]
B --> C["js/router.js"]
B --> D["js/screens.js"]
B --> E["js/audio.js"]
B --> F["js/voice-control.js"]
D --> G["js/wordsearch/controller.js"]
D --> H["js/crossword/controller.js"]
G --> I["js/wordsearch/grid.js"]
H --> J["js/crossword/generator.js"]
H --> K["js/crossword/layout.js"]
D --> L["js/data.js"]
D --> M["js/progress.js"]
N["src/manifest.json"] --> O["src/sw.js"]
P["scripts/convert-vocab.js"] --> L
```

**Diagram sources**
- [index.html:1-21](file://src/literacy/wordquest/index.html#L1-L21)
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [voice-control.js:1-157](file://src/literacy/wordquest/js/voice-control.js#L1-L157)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [manifest.json:1-22](file://src/manifest.json#L1-L22)
- [sw.js:1-130](file://src/sw.js#L1-L130)
- [convert-vocab.js:1-225](file://scripts/convert-vocab.js#L1-L225)

**Section sources**
- [index.html:1-21](file://src/literacy/wordquest/index.html#L1-L21)
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [voice-control.js:1-157](file://src/literacy/wordquest/js/voice-control.js#L1-L157)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)
- [manifest.json:1-22](file://src/manifest.json#L1-L22)
- [sw.js:1-130](file://src/sw.js#L1-L130)
- [convert-vocab.js:1-225](file://scripts/convert-vocab.js#L1-L225)

## Core Components
- Router: Hash-based routing with query parameter support; parses routes into {grade, cat, mode, action} and navigates via window.location.hash.
- Screens: Renders home, categories, mode-select, play, and completion screens; orchestrates game lifecycle and integrates with progress and audio.
- Data: Exports VOCAB by grade, GRADES metadata, and WordUtil helpers for normalization and round selection.
- Progress: Tracks per-grade, per-category rounds, cursor, and stars for ws/cw modes using localStorage.
- Audio: Provides speech synthesis (unlock, accent/voice selection, speak) and oscillator-based sfx (correct/wrong/complete/found).
- Voice Control: UI to select accent or specific voice; persists preferences and syncs with speech engine.
- Word Search Controller: Generates grid, renders UI, handles pointer drag selection, validates matches, plays audio, shows confetti, and triggers completion callbacks.
- Word Search Grid Generator: Cleans words, computes size, places words with grade-appropriate directions, fills empty cells with frequency-weighted letters.
- Crossword Controller: Builds board, letter bank, clues; supports point-select and drag-and-drop; validates per-word immediately; plays audio and confetti on completion.
- Crossword Generator: Multi-seed greedy placement with strict adjacency constraints and template fallback; scores placements by density and compactness.
- Crossword Layout: Converts sparse generator output to dense grid, assigns clue numbers, and builds across/down lists.

**Section sources**
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [voice-control.js:1-157](file://src/literacy/wordquest/js/voice-control.js#L1-L157)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)

## Architecture Overview
The application follows a SPA pattern with hash routing driving screen rendering. The main module initializes router, wires route changes to screen rendering, and unlocks audio on first user interaction. Screens manage game instantiation and completion flows, integrating with progress persistence and audio feedback.

```mermaid
sequenceDiagram
participant User as "User"
participant Main as "main.js"
participant Router as "router.js"
participant Screens as "screens.js"
participant WS as "WordSearchGame"
participant CW as "CrosswordGame"
participant Prog as "progress.js"
participant Audio as "audio.js"
User->>Main : Interact (pointerdown/keydown/touchstart)
Main->>Audio : unlock()
User->>Router : Navigate (hash change)
Router-->>Main : route + query
Main->>Screens : destroyCurrentGame()
Main->>Screens : render* based on action
Screens->>Prog : getRoundWords()
alt Mode = ws
Screens->>WS : new WordSearchGame(container, opts)
WS->>WS : start()
WS-->>Screens : onComplete()
else Mode = cw
Screens->>CW : new CrosswordGame(container, opts)
CW->>CW : start()
CW-->>Screens : onComplete()
end
Screens->>Prog : recordCompletion(gradeId, catId, mode, words)
Screens->>Screens : renderDone()
Screens->>Audio : complete()
```

**Diagram sources**
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)

## Detailed Component Analysis

### Routing System
- Parses hash paths like #/g/:grade/:cat/:mode/play and query parameters.
- Emits route objects with fields grade, cat, mode, action to the main handler.
- Supports deep-linking via ?grade=g2 on home to jump to categories.

```mermaid
flowchart TD
Start(["Hash Change"]) --> Parse["Parse Route & Query"]
Parse --> Action{"Action?"}
Action --> |home| Home["Render Home"]
Action --> |categories| Cats["Render Categories"]
Action --> |mode-select| ModeSel["Render Mode Select"]
Action --> |play| Play["Render Play"]
Home --> End(["Done"])
Cats --> End
ModeSel --> End
Play --> End
```

**Diagram sources**
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)

**Section sources**
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)

### Screen Management and Game Orchestration
- Renders four primary screens plus completion overlay.
- Destroys previous game instance on route change to release listeners and DOM.
- For Word Search, replaces built-in completion card with unified done overlay.
- For Crossword, appends done overlay below solved board.
- Computes crossword usability by counting words with 3–8 pure lowercase letters.

```mermaid
classDiagram
class Screens {
+renderHome(container)
+renderCategories(container, gradeId)
+renderModeSelect(container, gradeId, catId)
+renderPlay(container, gradeId, catId, mode)
+renderDone(container, gradeId, catId, mode)
}
class WordSearchGame {
+start()
+destroy()
+onComplete()
}
class CrosswordGame {
+start()
+destroy()
+onComplete()
}
Screens --> WordSearchGame : "instantiates"
Screens --> CrosswordGame : "instantiates"
```

**Diagram sources**
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)

**Section sources**
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)

### Shared Data Management
- VOCAB contains categorized word lists per grade.
- GRADES defines grade metadata used in UI.
- WordUtil normalizes words for grids and selects fresh rounds excluding seen words.

```mermaid
flowchart TD
LoadVocab["Load VOCAB + GRADES"] --> Normalize["WordUtil.gridChars(word)"]
Normalize --> Filter["Filter usable words (length, chars)"]
Filter --> PickRound["WordUtil.pickRound(category, count, seenWords)"]
PickRound --> UseForGames["Provide words to WS/CW controllers"]
```

**Diagram sources**
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)

**Section sources**
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)

### Progress Tracking System
- Stores progress under a single localStorage key with versioned structure.
- Tracks rounds, cursor, and stars for ws/cw modes per category.
- Advances cursor when both modes are completed for a round.
- Aggregates grade-level progress for display on home screen.

```mermaid
flowchart TD
Start(["Start Game"]) --> GetRound["getRoundWords(gradeId, catId, category, count)"]
GetRound --> Play["Play Game"]
Play --> Complete{"All Words Found?"}
Complete --> |Yes| Record["recordCompletion(gradeId, catId, mode, words)"]
Record --> Advance{"Both modes done?"}
Advance --> |Yes| NextRound["cursor++"]
Advance --> |No| Stay["stay at current round"]
NextRound --> Done(["Done"])
Stay --> Done
Complete --> |No| Play
```

**Diagram sources**
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)

**Section sources**
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)

### Word Search Grid Generation Algorithm
- Cleans and deduplicates words using WordUtil.gridChars.
- Computes grid size based on longest word and total letters, constrained by grade ranges.
- Places words with grade-appropriate direction sets (KG: 2 dirs → G3: 8 dirs), long words first, up to 100 attempts per word, allowing same-letter overlaps.
- Up to 5 full reshuffles; last attempt accepts partial results.
- Fills empty cells with 70% from placed letters pool and 30% weighted by English frequency.

```mermaid
flowchart TD
Start(["generateGrid(rawWords, gradeId)"]) --> Clean["Clean & filter words"]
Clean --> Size["Compute size (grade range)"]
Size --> Place["tryPlace(words, size, gradeId)"]
Place --> CheckAll{"All placed?"}
CheckAll --> |Yes| Fill["fillGrid(result, size)"]
CheckAll --> |No| Reshuffle{"Attempt < 5?"}
Reshuffle --> |Yes| Place
Reshuffle --> |No| Partial["Accept partial result"]
Partial --> Fill
Fill --> Return(["Return grid, placements, size"])
```

**Diagram sources**
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)

**Section sources**
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)

### Crossword Puzzle Layout System
- Generator filters words to 3–8 pure lowercase letters, deduplicates, and selects up to 8 for placement.
- Multi-seed retry (40 seeds) with long-first ordering; scores placements by placed count minus bounding box area.
- Strict canPlace constraints prevent accidental merging and parallel fusion; requires at least one new cell.
- Template fallback alternates horizontal/vertical placement through any matching letter if initial placement is poor.
- Layout converts sparse map to dense grid, shifts coordinates, and assigns sequential clue numbers following standard conventions.

```mermaid
flowchart TD
Start(["generateCrossword(rawWords)"]) --> Filter["Filter words (3–8, a-z)"]
Filter --> Select["Select top MAX_WORDS (8)"]
Select --> Seeds["N_SEEDS=40 shuffled attempts"]
Seeds --> TryBuild["tryBuild(shuffled)"]
TryBuild --> Score["score = placed*100 - bboxArea"]
Score --> Best{"Best so far"}
Best --> Fallback{"placed < min(5, selected)?"}
Fallback --> |Yes| Template["templateFallback(selected)"]
Fallback --> |No| Merge["Merge surplus bonus words"]
Template --> Merge
Merge --> Layout["layoutCrossword(sparseResult)"]
Layout --> Return(["Return dense grid, across/down, numbers"])
```

**Diagram sources**
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)

**Section sources**
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)

### Voice Control Integration for Accessibility
- Speech engine unlock on first user gesture; restores saved accent/voice preference.
- Accent buttons set default/us/uk; specific voice selection overrides accent.
- Voice switcher UI groups voices by accent and syncs active state; previews sample text.
- showVoiceControl toggles visibility during gameplay vs non-game screens.

```mermaid
sequenceDiagram
participant UI as "voice-control.js"
participant Speech as "audio.js"
UI->>Speech : unlock()
Speech-->>UI : restorePreference()
UI->>Speech : setAccent('us'|'uk'|'default')
UI->>Speech : setVoice(voiceURI)
UI->>Speech : speak("hello")
Note over UI,Speech : Preferences persisted in localStorage
```

**Diagram sources**
- [voice-control.js:1-157](file://src/literacy/wordquest/js/voice-control.js#L1-L157)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)

**Section sources**
- [voice-control.js:1-157](file://src/literacy/wordquest/js/voice-control.js#L1-L157)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)

### Audio Feedback Mechanisms
- Speech synthesis speaks found words, hints, and completion messages.
- Sound effects use oscillators: correct (ascending triad), wrong (descending buzz), complete (arpeggio), found (short ascending pair).
- Audio contexts unlocked on first interaction to comply with browser policies.

```mermaid
flowchart TD
Event["User Interaction"] --> Unlock["speech.unlock() / sfx.unlock()"]
Unlock --> Speak["speech.speak(text)"]
Unlock --> SFX["sfx.correct()/wrong()/complete()/found()"]
```

**Diagram sources**
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)

**Section sources**
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)

### Progressive Web App Capabilities and Offline Functionality
- Manifest defines app name, icons, start URL, display mode, theme color, and scope.
- Service worker pre-caches essential assets, activates immediately, and cleans old caches.
- Fetch strategy: network-first for HTML with cache fallback; stale-while-revalidate for static assets.

```mermaid
flowchart TD
Install["SW install"] --> Precache["Precache PRECACHE_URLS"]
Activate["SW activate"] --> Claim["clients.claim()"]
Fetch["Fetch Request"] --> IsHTML{"HTML?"}
IsHTML --> |Yes| NetworkFirst["fetch(request) -> cache.put(clone)"]
IsHTML --> |No| StaleWhileRevalidate["cache.match(request) -> fetch().then(cache.put(clone))"]
NetworkFirst --> Respond["respondWith(response or cached)"]
StaleWhileRevalidate --> Respond
```

**Diagram sources**
- [manifest.json:1-22](file://src/manifest.json#L1-L22)
- [sw.js:1-130](file://src/sw.js#L1-L130)

**Section sources**
- [manifest.json:1-22](file://src/manifest.json#L1-L22)
- [sw.js:1-130](file://src/sw.js#L1-L130)

### Adding New Word Lists and Curriculum Integration
- Maintain vocabulary.md with grade headers and category sections containing comma-separated word lists.
- Run convert-vocab.js to regenerate data.js exports (VOCAB, GRADES, WordUtil).
- Integrate curriculum content by adding categories aligned to learning objectives; ensure words meet grid/crossword constraints.

```mermaid
flowchart TD
Edit["Edit vocabulary.md"] --> Run["node scripts/convert-vocab.js"]
Run --> Generate["Generate data.js"]
Generate --> Import["Import VOCAB/GRADES/WordUtil"]
Import --> Use["Use in screens/progress/controllers"]
```

**Diagram sources**
- [convert-vocab.js:1-225](file://scripts/convert-vocab.js#L1-L225)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)

**Section sources**
- [convert-vocab.js:1-225](file://scripts/convert-vocab.js#L1-L225)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)

### Customizing Puzzle Difficulty
- Word Search difficulty scales via grade-specific direction sets and grid size ranges.
- Crossword usability depends on count of words with 3–8 pure lowercase letters; fewer than 4 disables crossword mode.
- Adjust grade ranges and direction sets in grid generation to tailor complexity.

**Section sources**
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)

### Implementing New Game Types
- Create a new controller module with start(), destroy(), and completion callbacks.
- Register a new mode in screens.js renderModeSelect and renderPlay.
- Update router actions if needed and integrate with progress tracking.

[No sources needed since this section provides general guidance]

### Student Progress Monitoring Features
- Per-category stars for ws/cw modes persist in localStorage.
- Grade-level aggregation displays total, wsDone, cwDone, fullyDone counts.
- Cursor advances only when both modes are completed for a round.

**Section sources**
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)

## Dependency Analysis
The application exhibits low coupling between controllers and shared modules. Screens orchestrate game instances and depend on data, progress, audio, and router. Controllers depend on generators/layouts and audio. The data module is central for word lists and utilities.

```mermaid
graph TB
Main["main.js"] --> Router["router.js"]
Main --> Screens["screens.js"]
Screens --> Data["data.js"]
Screens --> Progress["progress.js"]
Screens --> Audio["audio.js"]
Screens --> WSController["WordSearchGame"]
Screens --> CWController["CrosswordGame"]
WSController --> WSGen["grid.js"]
CWController --> CWGen["generator.js"]
CWController --> CWLayout["layout.js"]
Convert["convert-vocab.js"] --> Data
```

**Diagram sources**
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)
- [convert-vocab.js:1-225](file://scripts/convert-vocab.js#L1-L225)

**Section sources**
- [main.js:1-97](file://src/literacy/wordquest/js/main.js#L1-L97)
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [data.js:1-117](file://src/literacy/wordquest/js/data.js#L1-L117)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [grid.js (Word Search):1-201](file://src/literacy/wordquest/js/wordsearch/grid.js#L1-L201)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)
- [generator.js (Crossword):1-398](file://src/literacy/wordquest/js/crossword/generator.js#L1-L398)
- [layout.js (Crossword):1-163](file://src/literacy/wordquest/js/crossword/layout.js#L1-L163)
- [convert-vocab.js:1-225](file://scripts/convert-vocab.js#L1-L225)

## Performance Considerations
- Word Search grid generation uses bounded attempts and partial acceptance to avoid infinite loops; keep word counts reasonable for performance.
- Crossword generator employs multi-seed retries and scoring to balance quality and runtime; limit MAX_WORDS and candidates to maintain responsiveness.
- Audio unlocks are idempotent and guarded; avoid repeated initialization.
- DOM updates are scoped to game containers; destroyPreviousGame ensures cleanup of listeners and elements.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- If crossword mode is disabled, verify sufficient words with 3–8 pure lowercase letters in the category.
- If speech does not play, ensure first user interaction occurs to unlock audio engines.
- If progress resets unexpectedly, check localStorage availability and storage quotas.
- If offline behavior fails, confirm service worker registration and cache keys.

**Section sources**
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [sw.js:1-130](file://src/sw.js#L1-L130)

## Conclusion
WordQuest provides a robust, modular framework for vocabulary games with clear separation of concerns, reliable puzzle generation algorithms, accessible audio features, and persistent progress tracking. Its PWA setup enables offline usage, while the routing and screen management offer smooth navigation. Educators can extend the suite by adding new word lists, customizing difficulty, and implementing additional game types integrated with curriculum content.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### API Definitions for Key Modules
- Router
  - init(onChange): Registers hashchange listener and fires initial parse.
  - navigate(hash): Updates window.location.hash.
  - parseRoute(): Returns {grade, cat, mode, action}.
  - parseQuery(): Returns URLSearchParams.
- Screens
  - renderHome(container): Displays grade cards with progress dots.
  - renderCategories(container, gradeId): Shows categories with star indicators.
  - renderModeSelect(container, gradeId, catId): Chooses ws/cw with usability checks.
  - renderPlay(container, gradeId, catId, mode): Instantiates game and handles completion.
  - renderDone(container, gradeId, catId, mode): Shows celebration overlay and navigation.
- Progress
  - getCategory(gradeId, catId): Returns category progress object.
  - recordCompletion(gradeId, catId, mode, words): Marks mode completion and advances cursor.
  - getRoundWords(gradeId, catId, category, count): Picks fresh words excluding seen.
  - getGradeProgress(gradeId): Aggregates totals for grade.
- Audio
  - speech.unlock(): Initializes speech synthesis and restores preference.
  - speech.setAccent(accent): Sets accent preference.
  - speech.setVoice(voiceURI): Sets specific voice preference.
  - speech.speak(text, opts): Speaks text with rate/lang options.
  - sfx.correct()/wrong()/complete()/found(): Plays oscillator-based tones.
- Word Search Controller
  - constructor(container, options): Accepts words, gradeId, callbacks.
  - start(): Generates grid, injects styles, renders UI, binds events.
  - destroy(): Unbinds events and cleans up resources.
- Crossword Controller
  - constructor(container, options): Accepts words, gradeId, callbacks.
  - start(): Generates layout, renders board/bank/clues, binds events.
  - destroy(): Unbinds events and cleans up resources.

**Section sources**
- [router.js:1-65](file://src/literacy/wordquest/js/router.js#L1-L65)
- [screens.js:1-476](file://src/literacy/wordquest/js/screens.js#L1-L476)
- [progress.js:1-128](file://src/literacy/wordquest/js/progress.js#L1-L128)
- [audio.js:1-202](file://src/literacy/wordquest/js/audio.js#L1-L202)
- [controller.js (Word Search):1-821](file://src/literacy/wordquest/js/wordsearch/controller.js#L1-L821)
- [controller.js (Crossword):1-815](file://src/literacy/wordquest/js/crossword/controller.js#L1-L815)