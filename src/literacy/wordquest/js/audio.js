/**
 * WordQuest - Audio Module
 * Provides speech synthesis (Web Speech API synced with localStorage['ib_pyp_voice_name'])
 * and synthetic Web Audio API sound effects (no external audio files).
 */

export const JOKE_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox|fred|junior|kathy|ralph|wobble/i;

export const speech = {
  _unlocked: false,
  /** @type {SpeechSynthesisVoice | null} */
  _selectedVoice: null,

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
   * Return natural English voices (filtering novelty/joke system voices).
   * @returns {SpeechSynthesisVoice[]}
   */
  getVoices() {
    try {
      const all = speechSynthesis.getVoices() || [];
      let en = all.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('en') && !JOKE_VOICES.test(v.name));
      if (!en.length) en = all.filter(v => !JOKE_VOICES.test(v.name));
      if (!en.length) en = all;

      const PREFERRED = ['samantha', 'daniel', 'google uk english female', 'google us english', 'karen', 'serena', 'oliver', 'ava', 'allison', 'kate'];
      return [...en].sort((a, b) => {
        const aIdx = PREFERRED.findIndex(p => a.name.toLowerCase().includes(p));
        const bIdx = PREFERRED.findIndex(p => b.name.toLowerCase().includes(p));
        const aRank = aIdx === -1 ? 999 : aIdx;
        const bRank = bIdx === -1 ? 999 : bIdx;
        if (aRank !== bRank) return aRank - bRank;
        return a.name.localeCompare(b.name);
      });
    } catch (e) {
      return [];
    }
  },

  /**
   * Set voice by name and persist to shared localStorage['ib_pyp_voice_name'].
   * @param {string} voiceName
   */
  setVoiceByName(voiceName) {
    const voices = this.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      this._selectedVoice = voice;
      try { localStorage.setItem('ib_pyp_voice_name', voice.name); } catch (e) { /* non-critical */ }
    }
  },

  getSelectedVoice() {
    if (this._selectedVoice) return this._selectedVoice;
    this.restorePreference();
    return this._selectedVoice;
  },

  restorePreference() {
    const voices = this.getVoices();
    if (!voices.length) return;
    let saved = null;
    try { saved = localStorage.getItem('ib_pyp_voice_name'); } catch (e) { /* non-critical */ }
    const chosen = (saved && voices.find(v => v.name === saved)) ||
      voices.find(v => v.default) ||
      voices[0] || null;
    this._selectedVoice = chosen;
  },

  speak(text, { rate = 0.85, lang = 'en-US' } = {}) {
    if (!this._unlocked) this.unlock();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      const chosen = this.getSelectedVoice();
      if (chosen) {
        u.voice = chosen;
        u.lang = chosen.lang;
      } else {
        u.lang = lang;
      }
      speechSynthesis.speak(u);
    } catch (e) {
      console.error('[WordQuest] speech failed:', e);
    }
  }
};

export const sfx = {
  _ctx: null,
  _unlocked: false,

  unlock() {
    if (this._unlocked) {
      if (this._ctx && this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === 'suspended') this._ctx.resume();
      this._unlocked = true;
    } catch (e) {
      console.error('[WordQuest] audio init failed:', e);
    }
  },

  _tone(freq, duration, type = 'sine', volume = 0.25) {
    if (!this._ctx) this.unlock();
    if (!this._ctx) return;
    try {
      const t = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch (e) { /* non-critical */ }
  },

  /** Crisp subtle tap sound for letter keys & UI buttons. */
  click() {
    this._tone(580, 0.055, 'triangle', 0.14);
  },

  correct() {
    this._tone(523.25, 0.12, 'sine', 0.25);
    setTimeout(() => this._tone(659.25, 0.12, 'sine', 0.25), 80);
    setTimeout(() => this._tone(783.99, 0.18, 'sine', 0.25), 160);
  },

  wrong() {
    this._tone(220, 0.15, 'sawtooth', 0.14);
    setTimeout(() => this._tone(180, 0.2, 'sawtooth', 0.14), 100);
  },

  complete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'sine', 0.28), i * 120));
  },

  found() {
    this._tone(659.25, 0.1, 'sine', 0.25);
    setTimeout(() => this._tone(880, 0.15, 'sine', 0.25), 60);
  },

  note(index) {
    if (!this._ctx) this.unlock();
    if (!this._ctx) return;
    const freqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const i = Math.min(Math.max(index, 0), freqs.length - 1);
    try {
      const t = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i];
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.setValueAtTime(0.22, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch (e) { /* non-critical */ }
  }
};
