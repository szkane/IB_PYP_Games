# Web Audio & Interaction Patterns for Kids

Standard audio feedback, input interaction handling, and state control patterns developed across the IB PYP Games project.

## 1. Web Audio Synthesizer (Zero External Dependencies)

Use pure Web Audio oscillators so games operate reliably offline, fast, and without missing sound files. Unlocks automatically on the first user interaction (click/touch).

```javascript
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Crisp tactile button click
  playClick() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Upbeat arpeggio success chime
  playCorrect() {
    this.init();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.18, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.2);
    });
  }

  // Low gentle boop/buzz error feedback (never harsh or punishing)
  playBuzz() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Victory / completion fanfare
  playFanfare() {
    this.init();
    const t = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.2, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + 0.65);
    });
  }
}

const sfx = new SoundFX();
```

---

## 2. Option Shuffling (Anti-Pattern Prevention)

Never place the correct answer in a predictable first position. Always shuffle choices before rendering:

```javascript
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

---

## 3. Touch-Friendly Steppers & Numeric Inputs on iPad

Native HTML number input spin buttons (`<input type="number">`) are small and difficult for children to tap on iPad touch screens. Always provide large `+` and `-` button steppers:

```html
<div class="stepper-wrap">
  <button type="button" class="btn-stepper" id="btnDec" aria-label="Decrease value">-</button>
  <span class="stepper-display" id="valDisplay">5</span>
  <button type="button" class="btn-stepper" id="btnInc" aria-label="Increase value">+</button>
</div>
```

```css
.stepper-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #FFF;
  border: 3px solid var(--ink);
  border-radius: 12px;
  padding: 4px;
}
.btn-stepper {
  width: 44px;
  height: 44px;
  background: var(--yellow);
  border: 2px solid var(--ink);
  border-radius: 8px;
  font-size: 1.4rem;
  font-weight: 900;
  cursor: pointer;
  touch-action: manipulation;
}
.stepper-display {
  min-width: 48px;
  text-align: center;
  font-size: 1.3rem;
  font-weight: 900;
}
```

---

## 4. 3D Scenes (Three.js) Interaction Rules

When building 3D spatial models (e.g., Solar System, Angle Explorer, Shadow Simulators):

1. **Never auto-rotate continuously by default**: Continuous camera rotation makes precise clicking frustrating on tablets. Default to a stable perspective.
2. **Provide Pause / Reset Buttons**: Include explicit Neobrutalism buttons to pause simulation time and reset camera angles (`controls.reset()`).
3. **Touch Action Restriction**: Apply `touch-action: none` to 3D canvas containers so touch drags don't trigger page scroll or pinch zoom glitches.
4. **Clean Disposal**: If dynamically loading objects, dispose geometry and material textures to prevent mobile Safari memory crashes.

---

## 5. Multi-Item Selection & Mutual Exclusivity

When a learner picks one item from a selection tray (e.g., selecting an object in a shadow lab, picking a character for a script):
- Ensure state cleanly clears previous selections.
- If showing one target item at a time, hide or deselect all other candidate items to avoid confusing visual overlaps.

---

## 6. Zero Pre-Selection & Clean State Initialization

**CRITICAL RULE FOR ALL CHALLENGES & MISSIONS**:
Never pre-select answers or options in HTML markup or initial JS state. Pre-selected buttons give away the answer or confuse children who haven't made a choice yet.

### HTML Pattern
Buttons start in a neutral, unselected state without the `.active` class. Labels show `❓ Tap to choose` with a dashed border:
```html
<div class="control-row">
  <div class="control-row-header">
    <span>1. Pitch (How High or Low?):</span>
    <span class="choice-badge-neutral" id="lblPitch">❓ Tap to choose</span>
  </div>
  <div class="btn-group">
    <button type="button" class="btn-stepper" id="btnLow">🐘 Low Rumble</button>
    <button type="button" class="btn-stepper" id="btnHigh">🐭 High Squeak</button>
  </div>
</div>
```

```css
.choice-badge-neutral {
  background: #FFF;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1.5px dashed var(--ink);
  font-size: 0.82rem;
  font-weight: 700;
}
.choice-badge-selected {
  background: var(--yellow);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1.5px solid var(--ink);
  font-size: 0.82rem;
  font-weight: 900;
}
```

### JS State Initialization
Initialize choices to `null`:
```javascript
const GAME_STATE = {
  pitchChoice: null,
  volChoice: null
};
```

### Case Switching State Reset
When switching between cases or missions, uncompleted cases must reset their button selections and choices to `null` so each challenge starts fresh:
```javascript
function renderCase(idx) {
  if (!solvedCases[idx]) {
    GAME_STATE.pitchChoice = null;
    GAME_STATE.volChoice = null;
    
    // Clear active classes from buttons
    document.querySelectorAll('.btn-stepper').forEach(b => b.classList.remove('active'));
    
    // Reset badges to neutral dashed prompt
    lblPitch.textContent = '❓ Tap to choose';
    lblPitch.className = 'choice-badge-neutral';
    lblVol.textContent = '❓ Tap to choose';
    lblVol.className = 'choice-badge-neutral';
  }
}
```

---

## 7. Explore-First Sequence & Case Navigation Tabs

### Explore-First Architecture
Never drop a 6–8 year old child directly into a quiz or test case without prior discovery. Always scaffold in two clear steps:
- **Step 1: Free Exploration & Discovery**: Interactive sandbox, real-world discovery cards, audio listening buttons, visual live preview.
- **Step 2: Director Challenge / Mission**: Hands-on problem solving applying what was discovered in Step 1. Include an easy `[⬅️ Back to Explore]` button so the child can return anytime.

### Case Navigation Bar
When multiple challenges exist, do NOT pack multiple cases into one confusing screen. Present one case at a time with a clear case tab bar:
```html
<div class="case-tabs-bar" id="caseTabs">
  <button type="button" class="case-tab-btn active" data-case="0">🦖 Case 1: Dino Stomp</button>
  <button type="button" class="case-tab-btn" data-case="1">🐣 Case 2: Baby Bird</button>
  <button type="button" class="case-tab-btn" data-case="2">🦕 Case 3: Monster Shadow</button>
</div>
```
- Solved cases receive a green background and a `✅` checkmark badge (`case-tab-btn solved`).
- Only show the controls and visual preview relevant to the active case (e.g., hide shadow controls during sound cases).

---

## 8. Audio Etiquette on Page Load

**NEVER auto-play sound effects on page load**:
- Auto-playing sirens, alarms, animal roars, or buzzers on page load startles young children, triggers browser audio policy blocks, and creates chaos in classroom environments.
- When initializing default discovery cards on `DOMContentLoaded`, pass a `playSound = false` parameter:

```javascript
function selectDiscoverItem(itemKey, playSound = false) {
  // Update visual UI...
  if (playSound) {
    soundAudio.playItemSound(itemKey);
  }
}

// On page load: strictly silent initialization
window.addEventListener('DOMContentLoaded', () => {
  selectDiscoverItem('mouse', false);
  selectSignalItem('ambulance', false);
});
```
- Sound effects must ONLY trigger on deliberate user actions (tapping a sound card, clicking a test button, or submitting a solution).

---

## 9. Gentle Guard Checks Before Submission

If a child presses the action/submit button before selecting all required choices:
- **Do NOT fail them or check against null**.
- Show a warm, non-penalizing, helpful reminder pointing upward:
```javascript
btnCheckCase.addEventListener('click', () => {
  if (!GAME_STATE.pitchChoice || !GAME_STATE.volChoice) {
    soundAudio.playBuzz();
    feedbackEl.className = 'mission-feedback try-again';
    feedbackEl.style.display = 'block';
    feedbackEl.textContent = "👆 Please tap both a Pitch (Low or High) and a Volume (Soft or Loud) first!";
    return;
  }
  // Proceed with validation...
});
```

