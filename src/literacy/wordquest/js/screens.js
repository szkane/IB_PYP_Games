/**
 * WordQuest - Screen Renderer & Game Orchestrator
 *
 * Renders all app screens (home, categories, mode-select, play, done) and
 * manages the current game instance lifecycle. Each render method receives
 * a container DOM element and fills it with screen content.
 *
 * Route actions (from router.parseRoute().action):
 *   home | categories | mode-select | play
 *
 * The "done" screen is shown programmatically from game onComplete callbacks
 * (the router does not produce a "done" action).
 */

import { VOCAB, GRADES, WordUtil } from './data.js';
import { speech, sfx } from './audio.js';
import { progress } from './progress.js';
import { router } from './router.js';
import { WordSearchGame } from './wordsearch/controller.js';
import { CrosswordGame } from './crossword/controller.js';

/** @type {WordSearchGame | CrosswordGame | null} */
let currentGame = null;

/* ---------------------------------------------------------------------------
 * DOM helpers
 * ------------------------------------------------------------------------ */

/**
 * Create a DOM element with optional class and text content.
 * @param {string} tag - HTML tag name
 * @param {string} [className] - CSS class(es)
 * @param {string} [text] - Text content
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

/**
 * Create a back button that navigates to the given hash on click.
 * @param {string} label - Button label
 * @param {string} target - Hash target (e.g. '#/g/g1')
 * @returns {HTMLButtonElement}
 */
function backButton(label, target) {
  const btn = el('button', 'btn btn-back', label);
  btn.addEventListener('click', () => router.navigate(target));
  return btn;
}

/**
 * Unlock speech + sfx audio engines (idempotent, safe to call repeatedly).
 */
function unlockAudio() {
  try { speech.unlock(); sfx.unlock(); } catch (e) { /* non-critical */ }
}

/**
 * Render a simple error screen with a back button.
 * @param {HTMLElement} container
 * @param {string} message
 * @param {string} backLabel
 * @param {string} backTarget
 */
function renderError(container, message, backLabel, backTarget) {
  const screen = el('div', 'screen text-center');
  screen.appendChild(el('p', '', message));
  const btn = el('button', 'btn btn-primary mt-2', backLabel);
  btn.addEventListener('click', () => router.navigate(backTarget));
  screen.appendChild(btn);
  container.appendChild(screen);
}

/* ---------------------------------------------------------------------------
 * Screens
 * ------------------------------------------------------------------------ */

export const screens = {
  /**
   * Home screen — grade selection grid.
   * Shows 4 large cards (KG, G1, G2, G3) with progress dots.
   * @param {HTMLElement} container
   */
  renderHome(container) {
    const screen = el('div', 'screen');

    const header = el('div', 'screen-header');
    header.appendChild(el('h1', '', 'WordQuest'));
    header.appendChild(el('p', '', 'Pick your grade to start the adventure!'));
    screen.appendChild(header);

    const grid = el('div', 'grade-grid');
    for (const grade of GRADES) {
      const card = el('div', 'grade-card');
      card.appendChild(el('div', 'grade-icon', grade.icon));
      card.appendChild(el('div', 'grade-label', grade.label));

      const prog = progress.getGradeProgress(grade.id);
      card.appendChild(el('div', '', `${prog.fullyDone} / ${prog.total} done`));

      // Progress dots (cap at 20 to keep layout tidy)
      const dots = el('div', 'progress-dots');
      const maxDots = Math.min(prog.total, 20);
      for (let i = 0; i < maxDots; i++) {
        dots.appendChild(el('span', 'progress-dot' + (i < prog.fullyDone ? ' filled' : '')));
      }
      card.appendChild(dots);

      card.addEventListener('click', () => {
        unlockAudio();
        router.navigate('#/g/' + grade.id);
      });
      grid.appendChild(card);
    }

    screen.appendChild(grid);
    container.appendChild(screen);
  },

  /**
   * Categories screen — list all word categories for a grade.
   * Each card shows the category name, word count, and WS/CW star status.
   * @param {HTMLElement} container
   * @param {string} gradeId
   */
  renderCategories(container, gradeId) {
    const grade = GRADES.find(g => g.id === gradeId);
    const cats = VOCAB[gradeId] || [];
    if (!grade) {
      renderError(container, 'Grade not found.', 'Back to Home', '#/');
      return;
    }

    const screen = el('div', 'screen');

    const backRow = el('div');
    backRow.style.marginBottom = '12px';
    backRow.appendChild(backButton('\u2190 Home', '#/'));
    screen.appendChild(backRow);

    const header = el('div', 'screen-header');
    header.appendChild(el('h1', '', `${grade.icon} ${grade.label}`));
    header.appendChild(el('p', '', 'Choose a word category'));
    screen.appendChild(header);

    const grid = el('div', 'cat-grid');
    for (const cat of cats) {
      const card = el('div', 'cat-card');
      card.appendChild(el('div', 'cat-name', cat.name));
      card.appendChild(el('span', 'word-count', `${cat.words.length} words`));

      const catProg = progress.getCategory(gradeId, cat.id);
      const starRow = el('div', 'star-row');
      starRow.appendChild(el('span', 'mode-star' + (catProg.starWS ? '' : ' empty'), '\uD83D\uDD0D'));
      starRow.appendChild(el('span', 'mode-star' + (catProg.starCW ? '' : ' empty'), '\u270F\uFE0F'));
      card.appendChild(starRow);

      if (catProg.starWS && catProg.starCW) {
        card.classList.add('done');
      }

      card.addEventListener('click', () => {
        unlockAudio();
        router.navigate(`#/g/${gradeId}/${cat.id}`);
      });
      grid.appendChild(card);
    }

    screen.appendChild(grid);
    container.appendChild(screen);
  },

  /**
   * Mode selection screen — choose Word Search or Crossword for a category.
   * Crossword is disabled when fewer than 4 words are crossword-usable
   * (3–8 lowercase letters).
   * @param {HTMLElement} container
   * @param {string} gradeId
   * @param {string} catId
   */
  renderModeSelect(container, gradeId, catId) {
    const grade = GRADES.find(g => g.id === gradeId);
    const category = VOCAB[gradeId] && VOCAB[gradeId].find(c => c.id === catId);
    if (!grade || !category) {
      renderError(container, 'Category not found.', 'Back to Home', '#/');
      return;
    }

    const catProg = progress.getCategory(gradeId, catId);

    // Count crossword-usable words (3–8 pure lowercase letters)
    const cwUsable = category.words.filter(w => {
      const c = WordUtil.gridChars(w);
      return /^[a-z]{3,8}$/.test(c);
    }).length;
    const cwDisabled = cwUsable < 4;

    const screen = el('div', 'screen');

    const backRow = el('div');
    backRow.style.marginBottom = '12px';
    backRow.appendChild(backButton('\u2190 Back', `#/g/${gradeId}`));
    screen.appendChild(backRow);

    const header = el('div', 'screen-header');
    header.appendChild(el('h1', '', category.name));
    header.appendChild(el('p', '', `${category.words.length} words \u00B7 ${cwUsable} crossword-ready`));
    screen.appendChild(header);

    const grid = el('div', 'mode-grid');

    // --- Word Search card (always available) ---
    const wsCard = el('div', 'mode-card');
    wsCard.appendChild(el('div', 'mode-icon', '\uD83D\uDD0D'));
    wsCard.appendChild(el('div', 'mode-title', 'Word Search'));
    wsCard.appendChild(el('div', 'mode-desc', 'Find hidden words in the grid'));
    if (catProg.starWS) {
      wsCard.appendChild(el('div', 'mode-badge', '\u2713 Done'));
    }
    wsCard.addEventListener('click', () => {
      unlockAudio();
      router.navigate(`#/g/${gradeId}/${catId}/ws/play`);
    });
    grid.appendChild(wsCard);

    // --- Crossword card (disabled if too few usable words) ---
    const cwCard = el('div', 'mode-card');
    cwCard.appendChild(el('div', 'mode-icon', '\u270F\uFE0F'));
    cwCard.appendChild(el('div', 'mode-title', 'Crossword'));
    if (cwDisabled) {
      cwCard.appendChild(el('div', 'mode-desc', 'Too few words for crossword'));
      cwCard.style.opacity = '0.5';
      cwCard.style.cursor = 'not-allowed';
    } else {
      cwCard.appendChild(el('div', 'mode-desc', 'Fill in the puzzle'));
      if (catProg.starCW) {
        cwCard.appendChild(el('div', 'mode-badge', '\u2713 Done'));
      }
      cwCard.addEventListener('click', () => {
        unlockAudio();
        router.navigate(`#/g/${gradeId}/${catId}/cw/play`);
      });
    }
    grid.appendChild(cwCard);

    screen.appendChild(grid);
    container.appendChild(screen);
  },

  /**
   * Play screen — set up the game container and start the game controller.
   *
   * For Word Search: the controller renders its own header (with a back
   * button via onBack), word list, and grid. On completion it shows a
   * built-in card which we replace with our own renderDone card.
   *
   * For Crossword: the controller renders only the board, letter bank, and
   * clues. We render a header with a back button above it, and on completion
   * we append our renderDone card below the solved board.
   *
   * @param {HTMLElement} container
   * @param {string} gradeId
   * @param {string} catId
   * @param {string} mode - 'ws' or 'cw'
   */
  renderPlay(container, gradeId, catId, mode) {
    const grade = GRADES.find(g => g.id === gradeId);
    const category = VOCAB[gradeId] && VOCAB[gradeId].find(c => c.id === catId);
    if (!grade || !category) {
      renderError(container, 'Category not found.', 'Back to Home', '#/');
      return;
    }
    if (mode !== 'ws' && mode !== 'cw') {
      renderError(container, 'Unknown game mode.', 'Back', `#/g/${gradeId}/${catId}`);
      return;
    }

    // Pick words for this round (excludes previously-seen words via progress)
    const words = progress.getRoundWords(gradeId, catId, category, 8);
    if (!words || !words.length) {
      renderError(container, 'No words available for this category.', 'Back', `#/g/${gradeId}/${catId}`);
      return;
    }

    // Clean up any previous game instance
    if (currentGame) { currentGame.destroy(); currentGame = null; }

    const modeName = mode === 'ws' ? 'Word Search' : 'Crossword';
    const backHref = `#/g/${gradeId}/${catId}`;

    const host = el('div', 'game-host screen');

    // Crossword controller has no built-in header — render our own.
    // Word Search renders its own header (with onBack), so we skip ours.
    if (mode === 'cw') {
      const header = el('div', 'game-header');
      header.appendChild(backButton('\u2190 Back', backHref));
      header.appendChild(el('div', 'game-title', `${category.name} \u00B7 ${modeName}`));
      host.appendChild(header);
    }

    const gameContainer = el('div');
    gameContainer.id = 'game-container';
    host.appendChild(gameContainer);

    container.appendChild(host);

    try {
      if (mode === 'ws') {
        currentGame = new WordSearchGame(gameContainer, {
          words, gradeId,
          onBack: () => router.navigate(backHref),
          onComplete: () => {
            progress.recordCompletion(gradeId, catId, 'ws', words);
            // Replace controller's built-in completion card with our own
            // (our "Play Again" picks fresh words via getRoundWords)
            const wsCard = gameContainer.querySelector('.ws-complete-card');
            if (wsCard) wsCard.remove();
            screens.renderDone(host, gradeId, catId, 'ws');
          },
          onFound: () => { /* optional extra feedback hook */ }
        });
      } else {
        currentGame = new CrosswordGame(gameContainer, {
          words, gradeId,
          onComplete: () => {
            progress.recordCompletion(gradeId, catId, 'cw', words);
            // Crossword controller has no completion card — show ours
            screens.renderDone(host, gradeId, catId, 'cw');
          }
        });
      }
      currentGame.start();
    } catch (err) {
      console.error('[WordQuest] Failed to start game:', err);
      gameContainer.innerHTML = '';
      gameContainer.appendChild(el('p', 'text-center', 'Could not start the game. Please try again.'));
      const retry = el('button', 'btn btn-primary mt-2', 'Back');
      retry.addEventListener('click', () => router.navigate(backHref));
      gameContainer.appendChild(retry);
    }
  },

  /**
   * Completion card — celebration with stars and navigation buttons.
   * Appended to the given container (below the completed game board).
   *
   * "Next" intelligently navigates: if both modes are done (or the other
   * mode is unavailable), advance to the next category; otherwise switch
   * to the uncompleted mode. Falls back to "All Done!" on the last category.
   *
   * "Play Again" destroys the current game and re-renders renderPlay, which
   * calls getRoundWords again to pick fresh words based on updated progress.
   * "Back to Categories" navigates to the categories screen.
   *
   * @param {HTMLElement} container
   * @param {string} gradeId
   * @param {string} catId
   * @param {string} mode - 'ws' or 'cw'
   */
  renderDone(container, gradeId, catId, mode) {
    const catProg = progress.getCategory(gradeId, catId);

    // --- Determine Next button target ---
    const cats = VOCAB[gradeId] || [];
    const currentIdx = cats.findIndex(c => c.id === catId);
    const category = cats.find(c => c.id === catId);

    // Check if Crossword is usable (need ≥4 words with 3–8 pure lowercase letters)
    let cwUsable = false;
    if (category) {
      const usable = category.words.filter(w => {
        const c = WordUtil.gridChars(w);
        return /^[a-z]{3,8}$/.test(c);
      }).length;
      cwUsable = usable >= 4;
    }

    // Decide Next destination based on completion state
    const bothDone = catProg.starWS && catProg.starCW;
    let nextHref = null;
    let nextLabel = 'Next';

    if (bothDone || (mode === 'ws' && catProg.starWS && !cwUsable) || (mode === 'cw' && catProg.starCW && !cwUsable)) {
      // Both modes done (or current done + other unusable) → next category
      if (currentIdx < cats.length - 1) {
        const nextCat = cats[currentIdx + 1];
        nextHref = `#/g/${gradeId}/${nextCat.id}`;
        nextLabel = `Next: ${nextCat.name}`;
      } else {
        nextHref = `#/g/${gradeId}`;
        nextLabel = 'All Done!';
      }
    } else {
      // Only current mode done → try other mode
      if (mode === 'ws' && !catProg.starCW && cwUsable) {
        nextHref = `#/g/${gradeId}/${catId}/cw/play`;
        nextLabel = 'Next: Crossword';
      } else if (mode === 'cw' && !catProg.starWS) {
        nextHref = `#/g/${gradeId}/${catId}/ws/play`;
        nextLabel = 'Next: Word Search';
      }
    }

    const card = el('div', 'complete-card');
    card.appendChild(el('div', 'complete-emoji', '\uD83C\uDF89'));
    card.appendChild(el('h2', '', 'Great job!'));
    card.appendChild(el('p', '', 'You completed the puzzle!'));

    // Stars: WS star + CW star
    const stars = el('div', 'complete-stars');
    stars.appendChild(el('span', 'star' + (catProg.starWS ? '' : ' empty'), '\u2B50'));
    stars.appendChild(el('span', 'star' + (catProg.starCW ? '' : ' empty'), '\u2B50'));
    card.appendChild(stars);

    // Buttons
    const btnRow = el('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';

    // Next button (green, most prominent)
    if (nextHref) {
      const nextBtn = el('button', 'btn btn-good', nextLabel);
      nextBtn.addEventListener('click', () => {
        router.navigate(nextHref);
      });
      btnRow.appendChild(nextBtn);
    }

    // Play Again (secondary)
    const playAgain = el('button', 'btn btn-secondary', 'Play Again');
    playAgain.addEventListener('click', () => {
      // Destroy current game and re-render with fresh words
      if (currentGame) { currentGame.destroy(); currentGame = null; }
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.innerHTML = '';
        screens.renderPlay(appEl, gradeId, catId, mode);
      }
    });
    btnRow.appendChild(playAgain);

    // Back to Categories (secondary)
    const backCats = el('button', 'btn btn-secondary', 'Back to Categories');
    backCats.addEventListener('click', () => {
      router.navigate(`#/g/${gradeId}`);
    });
    btnRow.appendChild(backCats);

    card.appendChild(btnRow);
    const overlay = el('div', 'complete-overlay');
    overlay.appendChild(card);
    container.appendChild(overlay);
    // 移除 scrollIntoView — fixed 定位不需要
    try { sfx.complete(); } catch (e) { /* non-critical */ }
  }
};

/**
 * Destroy the current game instance.
 * Called by main.js on every route change to release event listeners and DOM.
 */
export function destroyCurrentGame() {
  if (currentGame) {
    try {
      currentGame.destroy();
    } catch (e) {
      console.error('[WordQuest] Error destroying game:', e);
    }
    currentGame = null;
  }
}
