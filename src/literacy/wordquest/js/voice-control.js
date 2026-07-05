/**
 * WordQuest - Voice Control Module
 *
 * Wires up the in-game voice/accent switcher UI.
 * Populates the voice dropdown, wires accent buttons, and restores
 * the saved preference. Also provides showVoiceControl() to toggle
 * visibility of the switcher vs the PYP Map link.
 */

import { speech } from './audio.js';

/**
 * Initialize the voice switcher UI.
 * Populates the voice dropdown, wires accent buttons, restores saved preference.
 * Called once on DOMContentLoaded.
 */
export function initVoiceControl() {
  const switcher = document.getElementById('voice-switcher');
  if (!switcher) return;

  const select = switcher.querySelector('.voice-select');
  const accentBtns = switcher.querySelectorAll('.accent-btn');
  if (!select || !accentBtns.length) return;

  /** Populate the <select> with available English voices, grouped by accent. */
  function populateVoices() {
    const voices = speech.getVoices();
    select.innerHTML = '';

    // Default option
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = 'Default';
    select.appendChild(defOpt);

    // Group: American English
    const usVoices = voices.filter(v => v.lang.startsWith('en-US'));
    if (usVoices.length) {
      const grp = document.createElement('optgroup');
      grp.label = '\uD83C\uDDFA\uD83C\uDDF8 American';
      for (const v of usVoices) {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = v.name;
        grp.appendChild(opt);
      }
      select.appendChild(grp);
    }

    // Group: British English
    const ukVoices = voices.filter(v => v.lang.startsWith('en-GB'));
    if (ukVoices.length) {
      const grp = document.createElement('optgroup');
      grp.label = '\uD83C\uDDEC\uD83C\uDDE7 British';
      for (const v of ukVoices) {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = v.name;
        grp.appendChild(opt);
      }
      select.appendChild(grp);
    }

    // Group: Other English
    const otherVoices = voices.filter(v =>
      !v.lang.startsWith('en-US') && !v.lang.startsWith('en-GB'));
    if (otherVoices.length) {
      const grp = document.createElement('optgroup');
      grp.label = 'Other English';
      for (const v of otherVoices) {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        grp.appendChild(opt);
      }
      select.appendChild(grp);
    }

    // Sync select value with current speech preference
    // (after restorePreference has run)
    syncSelectValue();
  }

  /** Sync the <select> value to match speech._selectedVoice */
  function syncSelectValue() {
    // We can't directly read _selectedVoice.voiceURI, so we check localStorage
    try {
      const saved = localStorage.getItem('wq_voice');
      if (saved) select.value = saved;
      else select.value = '';
    } catch (e) {
      select.value = '';
    }
  }

  /** Update active state on accent buttons */
  function syncAccentButtons() {
    let currentAccent = 'default';
    try {
      currentAccent = localStorage.getItem('wq_accent') || 'default';
    } catch (e) { /* non-critical */ }
    accentBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.accent === currentAccent);
    });
  }

  // Accent button click
  accentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const accent = btn.dataset.accent;
      speech.setAccent(accent);
      // Clear voice-specific selection when switching accent
      try { localStorage.removeItem('wq_voice'); } catch (e) {}
      syncAccentButtons();
      select.value = '';
      // Preview: speak a sample word
      try { speech.speak('hello'); } catch (e) { /* non-critical */ }
    });
  });

  // Voice select change
  select.addEventListener('change', () => {
    const voiceURI = select.value;
    if (voiceURI) {
      speech.setVoice(voiceURI);
      // Clear accent when specific voice is chosen
      try { localStorage.removeItem('wq_accent'); } catch (e) {}
      syncAccentButtons();
    } else {
      speech.setAccent('default');
      syncAccentButtons();
    }
    // Preview
    try { speech.speak('hello'); } catch (e) { /* non-critical */ }
  });

  // Listen for async voice loading (Chrome)
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.addEventListener('voiceschanged', populateVoices);
  }

  // Initial population (voices may already be available in Safari)
  populateVoices();
  syncAccentButtons();
}

/**
 * Toggle visibility of the voice switcher and PYP Map link.
 * @param {boolean} show - true = show voice switcher (hide PYP Map); false = reverse
 */
export function showVoiceControl(show) {
  const switcher = document.getElementById('voice-switcher');
  const mapLink = document.querySelector('.pyp-map-link');
  if (switcher) switcher.style.display = show ? '' : 'none';
  if (mapLink) mapLink.style.display = show ? 'none' : '';
}
