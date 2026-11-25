/**
 * Meet MC Words — Interactive Minecraft Vocabulary Flashcards & Quiz
 * Pure English UI chrome, optional CN Hint toggle, Web Audio SoundFX,
 * standard IB PYP TTS voice selector, iPad-friendly quiz, and Passport stamp.
 */

const JOKE_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox|fred|junior|kathy|ralph|wobble/i;

/* ---------- Web Audio SoundFX ---------- */
const SoundFX = {
  ctx: null,
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (_) {}
  },
  _tone(freq, dur, type = 'sine', vol = 0.16, delay = 0) {
    try {
      this.unlock();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (_) {}
  },
  pop() {
    this._tone(540, 0.08, 'triangle', 0.14);
  },
  correct() {
    this._tone(523.25, 0.12, 'sine', 0.18, 0);
    this._tone(659.25, 0.12, 'sine', 0.18, 0.08);
    this._tone(783.99, 0.2, 'sine', 0.2, 0.16);
  },
  wrong() {
    this._tone(220, 0.16, 'triangle', 0.16, 0);
    this._tone(175, 0.22, 'triangle', 0.15, 0.11);
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this._tone(f, 0.24, 'sine', 0.2, i * 0.11));
  }
};

/* ---------- Standard IB PYP TTS Manager ---------- */
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
      SoundFX.pop();
      this.wrap.classList.toggle('open');
      this.trigger.setAttribute('aria-expanded', String(this.wrap.classList.contains('open')));
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

    if ('speechSynthesis' in window) {
      this.populateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.populateVoices();
      }
    }
  },

  populateVoices() {
    if (!('speechSynthesis' in window) || !this.list) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;

    let englishVoices = voices.filter(v => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang.startsWith('en') && !JOKE_VOICES.test(v.name);
    });
    if (!englishVoices.length) {
      englishVoices = voices.filter(v => !JOKE_VOICES.test(v.name));
    }
    if (!englishVoices.length) englishVoices = voices;

    const PREFERRED = ['samantha', 'daniel', 'google uk english female', 'google us english', 'karen', 'serena', 'oliver', 'ava', 'allison', 'kate'];
    englishVoices.sort((a, b) => {
      const aIdx = PREFERRED.findIndex(p => a.name.toLowerCase().includes(p));
      const bIdx = PREFERRED.findIndex(p => b.name.toLowerCase().includes(p));
      const aRank = aIdx === -1 ? 999 : aIdx;
      const bRank = bIdx === -1 ? 999 : bIdx;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });

    let saved = null;
    try { saved = localStorage.getItem('ib_pyp_voice_name'); } catch (_) {}
    let selected = (saved && englishVoices.find(v => v.name === saved)) ||
      englishVoices.find(v => v.default) ||
      englishVoices[0] || null;

    this.currentVoiceName = selected ? selected.name : '';
    this.renderMenu(englishVoices);
    this.updateTriggerUI(selected);
  },

  renderMenu(voices) {
    this.list.innerHTML = '';
    voices.slice(0, 15).forEach(v => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      const isAU = lang.includes('au');
      const isUK = lang.includes('gb');
      const isUS = lang.includes('us') || lang.startsWith('en');
      const flag = isAU ? '🇦🇺' : isUK ? '🇬🇧' : isUS ? '🇺🇸' : '🌐';
      const region = isAU ? 'AU' : isUK ? 'UK' : isUS ? 'US' : (v.lang || 'System');
      const isActive = v.name === this.currentVoiceName;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tts-radio-item${isActive ? ' active' : ''}`;
      btn.setAttribute('role', 'menuitemradio');
      btn.setAttribute('aria-checked', String(isActive));
      btn.innerHTML = `
        <span class="tts-radio-circle"></span>
        <span class="tts-item-flag">${flag}</span>
        <span class="tts-item-name">${escapeHtml(v.name)} (${region})</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        SoundFX.pop();
        this.currentVoiceName = v.name;
        try { localStorage.setItem('ib_pyp_voice_name', v.name); } catch (_) {}
        this.updateTriggerUI(v);
        this.list.querySelectorAll('.tts-radio-item').forEach(b => {
          const match = b === btn;
          b.classList.toggle('active', match);
          b.setAttribute('aria-checked', String(match));
        });
        this.wrap.classList.remove('open');
        this.trigger.setAttribute('aria-expanded', 'false');
        speakText('Hello! Ready to learn Minecraft words!', { rate: 0.92, force: true });
      });
      this.list.appendChild(btn);
    });
  },

  updateTriggerUI(v) {
    if (!v) {
      if (this.flag) this.flag.textContent = '🌐';
      if (this.label) this.label.textContent = 'Voice';
      return;
    }
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    this.flag.textContent = lang.includes('au') ? '🇦🇺' : lang.includes('gb') ? '🇬🇧' : (lang.includes('us') || lang.startsWith('en')) ? '🇺🇸' : '🌐';
    let shortName = (v.name || 'Voice').replace(/^(Google|Microsoft|Apple)\s+/i, '');
    if (shortName.length > 14) shortName = shortName.substring(0, 12) + '...';
    this.label.textContent = shortName;
  },

  getSelectedVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    let saved = this.currentVoiceName;
    if (!saved) {
      try { saved = localStorage.getItem('ib_pyp_voice_name'); } catch (_) {}
    }
    return (saved && voices.find(v => v.name === saved)) ||
      voices.find(v => (v.lang || '').toLowerCase().startsWith('en') && !JOKE_VOICES.test(v.name)) ||
      voices.find(v => v.default) ||
      voices[0] || null;
  }
};

/* ---------- Application State ---------- */
let currentState = {
  isHomePage: true,
  currentScene: null,
  words: [],
  showChinese: false,
  showEnglish: true,
  autoMode: false,
  autoModeInterval: null,
  quiz: createQuizState()
};

const QUIZ_DIFFICULTIES = {
  easy: {
    label: 'Easy',
    description: 'Fill in 1 missing letter.',
    placeholder: 'Type 1 missing letter'
  },
  normal: {
    label: 'Normal',
    description: 'Fill in the 2–3 missing letters.',
    placeholder: 'Type the missing letters'
  },
  hard: {
    label: 'Hard',
    description: 'Spell the full word from blanks.',
    placeholder: 'Type the full word'
  }
};

function createQuizState() {
  return {
    active: false,
    items: [],
    currentIndex: 0,
    score: 0,
    awaitingNext: false,
    lastAnswerCorrect: null,
    completed: false,
    difficulty: null,
    typedAnswer: '',
    autoAdvanceTimer: null
  };
}

document.addEventListener('DOMContentLoaded', () => {
  TTS_MANAGER.init();
  renderHomePage();
  setupBackButton();
  setupQuizModal();
});

function getQuizElements() {
  return {
    overlay: document.getElementById('quizOverlay'),
    title: document.getElementById('quizTitle'),
    sceneName: document.getElementById('quizSceneName'),
    score: document.getElementById('quizScore'),
    setup: document.getElementById('quizSetup'),
    questionSection: document.getElementById('quizQuestionSection'),
    image: document.getElementById('quizImage'),
    maskedWord: document.getElementById('quizMaskedWord'),
    replayBtn: document.getElementById('quizReplayBtn'),
    prompt: document.getElementById('quizPrompt'),
    form: document.getElementById('quizForm'),
    input: document.getElementById('quizAnswerInput'),
    submitBtn: document.getElementById('quizSubmitBtn'),
    feedback: document.getElementById('quizFeedback'),
    passportBanner: document.getElementById('quizPassportBanner'),
    cancelBtn: document.getElementById('quizCancelBtn'),
    difficultyButtons: Array.from(document.querySelectorAll('.quiz-difficulty-btn'))
  };
}

function setupQuizModal() {
  const quizEls = getQuizElements();
  quizEls.form.addEventListener('submit', handleQuizSubmit);
  quizEls.cancelBtn.addEventListener('click', () => {
    SoundFX.pop();
    closeQuiz();
  });
  quizEls.replayBtn.addEventListener('click', () => {
    SoundFX.pop();
    replayQuizAudio();
  });
  quizEls.input.addEventListener('input', handleQuizInput);
  quizEls.maskedWord.addEventListener('click', focusQuizInput);
  quizEls.difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
      SoundFX.pop();
      beginQuiz(button.dataset.difficulty);
    });
  });
}

function cancelSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakText(text, { rate = 0.88, force = true, onEnd = null } = {}) {
  if (!('speechSynthesis' in window) || !text) {
    if (typeof onEnd === 'function') setTimeout(onEnd, 250);
    return;
  }

  if (force) cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  const chosenVoice = TTS_MANAGER.getSelectedVoice();
  if (chosenVoice) {
    utterance.voice = chosenVoice;
    utterance.lang = chosenVoice.lang;
  } else {
    utterance.lang = 'en-US';
  }
  utterance.rate = rate;
  utterance.pitch = 1;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (typeof onEnd === 'function') onEnd();
  };

  utterance.onend = finish;
  utterance.onerror = (event) => {
    if (event.error !== 'interrupted' && event.error !== 'canceled') {
      console.error('[MCWords] TTS error:', event.error);
    }
    finish();
  };

  window.speechSynthesis.speak(utterance);

  // Safety fallback only if browser fails to fire onend (generous 4.5s so speech never cuts off)
  if (typeof onEnd === 'function') {
    setTimeout(finish, 4500);
  }
}

function stopAutoMode() {
  currentState.autoMode = false;

  if (currentState.autoModeInterval) {
    clearInterval(currentState.autoModeInterval);
    currentState.autoModeInterval = null;
  }

  document.querySelectorAll('.cpt-pixel-flashcard').forEach(card => {
    card.classList.remove('pixel-flashcard--highlight');
  });

  updateControlButtons();
}

function normalizeQuizAnswer(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getShuffledQuizItems(words, count = 10) {
  const items = [...words];
  for (let i = items.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [items[i], items[swapIndex]] = [items[swapIndex], items[i]];
  }
  return items.slice(0, Math.min(count, items.length));
}

function getActiveQuizItem() {
  return currentState.quiz.items[currentState.quiz.currentIndex] || null;
}

function getQuizDifficultyConfig() {
  return QUIZ_DIFFICULTIES[currentState.quiz.difficulty] || QUIZ_DIFFICULTIES.hard;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getQuizBlankCount(letterCount, difficultyKey) {
  if (difficultyKey === 'hard') return letterCount;
  if (difficultyKey === 'easy') return Math.min(1, letterCount);
  if (letterCount <= 2) return letterCount;
  return Math.min(letterCount, Math.random() < 0.5 ? 2 : 3);
}

function buildQuizItems(words, difficultyKey, count = 10) {
  return getShuffledQuizItems(words, count).map(word => {
    const displayWord = word.en.toLowerCase();
    const letterIndexes = [];

    [...displayWord].forEach((char, index) => {
      if (/[a-z0-9]/i.test(char)) letterIndexes.push(index);
    });

    const hideCount = getQuizBlankCount(letterIndexes.length, difficultyKey);
    const shuffledIndexes = [...letterIndexes];
    for (let i = shuffledIndexes.length - 1; i > 0; i--) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [shuffledIndexes[i], shuffledIndexes[swapIndex]] = [shuffledIndexes[swapIndex], shuffledIndexes[i]];
    }

    const hiddenIndexes = shuffledIndexes.slice(0, hideCount).sort((a, b) => a - b);
    const hiddenIndexSet = new Set(hiddenIndexes);
    const expectedAnswer = hiddenIndexes.map(index => displayWord[index]).join('');

    return {
      ...word,
      displayWord,
      hiddenIndexes,
      hiddenIndexSet,
      expectedAnswer
    };
  });
}

function renderMaskedWord() {
  const quizEls = getQuizElements();
  const item = getActiveQuizItem();
  if (!item) {
    quizEls.maskedWord.innerHTML = '';
    return;
  }

  quizEls.maskedWord.innerHTML = [...item.displayWord].map((char, index) => {
    if (!/[a-z0-9]/i.test(char)) {
      return '<span class="quiz-mask-space">&nbsp;</span>';
    }
    if (item.hiddenIndexSet.has(index)) {
      const hiddenPosition = item.hiddenIndexes.indexOf(index);
      const typedChar = currentState.quiz.typedAnswer[hiddenPosition];
      const filledClass = typedChar ? ' is-filled' : '';
      const displayChar = typedChar ? escapeHtml(typedChar) : '_';
      return `<span class="quiz-mask-char is-blank${filledClass}">${displayChar}</span>`;
    }
    return `<span class="quiz-mask-char">${escapeHtml(char)}</span>`;
  }).join('');
}

function clearQuizAutoAdvance() {
  if (currentState.quiz.autoAdvanceTimer) {
    clearTimeout(currentState.quiz.autoAdvanceTimer);
    currentState.quiz.autoAdvanceTimer = null;
  }
}

function focusQuizInput() {
  const { input } = getQuizElements();
  if (input && !input.disabled) input.focus();
}

function isQuizAnswerLengthValid(answer, item) {
  return answer.length === item.expectedAnswer.length;
}

function getQuizLengthMessage(item) {
  return `Please enter exactly ${item.expectedAnswer.length} missing letter${item.expectedAnswer.length > 1 ? 's' : ''}.`;
}

function getQuizCorrectAnswerText(item) {
  return `${item.expectedAnswer} (${item.en})`;
}

function replayQuizAudio() {
  const item = getActiveQuizItem();
  if (!item) return;
  speakText(item.en, { rate: 0.85, force: true });
}

function handleQuizInput(event) {
  const item = getActiveQuizItem();
  if (!item || currentState.quiz.completed || currentState.quiz.awaitingNext) return;

  const sanitized = normalizeQuizAnswer(event.target.value).slice(0, item.expectedAnswer.length);
  currentState.quiz.typedAnswer = sanitized;
  event.target.value = sanitized;
  renderMaskedWord();
}

function setQuizFeedback(message, isCorrect = null) {
  const { feedback } = getQuizElements();
  feedback.textContent = message;
  feedback.classList.remove('is-correct', 'is-wrong');
  if (isCorrect === true) feedback.classList.add('is-correct');
  else if (isCorrect === false) feedback.classList.add('is-wrong');
}

function openQuizOverlay() {
  const { overlay } = getQuizElements();
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('quiz-open');
}

function resetQuizView() {
  const quizEls = getQuizElements();
  clearQuizAutoAdvance();
  quizEls.setup.style.display = 'none';
  quizEls.questionSection.style.display = 'flex';
  quizEls.form.style.display = '';
  quizEls.replayBtn.style.display = '';
  quizEls.passportBanner.style.display = 'none';
  quizEls.passportBanner.textContent = '';
  quizEls.input.disabled = false;
  quizEls.input.value = '';
  quizEls.input.removeAttribute('maxlength');
  quizEls.cancelBtn.textContent = 'Exit Quiz';
  quizEls.submitBtn.style.display = '';
  quizEls.maskedWord.innerHTML = '';
  setQuizFeedback('');
}

function closeQuiz() {
  const quizEls = getQuizElements();
  clearQuizAutoAdvance();
  cancelSpeech();
  quizEls.overlay.style.display = 'none';
  quizEls.overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('quiz-open');
  resetQuizView();
  currentState.quiz = createQuizState();
}

function renderQuizQuestion() {
  const item = getActiveQuizItem();
  if (!item || !currentState.currentScene) {
    closeQuiz();
    return;
  }

  const quizEls = getQuizElements();
  const total = currentState.quiz.items.length;
  const questionNumber = currentState.quiz.currentIndex + 1;
  const difficulty = getQuizDifficultyConfig();

  resetQuizView();
  currentState.quiz.typedAnswer = '';
  currentState.quiz.awaitingNext = false;
  quizEls.title.textContent = `Scene Quiz · ${difficulty.label}`;
  quizEls.sceneName.textContent = currentState.currentScene.name;
  quizEls.score.textContent = `✅ ${currentState.quiz.score} · ${questionNumber}/${total}`;
  quizEls.image.src = `res/images/${currentState.currentScene.id}/${item.file}`;
  quizEls.image.alt = item.en;
  renderMaskedWord();
  quizEls.prompt.textContent = `${difficulty.description} Type the missing letters below, then tap Check Answer.`;
  quizEls.input.value = '';
  quizEls.input.placeholder = `${difficulty.placeholder} (${item.expectedAnswer.length})`;
  quizEls.input.maxLength = item.expectedAnswer.length;
  quizEls.submitBtn.textContent = 'Check Answer ↵';
  focusQuizInput();
  replayQuizAudio();
}

function stampPassport() {
  try {
    const raw = localStorage.getItem('ib_pyp_passport');
    const data = raw ? JSON.parse(raw) : { stamps: [], completed: [] };
    const stamps = new Set(Array.isArray(data.stamps) ? data.stamps : []);
    const completed = new Set(Array.isArray(data.completed) ? data.completed : []);
    stamps.add('Communicator');
    completed.add('literacy/mc_words/index.html');
    localStorage.setItem('ib_pyp_passport', JSON.stringify({ stamps: [...stamps], completed: [...completed] }));
    return true;
  } catch (_) {
    return false;
  }
}

function showQuizSummary() {
  const quizEls = getQuizElements();
  const total = currentState.quiz.items.length;
  const scoreText = `${currentState.quiz.score} / ${total}`;
  const ratio = total ? currentState.quiz.score / total : 0;
  const difficulty = getQuizDifficultyConfig();
  const summaryText = ratio === 1
    ? 'Perfect score! Amazing spelling!'
    : ratio >= 0.7
      ? 'Great job! You are building strong Minecraft vocabulary!'
      : 'Nice try! Review the flashcards and try again!';

  currentState.quiz.completed = true;
  currentState.quiz.awaitingNext = false;
  clearQuizAutoAdvance();

  SoundFX.fanfare();
  stampPassport();

  quizEls.title.textContent = `Quiz Complete · ${difficulty.label}`;
  quizEls.sceneName.textContent = currentState.currentScene.name;
  quizEls.score.textContent = `⭐ ${scoreText}`;
  quizEls.image.src = currentState.currentScene.cover;
  quizEls.image.alt = currentState.currentScene.name;
  quizEls.maskedWord.innerHTML = '';
  quizEls.prompt.textContent = `Final score: ${scoreText}`;
  quizEls.form.style.display = 'none';
  quizEls.replayBtn.style.display = 'none';
  quizEls.cancelBtn.textContent = 'Close';
  quizEls.submitBtn.textContent = 'Play Again';
  quizEls.passportBanner.textContent = '🏅 IB PYP Passport Stamped: Communicator! You practiced clear English vocabulary and spelling.';
  quizEls.passportBanner.style.display = 'block';
  setQuizFeedback(summaryText, ratio >= 0.7);
  speakText(`Quiz complete! Your score is ${currentState.quiz.score} out of ${total}.`, {
    rate: 0.9,
    force: true
  });
}

function showNextQuizQuestion() {
  clearQuizAutoAdvance();
  if (!currentState.quiz.active || currentState.quiz.completed) return;
  if (currentState.quiz.currentIndex >= currentState.quiz.items.length - 1) {
    showQuizSummary();
    return;
  }

  currentState.quiz.currentIndex += 1;
  currentState.quiz.awaitingNext = false;
  currentState.quiz.lastAnswerCorrect = null;
  renderQuizQuestion();
}

function handleQuizSubmit(event) {
  event.preventDefault();

  if (!currentState.quiz.active) return;

  // On summary screen, primary button restarts quiz setup
  if (currentState.quiz.completed) {
    SoundFX.pop();
    renderQuizSetup();
    return;
  }

  // If already evaluated, clicking Next advances immediately without cutting off early involuntarily
  if (currentState.quiz.awaitingNext) {
    SoundFX.pop();
    cancelSpeech();
    showNextQuizQuestion();
    return;
  }

  const quizEls = getQuizElements();
  const item = getActiveQuizItem();
  const answer = currentState.quiz.typedAnswer.trim();

  if (!answer) {
    SoundFX.wrong();
    setQuizFeedback('Please type the missing letters first.', false);
    focusQuizInput();
    return;
  }

  const normalizedAnswer = normalizeQuizAnswer(answer);
  if (!isQuizAnswerLengthValid(normalizedAnswer, item)) {
    SoundFX.wrong();
    setQuizFeedback(getQuizLengthMessage(item), false);
    focusQuizInput();
    return;
  }

  const isCorrect = normalizedAnswer === item.expectedAnswer;
  currentState.quiz.awaitingNext = true;
  currentState.quiz.lastAnswerCorrect = isCorrect;

  if (isCorrect) {
    currentState.quiz.score += 1;
    SoundFX.correct();
    setQuizFeedback('Correct! Great spelling!', true);
  } else {
    SoundFX.wrong();
    setQuizFeedback(`Not quite. Expected: ${getQuizCorrectAnswerText(item)}`, false);
  }

  const isLast = currentState.quiz.currentIndex >= currentState.quiz.items.length - 1;
  const currentQuestionNumber = currentState.quiz.currentIndex + 1;
  quizEls.score.textContent = `✅ ${currentState.quiz.score} · ${currentQuestionNumber}/${currentState.quiz.items.length}`;
  quizEls.input.disabled = true;
  quizEls.submitBtn.textContent = isLast ? 'See Results →' : 'Next Word →';

  // Wait for TTS feedback to finish completely before auto-advancing (never cuts audio at 1200ms!)
  const feedbackSpeech = isCorrect
    ? `Correct! ${item.en}.`
    : `Not quite. The word is ${item.en}.`;

  const capturedIndex = currentState.quiz.currentIndex;
  speakText(feedbackSpeech, {
    rate: 0.9,
    force: true,
    onEnd: () => {
      if (!currentState.quiz.active || currentState.quiz.completed) return;
      if (!currentState.quiz.awaitingNext || currentState.quiz.currentIndex !== capturedIndex) return;
      clearQuizAutoAdvance();
      currentState.quiz.autoAdvanceTimer = setTimeout(() => {
        if (currentState.quiz.active && currentState.quiz.awaitingNext && currentState.quiz.currentIndex === capturedIndex) {
          showNextQuizQuestion();
        }
      }, 650);
    }
  });
}

function renderHomePage() {
  closeQuiz();
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';

  SCENES.forEach(scene => {
    const wordCount = (WORDS_DATA[scene.id] || []).length;
    const card = document.createElement('div');
    card.className = 'cpt-pixel-flashcard';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.onclick = () => {
      SoundFX.pop();
      openScene(scene.id);
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        SoundFX.pop();
        openScene(scene.id);
      }
    };
    card.innerHTML = `
      <img class="pixel-cover" src="${scene.cover}" alt="${escapeHtml(scene.name)}" loading="lazy">
      <div class="pixel-en">${escapeHtml(scene.name)}</div>
      <div class="pixel-sub">${wordCount} words</div>
    `;
    grid.appendChild(card);
  });

  document.getElementById('topNav').classList.remove('scene-active');
  document.getElementById('navControls').style.display = 'none';
  document.getElementById('appTitle').textContent = 'MEET MC WORDS';
  document.getElementById('bannerHeading').textContent = 'Pick a Minecraft World';
  document.getElementById('bannerSub').textContent = 'Tap any category to explore 322 English words with audio flashcards and spelling quizzes!';
  currentState.isHomePage = true;
  currentState.currentScene = null;
  currentState.words = [];
}

function openScene(sceneId) {
  try {
    const scene = SCENES.find(s => s.id === sceneId);
    if (!scene) throw new Error('Category not found.');

    const words = WORDS_DATA[sceneId];
    if (!words) throw new Error('Vocabulary list not found.');

    currentState.currentScene = scene;
    currentState.words = words;
    renderScenePage(words);
  } catch (error) {
    console.error('[MCWords] Failed to open scene:', error);
    showError('Could not load category data: ' + error.message);
  }
}

function renderScenePage(words) {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';

  document.getElementById('topNav').classList.add('scene-active');
  document.getElementById('navControls').style.display = 'flex';
  document.getElementById('appTitle').textContent = currentState.currentScene.name.toUpperCase();
  document.getElementById('bannerHeading').textContent = `${currentState.currentScene.name} (${words.length} Words)`;
  document.getElementById('bannerSub').textContent = 'Tap any card to hear pronunciation, use Auto for hands-free listening, or tap Quiz to test spelling!';
  updateControlButtons();

  words.forEach((word, index) => {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card';

    const anchor = document.createElement('div');
    anchor.className = 'scrollanchor';
    anchor.id = `flashcard-${index}`;
    cardContainer.appendChild(anchor);

    const card = document.createElement('div');
    card.className = 'cpt-pixel-flashcard';
    card.dataset.index = index;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.onclick = () => flipCard(index);
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flipCard(index);
      }
    };

    card.innerHTML = `
      <img class="pixel-cover" src="res/images/${currentState.currentScene.id}/${word.file}" alt="${escapeHtml(word.en)}" loading="lazy">
      <div class="pixel-en" style="${currentState.showEnglish ? '' : 'display: none;'}">${escapeHtml(word.en)}</div>
      <div class="pixel-zh" style="${currentState.showChinese ? '' : 'display: none;'}">${escapeHtml(word.zh)}</div>
    `;

    cardContainer.appendChild(card);
    grid.appendChild(cardContainer);
  });

  currentState.isHomePage = false;
  window.scrollTo(0, 0);
}

function setupBackButton() {
  document.getElementById('backBtn').onclick = () => {
    SoundFX.pop();
    if (currentState.quiz.active) {
      closeQuiz();
      return;
    }
    stopAutoMode();
    cancelSpeech();
    renderHomePage();
  };
}

function updateControlButtons() {
  const btnZh = document.getElementById('btnZh');
  const btnEn = document.getElementById('btnEn');
  const btnAuto = document.getElementById('btnAuto');

  if (btnZh) btnZh.dataset.active = String(currentState.showChinese);
  if (btnEn) btnEn.dataset.active = String(currentState.showEnglish);

  if (btnAuto) {
    if (currentState.autoMode) {
      btnAuto.classList.add('active');
      btnAuto.textContent = '⏸ Pause';
    } else {
      btnAuto.classList.remove('active');
      btnAuto.textContent = '▶ Auto';
    }
  }
}

function toggleChinese() {
  SoundFX.pop();
  currentState.showChinese = !currentState.showChinese;
  updateCardVisibility();
  updateControlButtons();
}

function toggleEnglish() {
  SoundFX.pop();
  currentState.showEnglish = !currentState.showEnglish;
  updateCardVisibility();
  updateControlButtons();
}

function updateCardVisibility() {
  const cards = document.querySelectorAll('.cpt-pixel-flashcard');
  cards.forEach(card => {
    const enEl = card.querySelector('.pixel-en');
    const zhEl = card.querySelector('.pixel-zh');
    if (enEl) enEl.style.display = currentState.showEnglish ? '' : 'none';
    if (zhEl) zhEl.style.display = currentState.showChinese ? '' : 'none';
  });
}

function toggleAutoMode() {
  SoundFX.pop();
  currentState.autoMode = !currentState.autoMode;
  updateControlButtons();

  if (currentState.autoMode) {
    let index = 0;
    const cards = document.querySelectorAll('.card');
    if (!cards.length) {
      stopAutoMode();
      return;
    }

    const playStep = () => {
      cards.forEach(card => {
        const flashcard = card.querySelector('.cpt-pixel-flashcard');
        if (flashcard) flashcard.classList.remove('pixel-flashcard--highlight');
      });

      const currentCard = cards[index]?.querySelector('.cpt-pixel-flashcard');
      if (currentCard) {
        currentCard.classList.add('pixel-flashcard--highlight');
        currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      playPronunciation(index);
      index = (index + 1) % cards.length;
    };

    playStep();
    currentState.autoModeInterval = setInterval(playStep, 3000);
  } else {
    stopAutoMode();
    cancelSpeech();
  }
}

function playPronunciation(index) {
  const word = currentState.words[index];
  if (!word) return;
  speakText(word.en, { rate: 0.85, force: true });
}

function startQuiz() {
  SoundFX.pop();
  if (currentState.isHomePage || !currentState.currentScene || !currentState.words.length) {
    showToast('Open a category first to start a quiz!');
    return;
  }

  stopAutoMode();
  cancelSpeech();
  currentState.quiz = createQuizState();
  currentState.quiz.active = true;
  openQuizOverlay();
  renderQuizSetup();
}

function renderQuizSetup() {
  const quizEls = getQuizElements();
  clearQuizAutoAdvance();
  currentState.quiz.completed = false;
  currentState.quiz.awaitingNext = false;
  quizEls.setup.style.display = 'block';
  quizEls.questionSection.style.display = 'none';
  quizEls.title.textContent = 'Scene Quiz';
  quizEls.sceneName.textContent = currentState.currentScene.name;
  quizEls.score.textContent = '✅ 0 · 0/10';
  quizEls.cancelBtn.textContent = 'Exit Quiz';
  quizEls.submitBtn.style.display = 'none';
  setQuizFeedback('');
}

function beginQuiz(difficultyKey) {
  if (!QUIZ_DIFFICULTIES[difficultyKey]) return;

  currentState.quiz.difficulty = difficultyKey;
  currentState.quiz.items = buildQuizItems(currentState.words, difficultyKey, 10);
  currentState.quiz.currentIndex = 0;
  currentState.quiz.score = 0;
  currentState.quiz.awaitingNext = false;
  currentState.quiz.completed = false;
  currentState.quiz.lastAnswerCorrect = null;

  if (!currentState.quiz.items.length) {
    showToast('No vocabulary words available for this category.');
    closeQuiz();
    return;
  }

  renderQuizQuestion();
}

function flipCard(index) {
  const card = document.querySelector(`.cpt-pixel-flashcard[data-index="${index}"]`);
  if (!card) return;
  SoundFX.pop();
  card.classList.add('pixel-flashcard--highlight');
  setTimeout(() => card.classList.remove('pixel-flashcard--highlight'), 450);
  playPronunciation(index);
}

function showToast(message, duration = 2200) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-content">${escapeHtml(message)}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showError(message) {
  document.getElementById('errorModalText').textContent = message;
  document.getElementById('errorModal').style.display = 'flex';
}

function closeErrorModal() {
  SoundFX.pop();
  document.getElementById('errorModal').style.display = 'none';
}
