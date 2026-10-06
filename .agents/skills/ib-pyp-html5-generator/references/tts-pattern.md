# Text-to-Speech (TTS) & Accent Control Pattern

Reference implementation for speech synthesis across the IB PYP Games hub. All games share the voice preference via `localStorage['ib_pyp_voice_name']`.

## 1. HTML Markup

Place this directly on the top-right of your navigation bar (`.nav-bar`):

```html
<!-- TTS Accent Control Dropdown (Top Right) -->
<div class="tts-dropdown-wrap" id="ttsDropdownWrap">
  <button type="button" class="tts-trigger" id="ttsTrigger" aria-haspopup="menu" aria-expanded="false" title="Select Voice Accent">
    <span class="tts-trigger-flag" id="ttsFlag">🇬🇧</span>
    <span class="tts-trigger-label" id="ttsLabel">Voice</span>
    <span class="tts-arrow">▾</span>
  </button>
  <div class="tts-menu" id="ttsMenu" role="menu">
    <div class="tts-menu-header">Select Voice Accent</div>
    <div class="tts-radio-group" id="ttsRadioList" role="radiogroup"></div>
  </div>
</div>
```

Place speaker buttons (`.btn-speaker`) next to prompts, questions, stories, or items:

```html
<button type="button" class="btn-speaker" id="btnSpeakPrompt" title="Read aloud" aria-label="Read aloud">🔊</button>
```

---

## 2. CSS Styles

Add these styles directly to your page `<style>` block:

```css
/* Neobrutalism TTS Radio Dropdown */
.tts-dropdown-wrap {
  position: relative;
  display: inline-block;
  user-select: none;
  font-family: inherit;
}
.tts-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #FFF;
  border: 2.5px solid var(--ink);
  border-radius: 10px;
  box-shadow: 3px 3px 0 var(--ink);
  padding: 6px 12px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--ink);
  cursor: pointer;
  min-height: 38px;
  transition: transform 0.1s, box-shadow 0.1s;
}
.tts-trigger:hover {
  background: #FEF08A;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--ink);
}
.tts-trigger:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--ink);
}
.tts-arrow {
  font-size: 0.75rem;
  transition: transform 0.15s ease;
}
.tts-dropdown-wrap.open .tts-arrow {
  transform: rotate(180deg);
}
.tts-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 250px;
  max-width: 320px;
  max-height: 290px;
  overflow-y: auto;
  background: #FFF;
  border: 3px solid var(--ink);
  border-radius: 12px;
  box-shadow: 4px 4px 0 var(--ink);
  padding: 6px;
  z-index: 1000;
  flex-direction: column;
  gap: 3px;
}
.tts-dropdown-wrap.open .tts-menu {
  display: flex;
}
.tts-menu-header {
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #6B7280;
  padding: 4px 8px 6px;
  border-bottom: 2px solid #E5E7EB;
  margin-bottom: 3px;
}
.tts-radio-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tts-radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink);
  text-align: left;
  width: 100%;
  transition: background 0.1s, border-color 0.1s;
}
.tts-radio-item:hover {
  background: #FEF9C3;
  border-color: var(--ink);
}
.tts-radio-item.active {
  background: #E0F2FE;
  border-color: var(--ink);
  font-weight: 800;
}
.tts-radio-circle {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #FFF;
}
.tts-radio-item.active .tts-radio-circle::after {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink);
}
.tts-item-flag {
  font-size: 1rem;
}
.tts-item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* Speaker Button & Pulse Animation */
.btn-speaker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #FEF08A;
  border: 2px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  border-radius: 8px;
  width: 38px;
  height: 38px;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1;
  flex-shrink: 0;
  touch-action: manipulation;
  transition: transform 0.1s, box-shadow 0.1s, background-color 0.1s;
}
.btn-speaker:hover {
  background: #FDE047;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}
.btn-speaker:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink);
}
.btn-speaker.speaking {
  background: #86EFAC;
  animation: ttsPulse 0.7s infinite alternate;
}
@keyframes ttsPulse {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}
```

---

## 3. JavaScript `TTS_MANAGER` Implementation

Paste this object directly into your `<script>` and call `TTS_MANAGER.init()` on startup:

```javascript
const TTS_MANAGER = {
  currentVoiceName: '',
  wrap: null,
  trigger: null,
  menu: null,
  flag: null,
  label: null,
  list: null,

  init() {
    this.wrap = document.getElementById('ttsDropdownWrap');
    this.trigger = document.getElementById('ttsTrigger');
    this.menu = document.getElementById('ttsMenu');
    this.flag = document.getElementById('ttsFlag');
    this.label = document.getElementById('ttsLabel');
    this.list = document.getElementById('ttsRadioList');

    if (!this.trigger) return;

    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.wrap.classList.toggle('open');
      this.trigger.setAttribute('aria-expanded', this.wrap.classList.contains('open'));
    });

    document.addEventListener('click', (e) => {
      if (this.wrap && !this.wrap.contains(e.target)) {
        this.wrap.classList.remove('open');
        this.trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.wrap) {
        this.wrap.classList.remove('open');
        this.trigger.setAttribute('aria-expanded', 'false');
      }
    });

    if (window.speechSynthesis) {
      this.populateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.populateVoices();
      }
    }
  },

  populateVoices() {
    if (!window.speechSynthesis || !this.list) return;
    const voices = window.speechSynthesis.getVoices();
    let englishVoices = voices.filter(v => {
      const lang = v.lang.toLowerCase().replace('_', '-');
      return lang.startsWith('en');
    });

    if (englishVoices.length === 0) englishVoices = voices;
    if (englishVoices.length === 0) return;

    // Prioritization: UK English Female -> US English Female/Google US -> any UK -> any US -> others
    englishVoices.sort((a, b) => {
      const aName = a.name;
      const bName = b.name;
      const isA_UK_Fem = aName.includes('Google UK English Female') || (aName.includes('UK English') && aName.includes('Female'));
      const isB_UK_Fem = bName.includes('Google UK English Female') || (bName.includes('UK English') && bName.includes('Female'));
      if (isA_UK_Fem && !isB_UK_Fem) return -1;
      if (!isA_UK_Fem && isB_UK_Fem) return 1;

      const isA_US = aName.includes('Google US English') || (aName.includes('US English') && aName.includes('Female'));
      const isB_US = bName.includes('Google US English') || (bName.includes('US English') && bName.includes('Female'));
      if (isA_US && !isB_US) return -1;
      if (!isA_US && isB_US) return 1;

      const aUK = a.lang.toLowerCase().includes('gb');
      const bUK = b.lang.toLowerCase().includes('gb');
      if (aUK && !bUK) return -1;
      if (!aUK && bUK) return 1;

      const aUS = a.lang.toLowerCase().includes('us');
      const bUS = b.lang.toLowerCase().includes('us');
      if (aUS && !bUS) return -1;
      if (!aUS && bUS) return 1;

      return aName.localeCompare(bName);
    });

    const saved = localStorage.getItem('ib_pyp_voice_name');
    let selected = null;
    if (saved) selected = englishVoices.find(v => v.name === saved);
    if (!selected) selected = englishVoices.find(v => v.name.includes('Google UK English Female') || (v.name.includes('UK English') && v.name.includes('Female')));
    if (!selected) selected = englishVoices.find(v => v.name.includes('Google US English'));
    if (!selected) selected = englishVoices.find(v => v.lang.toLowerCase().includes('gb'));
    if (!selected) selected = englishVoices.find(v => v.lang.toLowerCase().includes('us'));
    if (!selected) selected = englishVoices[0];

    this.currentVoiceName = selected ? selected.name : '';

    this.renderMenu(englishVoices);
    this.updateTriggerUI(selected);
  },

  renderMenu(voices) {
    this.list.innerHTML = '';
    voices.forEach(v => {
      const isUK = v.lang.toLowerCase().replace('_', '-').includes('gb');
      const flag = isUK ? '🇬🇧' : '🇺🇸';
      const region = isUK ? 'UK' : 'US';
      const isActive = v.name === this.currentVoiceName;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tts-radio-item ${isActive ? 'active' : ''}`;
      btn.setAttribute('role', 'menuitemradio');
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      btn.innerHTML = `
        <span class="tts-radio-circle"></span>
        <span class="tts-item-flag">${flag}</span>
        <span class="tts-item-name">${v.name} (${region})</span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectVoice(v);
        this.wrap.classList.remove('open');
        this.trigger.setAttribute('aria-expanded', 'false');
      });

      this.list.appendChild(btn);
    });
  },

  selectVoice(v) {
    this.currentVoiceName = v.name;
    localStorage.setItem('ib_pyp_voice_name', v.name);
    this.updateTriggerUI(v);
    this.list.querySelectorAll('.tts-radio-item').forEach(btn => {
      const isMatch = btn.querySelector('.tts-item-name').textContent.includes(v.name);
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  },

  updateTriggerUI(v) {
    if (!v) return;
    const isUK = v.lang.toLowerCase().replace('_', '-').includes('gb');
    this.flag.textContent = isUK ? '🇬🇧' : '🇺🇸';
    let shortName = v.name.replace(/^(Google|Microsoft|Apple)\s+/i, '');
    if (shortName.length > 14) shortName = shortName.substring(0, 12) + '...';
    this.label.textContent = shortName;
  },

  speak(text, onEnd) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (!text || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voiceName = this.currentVoiceName || localStorage.getItem('ib_pyp_voice_name');
    if (voiceName) {
      const match = voices.find(v => v.name === voiceName);
      if (match) utterance.voice = match;
    }
    utterance.rate = 0.85; // Age-appropriate, clear pace for young learners
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
  }
};
```

---

## 4. Triggering Speech from UI Components

### Click Speaker Button (Explicit User Request)
```javascript
const btnSpeak = document.getElementById('btnSpeakPrompt');
btnSpeak.addEventListener('click', () => {
  btnSpeak.classList.add('speaking');
  TTS_MANAGER.speak(currentPromptText, () => {
    btnSpeak.classList.remove('speaking');
  });
});
```

### Auto-Speak on Card or Question Display (Grade 1-2 Math & Phonics)
```javascript
function showQuestion(q) {
  // Update DOM...
  const btnSpeak = document.getElementById('btnSpeakQuestion');
  if (btnSpeak) btnSpeak.classList.add('speaking');
  TTS_MANAGER.speak(q.textToRead, () => {
    if (btnSpeak) btnSpeak.classList.remove('speaking');
  });
}
```

### Debounced Continuous Speak (Slider or Drag Interaction)
```javascript
let ttsDebounceTimer = null;
function onAngleChanged(deg, name) {
  clearTimeout(ttsDebounceTimer);
  ttsDebounceTimer = setTimeout(() => {
    TTS_MANAGER.speak(`${deg} degrees, ${name}`);
  }, 400);
}
```
