/**
 * AudioManager - Web Speech API TTS and Sound Effects
 * Handles all audio output for the game.
 */

class AudioManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.currentVoice = null;
    this.accent = 'US'; // 'US' or 'UK'
    this.speechUnlocked = false; // Track if speech has been unlocked on iOS
    
    // Voice preferences (will try to match these)
    this.voicePreferences = {
      US: ['Google US English', 'Samantha','Microsoft David', 'Alex' ],
      UK: ['Google UK English Female', 'Google UK English Male', 'Microsoft George', 'Daniel']
    };
    
    // TTS settings
    this.rate = 0.9;
    this.pitch = 1.0;
    this.volume = 1.0;
    
    // Sound effects (using Web Audio API generated sounds)
    this.audioContext = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the audio manager
   */
  init() {
    // Load voices (may need to wait for them to load)
    this.loadVoices();
    
    // Some browsers need this event to get voices
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    
    // Initialize Web Audio context for sound effects
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[AudioManager] Web Audio API not available');
    }
    
    console.log('[AudioManager] Initialized');
  }
  
  /**
   * Load available voices
   */
  loadVoices() {
    this.voices = this.synth.getVoices();
    this.selectVoiceForAccent(this.accent);
    console.log(`[AudioManager] Loaded ${this.voices.length} voices`);
  }
  
  /**
   * Select the best voice for the current accent
   * @param {String} accent - 'US' or 'UK'
   */
  selectVoiceForAccent(accent) {
    this.accent = accent;
    const preferences = this.voicePreferences[accent] || this.voicePreferences.US;
    
    // Try to find a matching voice
    for (const pref of preferences) {
      const voice = this.voices.find(v => 
        v.name.includes(pref) || v.name.toLowerCase().includes(pref.toLowerCase())
      );
      if (voice) {
        this.currentVoice = voice;
        console.log(`[AudioManager] Selected voice: ${voice.name}`);
        return;
      }
    }
    
    // Fallback: find any English voice
    const englishVoice = this.voices.find(v => 
      v.lang.startsWith('en') && 
      (accent === 'UK' ? v.lang.includes('GB') : v.lang.includes('US'))
    );
    
    if (englishVoice) {
      this.currentVoice = englishVoice;
    } else if (this.voices.length > 0) {
      // Last resort: use first available voice
      this.currentVoice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
    }
    
    if (this.currentVoice) {
      console.log(`[AudioManager] Fallback voice: ${this.currentVoice.name}`);
    }
  }
  
  /**
   * Set the accent (US or UK)
   * @param {String} accent - 'US' or 'UK'
   */
  setAccent(accent) {
    if (accent === 'US' || accent === 'UK') {
      this.selectVoiceForAccent(accent);
    }
  }
  
  /**
   * Get current accent
   * @returns {String}
   */
  getAccent() {
    return this.accent;
  }
  
  /**
   * Speak text using TTS
   * @param {String} text - Text to speak
   * @param {Object} options - Optional settings (rate, pitch, volume)
   * @returns {Promise} Resolves when speech is complete
   */
  async speak(text, options = {}) {
    console.log(`[AudioManager] ━━━ Speaking: "${text}" ━━━`);
    
    // CRITICAL for iPad: Warn if not unlocked, but proceed
    if (!this.speechUnlocked) {
      console.warn('[AudioManager] ⚠️ Speech not unlocked yet! This may fail on iPad.');
    }
    
    // 1. Cancel previous
    this.synth.cancel();
    
    // 2. DELAY (Critical for iOS)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 3. Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Store utterance in instance to prevent Garbage Collection (Chromium/Webkit bug)
    this.currentUtterance = utterance;
    
    // 4. Set voice
    if (this.currentVoice) {
      utterance.voice = this.currentVoice;
    }
    
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    utterance.volume = options.volume || this.volume;
    
    // Create a promise for completion tracking
    return new Promise((resolve) => {
      let resolved = false;
      
      utterance.onstart = () => console.log('[AudioManager] ✓ Speech START');
      
      utterance.onend = () => {
        if (!resolved) {
          resolved = true;
          console.log('[AudioManager] ✓ Speech END');
          this.currentUtterance = null;
          resolve();
        }
      };
      
      utterance.onerror = (e) => {
        if (!resolved) {
          resolved = true;
          console.error('[AudioManager] Speech error:', e.error);
          this.currentUtterance = null;
          resolve();
        }
      };
      
      try {
        console.log('[AudioManager] calling speak()');
        this.synth.speak(utterance);
        
        // Timeout safety
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('[AudioManager] Speech timeout, forcing resolve');
            this.currentUtterance = null;
            resolve();
          }
        }, 5000); // 5s timeout
      } catch (e) {
        console.error(e);
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }
    });
  }
  
  /**
   * Ensure voices are loaded (important for iOS)
   * @returns {Promise}
   */
  async ensureVoicesLoaded() {
    if (this.voices.length > 0) {
      return Promise.resolve();
    }
    
    console.log('[AudioManager] Waiting for voices to load...');
    
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20;
      
      const checkVoices = () => {
        this.loadVoices();
        attempts++;
        
        if (this.voices.length > 0) {
          console.log(`[AudioManager] Voices loaded (${this.voices.length} available)`);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn('[AudioManager] Timeout waiting for voices');
          resolve(); // Continue anyway
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      
      checkVoices();
    });
  }
  
  /**
   * Speak "Spell: [word]" for gameplay
   * @param {String} word - The word to spell
   */
  async speakWord(word) {
    await this.ensureVoicesLoaded();
    await this.speak(`Spell: ${word.toLowerCase()}`, { rate: 0.85 });
  }
  
  /**
   * Speak a letter
   * @param {String} letter - Single letter
   */
  async speakLetter(letter) {
    await this.speak(letter, { rate: 0.8 });
  }
  
  /**
   * Play a test sound for voice selection
   */
  async playTestSound() {
    // Ensure voices are loaded before testing
    await this.ensureVoicesLoaded();
    
    // Re-select voice to ensure we have the correct object
    this.selectVoiceForAccent(this.accent);
    
    await this.speak('Hello!', { rate: 1.0 });
  }
  
  /**
   * Play the "correct" sound effect
   */
  playCorrectSound() {
    this.playTone(880, 0.15, 'sine', 0.5);
    setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.4), 100);
  }
  
  /**
   * Play the "wrong" sound effect
   */
  playWrongSound() {
    this.playTone(200, 0.3, 'square', 0.3);
  }
  
  /**
   * Play the "grab" sound effect
   */
  playGrabSound() {
    this.playTone(400, 0.1, 'sine', 0.3);
  }
  
  /**
   * Play the "drop" sound effect
   */
  playDropSound() {
    this.playTone(300, 0.15, 'triangle', 0.3);
  }
  
  /**
   * Play a victory fanfare
   */
  async playVictorySound() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    for (let i = 0; i < notes.length; i++) {
      this.playTone(notes[i], 0.2, 'sine', 0.4);
      await this.delay(150);
    }
  }
  
  /**
   * Play a simple tone using Web Audio API
   * @param {Number} frequency - Frequency in Hz
   * @param {Number} duration - Duration in seconds
   * @param {String} type - Oscillator type (sine, square, triangle, sawtooth)
   * @param {Number} volume - Volume (0-1)
   */
  playTone(frequency, duration, type = 'sine', volume = 0.5) {
    if (!this.audioContext) return;
    
    // Always try to resume audio context if suspended (important for iOS)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.warn('[AudioManager] Could not resume AudioContext:', err);
      });
    }
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.error('[AudioManager] Error playing tone:', error);
    }
  }
  
  /**
   * Helper delay function
   * @param {Number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Unlock audio on iOS/iPad (must be called on user interaction)
   * iOS requires AudioContext to be resumed after a user gesture
   */
  async unlockAudio() {
    console.log('[AudioManager] Unlocking audio NOW...');
    
    // 1. Web Audio API Unlock (Fire and forget, don't await)
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(e => console.warn(e));
      }
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.01; 
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(0);
        oscillator.stop(0.1);
      } catch (e) { console.warn(e); }
    }
    
    // 2. Speech Synthesis Unlock - INSTANT EXECUTION
    // CRITICAL: Do not await anything here. We must reuse the user gesture immediately.
    
    this.synth.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance('Welcome');
    utterance.volume = 1.0; 
    utterance.rate = 1.2;
    
    // Use whatever voices we have right now without waiting
    if (this.voices.length > 0) {
        const voice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
        if (voice) utterance.voice = voice;
    }
    
    console.log('[AudioManager] Calling synth.speak() synchronously inside unlock...');
    this.synth.speak(utterance);
    
    // 3. Wait for completion (so we don't start camera too soon)
    return new Promise(resolve => {
        let resolved = false;
        
        utterance.onend = () => {
            if (!resolved) {
                resolved = true;
                console.log('[AudioManager] Unlock speech finished');
                this.speechUnlocked = true;
                resolve();
            }
        };
        
        // Short timeout - don't block the user too long if audio fails
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.log('[AudioManager] Unlock speech timeout - proceeding anyway');
                this.speechUnlocked = true;
                resolve();
            }
        }, 1500);
    });
  }
  
  /**
   * Stop all audio
   */
  stop() {
    this.synth.cancel();
  }
  
  /**
   * Check if TTS is available
   * @returns {Boolean}
   */
  isTTSAvailable() {
    return 'speechSynthesis' in window;
  }
  
  /**
   * Get list of available voices
   * @returns {Array}
   */
  getAvailableVoices() {
    return this.voices;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
