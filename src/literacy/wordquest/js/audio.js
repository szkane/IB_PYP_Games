/**
 * WordQuest - Audio Module
 * Provides speech synthesis (Web Speech API) and sound effects (Web Audio API).
 * No audio files required - sfx uses oscillator-generated tones.
 */

/**
 * Speech synthesis using Web Speech API.
 * Must be unlocked on first user gesture (iOS Safari requirement).
 */
export const speech = {
  _unlocked: false,
  /** @type {SpeechSynthesisVoice | null} */
  _selectedVoice: null,
  _accent: 'default',

  /**
   * Unlock speech synthesis on first user gesture.
   * Triggers engine load by speaking an empty utterance.
   * Restores any saved voice preference and listens for async voice loading.
   */
  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    try {
      speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    } catch (e) {
      console.error('[WordQuest] speech unlock failed:', e);
    }
    this.restorePreference();
    try {
      speechSynthesis.addEventListener('voiceschanged', () => this.restorePreference());
    } catch (e) { /* non-critical */ }
  },

  /**
   * Return available English voices from the speech synthesis engine.
   * @returns {SpeechSynthesisVoice[]}
   */
  getVoices() {
    try {
      return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    } catch (e) {
      return [];
    }
  },

  /**
   * Set the accent preference by selecting the first matching voice.
   * @param {string} accent - 'default' | 'us' | 'uk'
   */
  setAccent(accent) {
    this._accent = accent;
    if (accent === 'default') {
      this._selectedVoice = null;
    } else if (accent === 'us') {
      this._selectedVoice = this.getVoices().find(v => v.lang.startsWith('en-US')) || null;
    } else if (accent === 'uk') {
      this._selectedVoice = this.getVoices().find(v => v.lang.startsWith('en-GB')) || null;
    }
    try { localStorage.setItem('wq_accent', accent); } catch (e) { /* non-critical */ }
  },

  /**
   * Set a specific voice by its voiceURI.
   * @param {string} voiceURI - The voiceURI of a SpeechSynthesisVoice
   */
  setVoice(voiceURI) {
    const voice = this.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) {
      this._selectedVoice = voice;
      try { localStorage.setItem('wq_voice', voiceURI); } catch (e) { /* non-critical */ }
    }
  },

  /**
   * Restore saved voice/accent preference from localStorage.
   * Called after unlock and on voiceschanged events.
   */
  restorePreference() {
    let savedVoice = null;
    let savedAccent = null;
    try { savedVoice = localStorage.getItem('wq_voice'); } catch (e) { /* non-critical */ }
    try { savedAccent = localStorage.getItem('wq_accent'); } catch (e) { /* non-critical */ }
    if (savedVoice) {
      this.setVoice(savedVoice);
    } else if (savedAccent) {
      this.setAccent(savedAccent);
    }
  },

  /**
   * Speak the given text aloud.
   * @param {string} text - Text to speak
   * @param {Object} opts - Options
   * @param {number} [opts.rate=0.85] - Speech rate (0.1–10)
   * @param {string} [opts.lang='en-US'] - Language code
   */
  speak(text, { rate = 0.85, lang = 'en-US' } = {}) {
    if (!this._unlocked) this.unlock();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      if (this._selectedVoice) {
        u.voice = this._selectedVoice;
        u.lang = this._selectedVoice.lang;
      } else {
        u.lang = lang;
        const voices = speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en'));
        if (enVoice) u.voice = enVoice;
      }
      speechSynthesis.speak(u);
    } catch (e) {
      console.error('[WordQuest] speech failed:', e);
    }
  }
};

/**
 * Sound effects using Web Audio API (oscillator-based, no audio files).
 * Must be unlocked on first user gesture.
 */
export const sfx = {
  _ctx: null,
  _unlocked: false,

  /**
   * Unlock audio context on first user gesture.
   * Creates AudioContext and resumes if suspended.
   */
  unlock() {
    if (this._unlocked) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === 'suspended') this._ctx.resume();
      this._unlocked = true;
    } catch (e) {
      console.error('[WordQuest] audio init failed:', e);
    }
  },

  /**
   * Play a single tone.
   * @param {number} freq - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {string} [type='sine'] - Oscillator type
   * @param {number} [volume=0.3] - Peak volume (0–1)
   */
  _tone(freq, duration, type = 'sine', volume = 0.3) {
    if (!this._ctx) return;
    try {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this._ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.start();
      osc.stop(this._ctx.currentTime + duration);
    } catch (e) {
      // Silently ignore tone errors - non-critical
    }
  },

  /**
   * Correct answer sound: ascending C5→E5→G5.
   */
  correct() {
    this._tone(523.25, 0.12, 'sine', 0.25);
    setTimeout(() => this._tone(659.25, 0.12, 'sine', 0.25), 80);
    setTimeout(() => this._tone(783.99, 0.18, 'sine', 0.25), 160);
  },

  /**
   * Wrong answer sound: low descending buzz.
   */
  wrong() {
    this._tone(220, 0.15, 'sawtooth', 0.15);
    setTimeout(() => this._tone(180, 0.2, 'sawtooth', 0.15), 100);
  },

  /**
   * Category complete sound: cheerful ascending arpeggio C-E-G-C.
   */
  complete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'sine', 0.3), i * 120));
  },

  /**
   * Word found sound (word search): short ascending pair.
   */
  found() {
    this._tone(659.25, 0.1, 'sine', 0.25);
    setTimeout(() => this._tone(880, 0.15, 'sine', 0.25), 60);
  },

  /**
   * Play a musical scale note based on selection count.
   * Used during word search sliding selection.
   * @param {number} index - 0-based note index (0=do, 1=re, ..., 7=do')
   */
  note(index) {
    if (!this._ctx) return;
    // C major scale: do, re, mi, fa, sol, la, ti, do'
    const freqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const i = Math.min(Math.max(index, 0), freqs.length - 1);
    try {
      const t = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i];
      gain.gain.setValueAtTime(0.22, t);
      // Hold for ~0.1s then exponential fade-out tail to 0.25s
      gain.gain.setValueAtTime(0.22, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch (e) {
      // Silently ignore - non-critical
    }
  }
};
