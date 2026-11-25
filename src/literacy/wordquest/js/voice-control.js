/**
 * WordQuest - Standard IB PYP Neobrutalism Voice Control Module
 * Syncs with localStorage['ib_pyp_voice_name'] and stays visible in the unified top nav bar.
 */

import { speech, sfx } from './audio.js';

export function initVoiceControl() {
  const wrap = document.getElementById('ttsDropdownWrap');
  const trigger = document.getElementById('ttsTrigger');
  const flagEl = document.getElementById('ttsFlag');
  const labelEl = document.getElementById('ttsLabel');
  const listEl = document.getElementById('ttsRadioList');
  if (!wrap || !trigger || !listEl) return;

  function updateTriggerUI(v) {
    if (!v) {
      if (flagEl) flagEl.textContent = '🌐';
      if (labelEl) labelEl.textContent = 'Voice';
      return;
    }
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    if (flagEl) {
      flagEl.textContent = lang.includes('au') ? '🇦🇺' : lang.includes('gb') ? '🇬🇧' : (lang.includes('us') || lang.startsWith('en')) ? '🇺🇸' : '🌐';
    }
    let shortName = (v.name || 'Voice').replace(/^(Google|Microsoft|Apple)\s+/i, '');
    if (shortName.length > 14) shortName = shortName.substring(0, 12) + '...';
    if (labelEl) labelEl.textContent = shortName;
  }

  function populateVoices() {
    const voices = speech.getVoices();
    if (!voices.length) return;
    speech.restorePreference();
    const selected = speech.getSelectedVoice();
    const currentName = selected ? selected.name : '';

    listEl.innerHTML = '';
    voices.slice(0, 15).forEach(v => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      const flag = lang.includes('au') ? '🇦🇺' : lang.includes('gb') ? '🇬🇧' : (lang.includes('us') || lang.startsWith('en')) ? '🇺🇸' : '🌐';
      const region = lang.includes('au') ? 'AU' : lang.includes('gb') ? 'UK' : (lang.includes('us') || lang.startsWith('en')) ? 'US' : (v.lang || 'System');
      const isActive = v.name === currentName;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tts-radio-item${isActive ? ' active' : ''}`;
      btn.setAttribute('role', 'menuitemradio');
      btn.setAttribute('aria-checked', String(isActive));

      const circle = document.createElement('span');
      circle.className = 'tts-radio-circle';
      const flagSpan = document.createElement('span');
      flagSpan.className = 'tts-item-flag';
      flagSpan.textContent = flag;
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tts-item-name';
      nameSpan.textContent = `${v.name} (${region})`;
      btn.append(circle, flagSpan, nameSpan);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.click();
        speech.setVoiceByName(v.name);
        updateTriggerUI(v);
        listEl.querySelectorAll('.tts-radio-item').forEach(b => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-checked', String(active));
        });
        wrap.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        speech.speak('Hello! Let us explore words together!');
      });

      listEl.appendChild(btn);
    });

    updateTriggerUI(selected);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.click();
    wrap.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(wrap.classList.contains('open')));
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.addEventListener('voiceschanged', populateVoices);
  }
  populateVoices();
}

/**
 * Retained as a safe no-op export for API compatibility; both PYP Map and Voice Dropdown
 * remain permanently visible in the unified top nav bar without ever overlapping.
 */
export function showVoiceControl() {}
