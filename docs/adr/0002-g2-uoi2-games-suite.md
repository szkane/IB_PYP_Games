# 0002. G2 UOI 2 Games Suite (Sound, Light, Phonics, Multiplication & Angles)

- **Status**: Accepted
- **Deciders**: Kane (Parent & Educator), AI Pair Programmer
- **Date**: 2026-10-05

## Context

Grade 2 Unit of Inquiry 2 at SGA is centered on:
- **Transdisciplinary Theme**: *How We Express Ourselves*
- **Central Idea**: *People use the properties of sound and light to express ideas, feelings and experiences.*
- **Key Concepts & Lines of Inquiry**:
  1. Properties of sound and light (Volume, Pitch, Linear propagation, Shadows, Reflection).
  2. Choice of sound and light to communicate messages (Fire alarm, Police siren, Traffic light, Mood).
  3. Sound and light in creative works.
- **Literacy**:
  1. Phonics digraphs: `ck/k`, `sh`, `th` (voiced/unvoiced), `ch`, `wh/w`, `ph/f`, `ng`, `nk`.
  2. Narrative and script reading/writing: stage directions, character actions, prepositions of place (`in`, `on`, `under`, `next to`, `behind`), subject-verb agreement, and plural nouns.
- **Math**:
  1. Multiplication foundation: Equal groups, arrays, repeated addition ($Group \times Each = Total$).
  2. Fluent recall of times tables: 2, 3, 4, 5 up to $\times 10$ (directly assisting Hilson's Goal-Setting Conference target: *"learn times tables by heart"*).
  3. Geometric shapes and angles: identifying Right, Acute, Obtuse, and Straight angles on regular shapes and real-world 3D objects.

The user selected:
1. **Three.js ES module CDN** (`https://esm.sh/three@0.160.0`) for 3D games.
2. Incorporating **Minecraft-themed elements** (e.g. Redstone lamp, Torch, Creeper block, Obsidian prism, Diamond sword block) into the 3D Light & Shadow Master and Angle Finder.
3. Interactive 3D vertex markers with angle arc overlays for Angle Finder.
4. Synthesized Web Audio API sound effects for zero-dependency offline audio.
5. Standalone single-page architecture for all 7 games registered in `curriculum-map.json` under Grade 2 Unit 2.

## Decision

We will deliver 7 dedicated standalone games:

1. `src/uoi/g2_sound_explorer.html`: Sound Explorer (Volume Loud/Quiet, Pitch High/Low, Signal conventions, Emotion matching).
2. `src/science/g2_light_shadow_master.html`: Light & Shadow Master (Three.js 3D shadow casting, Minecraft torch/redstone lamp & block obstacles, mirror laser reflection puzzle).
3. `src/literacy/g2_digraph_pop.html`: Digraph Pop! (Bubble/token popping game matching `ck`, `sh`, `th`, `ch`, `wh`, `ph`, `ng`, `nk` into words with audio pronunciation feedback).
4. `src/literacy/g2_script_director.html`: Script Director & Grammar (Interactive theater director placing actors using prepositions of place, plus sentence grammar clinic).
5. `src/math/g2_array_equal_groups.html`: Array & Equal Groups Visualizer (Interactive matrix builder with Minecraft items/apples, connecting $Group \times Each = Total$ and repeated addition).
6. `src/math/g2_times_table_challenge.html`: Times Table Speed Challenge (Fast-paced arcade sprint for 2, 3, 4, 5 multiplication tables with combo streaks and badges).
7. `src/math/g2_angle_finder.html`: Angle Finder 3D (Three.js 3D viewer with shape selector on left, live 3D stage in center, attribute panel with right/acute/obtuse/straight angle inspector on right).

## Consequences

- Hilson gains engaging, curriculum-aligned, interactive practice tailored to his school newsletter and personal goal.
- All games follow the Neobrutalism UI style, English-only content, proper punctuation, Web Audio synthesis, and iPad landscape responsiveness.
- Registered under `u2` in `src/data/curriculum-map.json` and validated by `scripts/qa-curriculum.js`.
