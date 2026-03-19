let currentState = {
  isHomePage: true,
  currentScene: null,
  words: [],
  showChinese: true,
  showEnglish: true,
  autoMode: false,
  autoModeInterval: null,
  ttsAccent: 'en-US',
  quiz: createQuizState()
};

const QUIZ_DIFFICULTIES = {
  easy: {
    label: 'Easy',
    description: 'Fill in the 1 missing letter.',
    placeholder: 'Type 1 missing letter'
  },
  normal: {
    label: 'Normal',
    description: 'Fill in the 2-3 missing letters.',
    placeholder: 'Type the missing letters'
  },
  hard: {
    label: 'Hard',
    description: 'Fill in the full word from blank letters.',
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
    hintVisible: false,
    typedAnswer: '',
    autoAdvanceTimer: null
  };
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomePage();
  setupBackButton();
  setupQuizModal();
  initializeTTS();
});

function initializeTTS() {
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
      const voices = speechSynthesis.getVoices();
      console.log('[MCWords] TTS voices loaded:', voices.length);
    };
  }
}

function getQuizElements() {
  return {
    overlay: document.getElementById('quizOverlay'),
    title: document.getElementById('quizTitle'),
    sceneName: document.getElementById('quizSceneName'),
    score: document.getElementById('quizScore'),
    progress: document.getElementById('quizProgress'),
    setup: document.getElementById('quizSetup'),
    questionSection: document.getElementById('quizQuestionSection'),
    image: document.getElementById('quizImage'),
    maskedWord: document.getElementById('quizMaskedWord'),
    replayBtn: document.getElementById('quizReplayBtn'),
    tipBtn: document.getElementById('quizTipBtn'),
    prompt: document.getElementById('quizPrompt'),
    hint: document.getElementById('quizHint'),
    form: document.getElementById('quizForm'),
    input: document.getElementById('quizAnswerInput'),
    submitBtn: document.getElementById('quizSubmitBtn'),
    feedback: document.getElementById('quizFeedback'),
    cancelBtn: document.getElementById('quizCancelBtn'),
    difficultyButtons: Array.from(document.querySelectorAll('.quiz-difficulty-btn'))
  };
}

function setupQuizModal() {
  const quizEls = getQuizElements();
  quizEls.form.addEventListener('submit', handleQuizSubmit);
  quizEls.cancelBtn.addEventListener('click', closeQuiz);
  quizEls.replayBtn.addEventListener('click', replayQuizAudio);
  quizEls.tipBtn.addEventListener('click', revealQuizHint);
  quizEls.input.addEventListener('input', handleQuizInput);
  quizEls.maskedWord.addEventListener('click', focusQuizInput);
  quizEls.difficultyButtons.forEach(button => {
    button.addEventListener('click', () => beginQuiz(button.dataset.difficulty));
  });
}

function cancelSpeech() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

function speakText(text, { lang = currentState.ttsAccent, rate = 0.9, force = true } = {}) {
  if (!('speechSynthesis' in window) || !text) return;

  if (force) {
    cancelSpeech();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.onerror = (event) => {
    if (event.error === 'interrupted' || event.error === 'canceled') {
      return;
    }
    console.error('[MCWords] TTS error:', event.error);
  };
  speechSynthesis.speak(utterance);
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
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getQuizBlankCount(letterCount, difficultyKey) {
  if (difficultyKey === 'hard') {
    return letterCount;
  }

  if (difficultyKey === 'easy') {
    return Math.min(1, letterCount);
  }

  if (letterCount <= 2) {
    return letterCount;
  }

  return Math.min(letterCount, Math.random() < 0.5 ? 2 : 3);
}

function buildQuizItems(words, difficultyKey, count = 10) {
  return getShuffledQuizItems(words, count).map(word => {
    const displayWord = word.en.toLowerCase();
    const letterIndexes = [];

    [...displayWord].forEach((char, index) => {
      if (/[a-z0-9]/i.test(char)) {
        letterIndexes.push(index);
      }
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
      const tipClass = currentState.quiz.hintVisible ? ' is-tip' : '';
      const filledClass = typedChar ? ' is-filled' : '';
      const displayChar = typedChar ? escapeHtml(typedChar) : '_';
      return `<span class="quiz-mask-char is-blank${tipClass}${filledClass}">${displayChar}</span>`;
    }

    return `<span class="quiz-mask-char">${escapeHtml(char)}</span>`;
  }).join('');
}

function getQuizHintText(item) {
  return `${item.hiddenIndexes.length} missing position${item.hiddenIndexes.length > 1 ? 's' : ''} highlighted.`;
}

function clearQuizAutoAdvance() {
  if (currentState.quiz.autoAdvanceTimer) {
    clearTimeout(currentState.quiz.autoAdvanceTimer);
    currentState.quiz.autoAdvanceTimer = null;
  }
}

function focusQuizInput() {
  const { input } = getQuizElements();
  input.focus();
}

function revealQuizHint() {
  const item = getActiveQuizItem();
  const { hint } = getQuizElements();
  if (!item || currentState.quiz.completed) return;
  currentState.quiz.hintVisible = true;
  renderMaskedWord();
  hint.textContent = getQuizHintText(item);
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
  speakText(item.en, { lang: currentState.ttsAccent, rate: 0.85, force: true });
}

function handleQuizInput(event) {
  const item = getActiveQuizItem();
  if (!item || currentState.quiz.completed) return;

  const sanitized = normalizeQuizAnswer(event.target.value).slice(0, item.expectedAnswer.length);
  currentState.quiz.typedAnswer = sanitized;
  event.target.value = sanitized;
  renderMaskedWord();
}

function setQuizFeedback(message, isCorrect = null) {
  const { feedback } = getQuizElements();
  feedback.textContent = message;
  feedback.classList.remove('is-correct', 'is-wrong');

  if (isCorrect === true) {
    feedback.classList.add('is-correct');
  } else if (isCorrect === false) {
    feedback.classList.add('is-wrong');
  }
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
  quizEls.tipBtn.style.display = '';
  quizEls.input.disabled = false;
  quizEls.input.value = '';
  quizEls.input.removeAttribute('maxlength');
  quizEls.cancelBtn.textContent = '退出测验';
  quizEls.maskedWord.innerHTML = '';
  quizEls.hint.textContent = '';
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
  currentState.quiz.hintVisible = false;
  currentState.quiz.typedAnswer = '';
  quizEls.title.textContent = `场景测验 · ${difficulty.label}`;
  quizEls.sceneName.textContent = `${currentState.currentScene.name} / ${currentState.currentScene.zh}`;
  quizEls.score.textContent = `${currentState.quiz.score} / ${total}`;
  quizEls.progress.textContent = `${questionNumber} / ${total}`;
  quizEls.image.src = `res/images/${currentState.currentScene.id}/${item.file}`;
  quizEls.image.alt = item.en;
  renderMaskedWord();
  quizEls.prompt.textContent = `${difficulty.description} Type directly into the blanks, then press Enter.`;
  quizEls.input.value = '';
  quizEls.input.placeholder = `${difficulty.placeholder} (${item.expectedAnswer.length})`;
  quizEls.input.maxLength = item.expectedAnswer.length;
  quizEls.submitBtn.textContent = 'Enter ↵';
  focusQuizInput();
  replayQuizAudio();
}

function announceQuizResult(isCorrect, item) {
  if (isCorrect) {
    speakText('Correct!', { lang: currentState.ttsAccent, rate: 0.9, force: true });
    return;
  }

  speakText(`Incorrect. The correct answer is ${item.en}.`, {
    lang: currentState.ttsAccent,
    rate: 0.88,
    force: true
  });
}

function showQuizSummary() {
  const quizEls = getQuizElements();
  const total = currentState.quiz.items.length;
  const scoreText = `${currentState.quiz.score} / ${total}`;
  const ratio = total ? currentState.quiz.score / total : 0;
  const difficulty = getQuizDifficultyConfig();
  const summaryText = ratio === 1
    ? 'Perfect score!'
    : ratio >= 0.7
      ? 'Great job!'
      : 'Nice try. Practice and play again!';

  currentState.quiz.completed = true;
  quizEls.title.textContent = `测验完成 · ${difficulty.label}`;
  quizEls.sceneName.textContent = `${currentState.currentScene.name} / ${currentState.currentScene.zh}`;
  quizEls.score.textContent = scoreText;
  quizEls.progress.textContent = `已完成 ${total} 题`;
  quizEls.image.src = currentState.currentScene.cover;
  quizEls.image.alt = currentState.currentScene.name;
  quizEls.maskedWord.innerHTML = '';
  quizEls.prompt.textContent = `Final score: ${scoreText}`;
  quizEls.form.style.display = 'none';
  quizEls.replayBtn.style.display = 'none';
  quizEls.tipBtn.style.display = 'none';
  quizEls.hint.textContent = '';
  quizEls.cancelBtn.textContent = '关闭';
  setQuizFeedback(summaryText, ratio >= 0.7);
  speakText(`Quiz finished. Your score is ${currentState.quiz.score} out of ${total}.`, {
    lang: currentState.ttsAccent,
    rate: 0.88,
    force: true
  });
}

function showNextQuizQuestion() {
  clearQuizAutoAdvance();
  if (currentState.quiz.currentIndex >= currentState.quiz.items.length - 1) {
    showQuizSummary();
    return;
  }

  currentState.quiz.currentIndex += 1;
  currentState.quiz.awaitingNext = false;
  currentState.quiz.lastAnswerCorrect = null;
  renderQuizQuestion();
}

function scheduleQuizAdvance() {
  clearQuizAutoAdvance();
  currentState.quiz.autoAdvanceTimer = setTimeout(() => {
    showNextQuizQuestion();
  }, 1200);
}

function handleQuizSubmit(event) {
  event.preventDefault();

  if (!currentState.quiz.active) return;
  if (currentState.quiz.completed) {
    closeQuiz();
    return;
  }

  const quizEls = getQuizElements();
  const item = getActiveQuizItem();
  const answer = currentState.quiz.typedAnswer.trim();

  if (!answer) {
    setQuizFeedback('Please type the missing letters first.', false);
    return;
  }

  const normalizedAnswer = normalizeQuizAnswer(answer);

  if (!isQuizAnswerLengthValid(normalizedAnswer, item)) {
    setQuizFeedback(getQuizLengthMessage(item), false);
    return;
  }

  const isCorrect = normalizedAnswer === item.expectedAnswer;
  currentState.quiz.awaitingNext = true;
  currentState.quiz.lastAnswerCorrect = isCorrect;

  if (isCorrect) {
    currentState.quiz.score += 1;
    setQuizFeedback('Correct! Nice job.', true);
  } else {
    setQuizFeedback(`Incorrect. Expected: ${getQuizCorrectAnswerText(item)}`, false);
  }

  quizEls.score.textContent = `${currentState.quiz.score} / ${currentState.quiz.items.length}`;
  quizEls.input.disabled = true;
  quizEls.submitBtn.textContent = currentState.quiz.currentIndex >= currentState.quiz.items.length - 1
    ? 'Scoring...'
    : 'Next...';
  announceQuizResult(isCorrect, item);
  scheduleQuizAdvance();
}

function renderHomePage() {
  closeQuiz();
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  
  SCENES.forEach(scene => {
    const card = document.createElement('div');
    card.className = 'cpt-pixel-flashcard';
    card.onclick = () => openScene(scene.id);
    card.innerHTML = `
      <img class="pixel-cover" src="${scene.cover}" alt="${scene.name}" loading="lazy">
      <div class="pixel-en">${scene.name}</div>
      <div class="pixel-zh">${scene.zh}</div>
    `;
    grid.appendChild(card);
  });
  
  document.getElementById('topNav').classList.remove('scene-active');
  document.getElementById('navControls').style.display = 'none';
  currentState.isHomePage = true;
  currentState.currentScene = null;
  currentState.words = [];
}

function openScene(sceneId) {
  try {
    const scene = SCENES.find(s => s.id === sceneId);
    if (!scene) throw new Error('场景不存在');
    
    const words = WORDS_DATA[sceneId];
    if (!words) throw new Error('词汇数据不存在');
    
    currentState.currentScene = scene;
    currentState.words = words;
    renderScenePage(words);
  } catch (error) {
    console.error('打开场景失败:', error);
    showError('无法加载场景数据：' + error.message);
  }
}

function renderScenePage(words) {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  
  document.getElementById('topNav').classList.add('scene-active');
  document.getElementById('navControls').style.display = 'flex';
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
    card.onclick = () => flipCard(index);
    
    card.innerHTML = `
      <img class="pixel-cover" src="res/images/${currentState.currentScene.id}/${word.file}" alt="${word.en}" loading="lazy">
      <div class="pixel-en" style="${currentState.showEnglish ? '' : 'display: none;'}">${word.en}</div>
      <div class="pixel-zh" style="${currentState.showChinese ? '' : 'display: none;'}">${word.zh}</div>
    `;
    
    cardContainer.appendChild(card);
    grid.appendChild(cardContainer);
  });
  
  currentState.isHomePage = false;
  window.scrollTo(0, 0);
}

function setupBackButton() {
  document.getElementById('backBtn').onclick = () => {
    if (currentState.quiz.active) {
      closeQuiz();
      return;
    }
    stopAutoMode();
    renderHomePage();
  };
}

function updateControlButtons() {
  const btnZh = document.getElementById('btnZh');
  const btnEn = document.getElementById('btnEn');
  const btnAuto = document.getElementById('btnAuto');
  
  btnZh.dataset.active = currentState.showChinese;
  btnEn.dataset.active = currentState.showEnglish;
  
  if (currentState.autoMode) {
    btnAuto.classList.add('active');
    btnAuto.innerHTML = '⏸ 暂停';
  } else {
    btnAuto.classList.remove('active');
    btnAuto.innerHTML = '▶ 自动';
  }
}

function toggleChinese() {
  currentState.showChinese = !currentState.showChinese;
  updateCardVisibility();
  updateControlButtons();
}

function toggleEnglish() {
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

function toggleTtsAccent() {
  if (currentState.ttsAccent === 'en-US') {
    currentState.ttsAccent = 'en-GB';
    document.getElementById('ttsAccentLabel').textContent = 'UK';
  } else {
    currentState.ttsAccent = 'en-US';
    document.getElementById('ttsAccentLabel').textContent = 'US';
  }
  playPronunciation(0, true);
}

function toggleAutoMode() {
  currentState.autoMode = !currentState.autoMode;
  updateControlButtons();
  
  if (currentState.autoMode) {
    let index = 0;
    const cards = document.querySelectorAll('.card');
    
    currentState.autoModeInterval = setInterval(() => {
      cards.forEach(card => {
        const flashcard = card.querySelector('.cpt-pixel-flashcard');
        if (flashcard) flashcard.classList.remove('pixel-flashcard--highlight');
      });
      
      const currentCard = cards[index]?.querySelector('.cpt-pixel-flashcard');
      if (currentCard) {
        currentCard.classList.add('pixel-flashcard--highlight');
        currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      playCurrentCardTTS(index);
      
      index++;
      if (index >= cards.length) index = 0;
    }, 3000);
  } else {
    stopAutoMode();
  }
}

function playCurrentCardTTS(index) {
  const word = currentState.words[index];
  if (word) {
    speakText(word.en, { lang: currentState.ttsAccent, rate: 0.85, force: true });
  }
}

function playPronunciation(index) {
  const word = currentState.words[index];
  if (!word) return;

  speakText(word.en, { lang: currentState.ttsAccent, rate: 0.85, force: true });
}

function startQuiz() {
  if (currentState.isHomePage || !currentState.currentScene || !currentState.words.length) {
    showToast('请先进入一个场景再开始测验');
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
  quizEls.setup.style.display = 'block';
  quizEls.questionSection.style.display = 'none';
  quizEls.title.textContent = '场景测验';
  quizEls.sceneName.textContent = `${currentState.currentScene.name} / ${currentState.currentScene.zh}`;
  quizEls.score.textContent = 'Ready';
  quizEls.progress.textContent = '选择难度';
  quizEls.cancelBtn.textContent = '退出测验';
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
  currentState.quiz.hintVisible = false;

  if (!currentState.quiz.items.length) {
    showToast('当前场景没有可测验的词汇');
    closeQuiz();
    return;
  }

  renderQuizQuestion();
}

function flipCard(index) {
  const card = document.querySelector(`.cpt-pixel-flashcard[data-index="${index}"]`);
  if (!card) return;

  card.style.transform = 'scale(0.95)';
  setTimeout(() => { card.style.transform = 'scale(1)'; }, 150);
  playPronunciation(index);
}

function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-content">${message}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, duration);
}

function showError(message) {
  document.getElementById('errorModalText').textContent = message;
  document.getElementById('errorModal').style.display = 'flex';
}

function closeErrorModal() {
  document.getElementById('errorModal').style.display = 'none';
}
