# Pictograph and Tally Games Plan (Grade 1)

## Scope

- Create two pure HTML5 games in `src/math/`.
- Audience: first-grade students.
- Mode: short mission (10 questions per game).
- Language: bilingual English + Chinese.
- Input style: multiple choice only.

## Learning Goals

- Read simple pictographs where one icon represents one item.
- Read tally marks and convert to numbers.
- Compare values (more, fewer, same).
- Use chart information to answer practical questions.

## Game 1: Story Journey

- File: `src/math/pictograph_tally_story_journey.html`
- Theme: Help a character prepare items for a class picnic.
- Flow:
  1. Start screen with objective
  2. 10 missions (mixed pictograph/tally questions)
  3. Instant feedback and encouragement
  4. End screen with stars and replay
- Question types:
  - Count from pictograph
  - Read tally total
  - Compare two categories
  - Find most/least

## Game 2: Quiz Arcade

- File: `src/math/pictograph_tally_quiz_arcade.html`
- Theme: Fast quiz cards with energetic arcade visuals.
- Flow:
  1. Start screen
  2. 10-card mission
  3. Combo meter for consecutive correct answers
  4. Final summary and replay
- Question types:
  - Number from tally
  - Number from pictograph
  - Which is greater/less
  - True interpretation of chart

## UX Rules for Grade 1

- Large tap targets (>= 44px).
- Minimal text, icon-first visuals.
- Friendly positive feedback on wrong answers.
- One task at a time, no scrolling required.
- High contrast and clear spacing.

## Technical Notes

- No build step and no external JS framework.
- Single-file HTML for each game (embedded CSS + JS).
- Responsive for tablet and desktop.
- Deterministic question pool with light randomization.

## Teacher Use

- Use Story Journey for guided class play.
- Use Quiz Arcade for quick review practice.
- Optional extension: ask students to explain why each answer is correct.
