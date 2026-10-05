# 0001. G2 UOI 1 Games Suite & Neobrutalism Design System

- **Status**: Accepted
- **Deciders**: Kane (Parent & Educator), AI Pair Programmer
- **Date**: 2026-10-05

## Context

Hilson is entering Grade 2 with Unit of Inquiry 1 at Shenzhen Foreign Languages GBA Academy (SGA).
The unit's transdisciplinary theme is **Who We Are**, with the central idea **"Making balanced choices nurtures one's well-being"** (平衡的选择有助于滋养身心健康).
The core subject connections are:
1. **UOI**: Balanced choices regarding food and emotions, understanding causation (positive/negative impacts), responsibility, and reflection.
2. **Literacy**: Narrative writing story elements (Characters, Setting, Events, Problems, Solutions), Five Finger Retell (Who, What, Where, When, How), and language mechanics (capital letters, punctuation, `-ed` regular past tense verbs, adjectives).
3. **Math**: 3-Number mixed operations (addition, subtraction, and mixed within 20, 50, 100), digital clock reading, and calendar inquiry (days, months, dates).

The user explicitly requested:
1. **Neobrutalism web style** applied comprehensively (both for games and the main curriculum hub).
2. Grade 2 set as the default active tab in `src/index.html`.
3. A printable 3-number mixed arithmetic worksheet generator inspired by `src/math/g1_arithmetic.html`.
4. Consistent file naming convention using the `g2_` prefix.

## Decision

1. **Game Suite Scope**: Deliver 4 standalone HTML5 games:
   - `src/uoi/g2_balanced_choices.html`: Interactive decision adventure with health & emotion meters, consequence feedback, and reward badges.
   - `src/literacy/g2_literacy_detective.html`: Dual-module literacy app featuring "Sentence Fixer" (capitalization, punctuation, `-ed`, adjectives) and "Five Finger Retell Challenge".
   - `src/math/g2_mixed_arithmetic_worksheet.html`: Printable 3-number arithmetic worksheet generator (20/50/100 bounds, addition/subtraction/mixed), with ink-friendly print mode.
   - `src/math/g2_time_and_math_quest.html`: Digital clock reading, interactive calendar navigation, and timed mental arithmetic challenges.

2. **Visual Language (Neobrutalism)**:
   - Thick solid borders: `3px` to `4px` black (`#121212`).
   - Hard drop shadows with no blur: `4px 4px 0 #000`, `6px 6px 0 #000`.
   - Pop/Candy color palette: Canary Yellow (`#FFDE59`), Mint Green (`#00F0FF` / `#4ECCA3`), Punchy Pink (`#FF6584`), Bright Violet (`#B388FF`).
   - Physical tactile button states: `transform: translate(2px, 2px); box-shadow: 2px 2px 0 #000;`.
   - Bold typography hierarchy with high contrast and legible reading fonts (Nunito / Fredoka / system sans).
   - Printable worksheet automatically cleanses background cards in `@media print` for high-clarity black/white paper printing.

3. **Curriculum Hub Defaulting**:
   - Update `scripts/generate-index.js` so that `g2` is the initial active grade tab and panel.
   - Apply Neobrutalism aesthetic enhancements to `scripts/generate-index.js` while maintaining strict adherence to `qa-curriculum.js`.

4. **Curriculum Map Update**:
   - Update `src/data/curriculum-map.json` under Grade 2 to reflect the SGA UOI 1 specifications (Who We Are / Balanced Choices).
   - Register all four games under their respective lanes (`uoi`, `literacy`, `math`).

## Consequences

- Hilson has a focused, visually stimulating, and curriculum-aligned set of tools for both digital play and paper practice.
- The project's QA pipeline (`npm run qa:curriculum`) is updated and preserved, ensuring all links, meta tags, and touch targets pass checks.
- Build artifacts are reproducible through `npm run build`.
