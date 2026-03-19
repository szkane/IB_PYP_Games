let currentState = {
  isHomePage: true,
  currentScene: null,
  words: [],
  showChinese: true,
  showEnglish: true,
  autoMode: false,
  autoModeInterval: null,
  ttsAccent: 'en-US'
};

document.addEventListener('DOMContentLoaded', () => {
  renderHomePage();
  setupBackButton();
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

function renderHomePage() {
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
    if (currentState.autoModeInterval) {
      clearInterval(currentState.autoModeInterval);
      currentState.autoMode = false;
      currentState.autoModeInterval = null;
    }
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
    if (currentState.autoModeInterval) {
      clearInterval(currentState.autoModeInterval);
      currentState.autoModeInterval = null;
    }
    document.querySelectorAll('.cpt-pixel-flashcard').forEach(card => {
      card.classList.remove('pixel-flashcard--highlight');
    });
  }
}

function playCurrentCardTTS(index) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const word = currentState.words[index];
    if (word) {
      playPronunciation(index);
    }
  }
}

function flipCard(index) {
  const card = document.querySelector(`.cpt-pixel-flashcard[data-index="${index}"]`);
  if (!card) return;
  
  card.style.transform = 'scale(0.95)';
  setTimeout(() => { card.style.transform = 'scale(1)'; }, 150);
  playPronunciation(index);
}

function playPronunciation(index, forcePlay = false) {
  const word = currentState.words[index];
  if (!word) return;
  
  if ('speechSynthesis' in window) {
    if (forcePlay || currentState.autoMode) {
      speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(word.en);
    utterance.lang = currentState.ttsAccent;
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    utterance.onerror = (event) => {
      console.error('[MCWords] TTS error:', event.error);
    };
    
    speechSynthesis.speak(utterance);
  }
}

function startQuiz() {
  showToast('测验功能开发中...');
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