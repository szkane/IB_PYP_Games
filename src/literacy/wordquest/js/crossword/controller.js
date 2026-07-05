/**
 * Crossword Game Controller — rendering + interaction + per-word validation.
 *
 * Default interaction is point-select (tap letter → tap cell) for iPad
 * reliability. HTML5 drag-and-drop is added as a desktop enhancement.
 *
 * Validation is per-word and immediate: as soon as every cell of an across or
 * down word is filled, the word is checked. Correct words lock green; wrong
 * cells flash red and shake, letting the child self-correct.
 *
 * @module crossword/controller
 */

import { speech, sfx } from '../audio.js';
import { generateCrossword } from './generator.js';
import { layoutCrossword } from './layout.js';

/** CSS injected once per controller instance. */
const CW_CSS = `
.cw-game {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.cw-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.cw-board {
  --cw-cell-size: clamp(32px, 7vw, 48px);
  display: inline-grid;
  gap: 1px;
  background: var(--ink);
  padding: 1px;
  border-radius: 8px;
  box-shadow: 3px 3px 0 var(--shadow);
}
.cw-cell {
  width: var(--cw-cell-size);
  height: var(--cw-cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(16px, 3.5vw, 24px);
  font-weight: 700;
  position: relative;
  -webkit-user-select: none;
  user-select: none;
}
.cw-cell.black {
  background: var(--ink);
}
.cw-cell.white {
  background: var(--panel);
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.12s ease;
}
.cw-cell.white:hover {
  background: var(--accent-light);
}
.cw-cell.filled {
  color: var(--ink);
}
.cw-cell.correct {
  background: var(--good);
  color: #fff;
  cursor: default;
  animation: cw-pop 0.3s ease;
}
.cw-cell.wrong {
  background: var(--bad);
  color: #fff;
  animation: cw-shake 0.4s ease;
}
.cw-num {
  position: absolute;
  top: 1px;
  left: 3px;
  font-size: 9px;
  font-weight: 400;
  opacity: 0.55;
  line-height: 1;
}
.cw-letter-text {
  font-size: inherit;
}

@keyframes cw-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
@keyframes cw-pop {
  0% { transform: scale(0.7); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.cw-letter-bank {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 100%;
}
.cw-letter {
  min-width: 44px;
  min-height: 44px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  font-family: inherit;
  background: var(--panel);
  color: var(--ink);
  border: 2px solid var(--accent);
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 3px 3px 0 var(--shadow);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.cw-letter:active {
  transform: translateY(2px);
  box-shadow: 1px 1px 0 var(--shadow);
}
.cw-letter.selected {
  background: var(--accent);
  color: #fff;
  transform: translateY(2px);
  box-shadow: 1px 1px 0 var(--shadow);
}

.cw-clues {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
  width: 100%;
}
.cw-clue-section {
  min-width: 180px;
  max-width: 100%;
  flex: 1;
}
.cw-clue-title {
  font-weight: 900;
  margin-bottom: 8px;
  color: var(--accent);
  font-size: 1rem;
}
.cw-clue-item {
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  background: var(--panel);
  color: var(--ink);
  transition: background 0.15s ease, opacity 0.15s ease;
  touch-action: manipulation;
}
.cw-clue-item:hover {
  background: var(--accent-light);
}
.cw-clue-item.done {
  text-decoration: line-through;
  opacity: 0.45;
}
.cw-clue-item.done .cw-clue-num {
  color: var(--good);
}
.cw-clue-num {
  font-weight: 900;
  margin-right: 6px;
  color: var(--accent);
}
.cw-bonus-item {
  font-style: italic;
  opacity: 0.65;
}

.cw-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 1.05rem;
  font-weight: 600;
}
.cw-error {
  text-align: center;
  padding: 40px 20px;
  color: var(--bad);
  font-weight: 600;
}

@media (max-width: 640px) {
  .cw-clue-section { min-width: 140px; }
  .cw-clues { gap: 12px; }
}
`;

/**
 * Crossword game controller.
 *
 * @example
 * const game = new CrosswordGame(container, {
 *   words: ['cat','bat','hat','mat','rat','fat'],
 *   gradeId: 'kg',
 *   onComplete: () => { ... },
 *   onCorrect: (word) => { ... },
 *   onWrong: () => { ... }
 * });
 * game.start();
 */
export class CrosswordGame {
  /**
   * @param {HTMLElement} container - Element to render into.
   * @param {Object} options
   * @param {string[]} options.words - Raw word list.
   * @param {string} [options.gradeId] - Grade identifier (for analytics).
   * @param {Function} [options.onComplete] - Called when all words are solved.
   * @param {Function} [options.onCorrect] - Called when a single word is solved.
   * @param {Function} [options.onWrong] - Called when a word fails validation.
   */
  constructor(container, options = {}) {
    this.container = container;
    this.words = options.words || [];
    this.gradeId = options.gradeId || '';
    this.onComplete = options.onComplete || (() => {});
    this.onCorrect = options.onCorrect || (() => {});
    this.onWrong = options.onWrong || (() => {});

    // Layout state
    this.solution = null;     // 2D array of solution chars (or null = black)
    this.numbers = null;      // Map "r,c" → clue number
    this.across = [];         // ClueEntry[] (dir='H')
    this.down = [];           // ClueEntry[] (dir='V')
    this.unplaced = [];       // Bonus words [{word, display}]
    this.rows = 0;
    this.cols = 0;

    // User state
    this.userGrid = null;     // 2D array of user letters (null = empty)
    this.cellEls = [];        // 2D array of cell DOM elements (null for black)
    this.selectedLetter = null; // Currently selected bank letter (point-select mode)
    this.completedClues = new Set(); // Set of "${dir}${num}" keys
    this.cellCorrect = new Set();    // Set of "r,c" locked green
    this.cellWrong = new Set();      // Set of "r,c" currently red
    this.totalWords = 0;

    // Internal
    this._audioUnlocked = false;
    this._styleEl = null;
    this._boundClick = null;
    this._boundDragStart = null;
    this._boundDragOver = null;
    this._boundDrop = null;
    this._destroyed = false;
  }

  /** Generate, layout, and render the crossword. */
  start() {
    try {
      const sparse = generateCrossword(this.words);
      const layout = layoutCrossword(sparse);

      this.solution = layout.grid;
      this.numbers = layout.numbers;
      this.across = layout.across;
      this.down = layout.down;
      this.unplaced = layout.unplaced || [];
      this.rows = layout.rows;
      this.cols = layout.cols;
      this.totalWords = this.across.length + this.down.length;

      // Nothing to play (all words filtered out, e.g. sight words < 3 letters)
      if (this.totalWords === 0) {
        this.container.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'cw-empty';
        msg.textContent = 'No words available for a crossword. Try Word Search instead!';
        this.container.appendChild(msg);
        return;
      }

      // Init user grid
      this.userGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));

      this._injectStyles();
      this._render();
      this._bindEvents();
    } catch (err) {
      console.error('[CrosswordGame] start failed:', err);
      this.container.innerHTML = '';
      const msg = document.createElement('p');
      msg.className = 'cw-error';
      msg.textContent = 'Could not build the crossword. Please try another word set.';
      this.container.appendChild(msg);
    }
  }

  /** Inject the cw-* stylesheet once. */
  _injectStyles() {
    if (document.getElementById('cw-styles')) return;
    const style = document.createElement('style');
    style.id = 'cw-styles';
    style.textContent = CW_CSS;
    document.head.appendChild(style);
    this._styleEl = style;
  }

  /** Build the full DOM. */
  _render() {
    this.container.innerHTML = '';

    const game = document.createElement('div');
    game.className = 'cw-game';

    const main = document.createElement('div');
    main.className = 'cw-main';
    main.appendChild(this._renderBoard());
    main.appendChild(this._renderLetterBank());
    game.appendChild(main);

    game.appendChild(this._renderClues());

    this.container.appendChild(game);
  }

  /** Render the crossword grid as a CSS grid of cells. */
  _renderBoard() {
    const board = document.createElement('div');
    board.className = 'cw-board';
    board.style.gridTemplateColumns = `repeat(${this.cols}, var(--cw-cell-size))`;

    this.cellEls = [];
    for (let r = 0; r < this.rows; r++) {
      this.cellEls[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const ch = this.solution[r][c];
        const cell = document.createElement('div');

        if (ch === null) {
          cell.className = 'cw-cell black';
          this.cellEls[r][c] = null;
        } else {
          cell.className = 'cw-cell white';
          cell.dataset.r = r;
          cell.dataset.c = c;

          const num = this.numbers.get(`${r},${c}`);
          if (num) {
            const numSpan = document.createElement('span');
            numSpan.className = 'cw-num';
            numSpan.textContent = num;
            cell.appendChild(numSpan);
          }

          const letterSpan = document.createElement('span');
          letterSpan.className = 'cw-letter-text';
          cell.appendChild(letterSpan);

          this.cellEls[r][c] = cell;
        }
        board.appendChild(cell);
      }
    }
    return board;
  }

  /** Render the A–Z letter bank. */
  _renderLetterBank() {
    const bank = document.createElement('div');
    bank.className = 'cw-letter-bank';
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i); // A-Z uppercase
      const btn = document.createElement('button');
      btn.className = 'cw-letter';
      btn.type = 'button';
      btn.dataset.letter = letter;
      btn.textContent = letter;
      btn.setAttribute('aria-label', `Letter ${letter}`);
      btn.draggable = true; // desktop drag enhancement
      bank.appendChild(btn);
    }
    return bank;
  }

  /** Render across / down clue lists + bonus words. */
  _renderClues() {
    const wrap = document.createElement('div');
    wrap.className = 'cw-clues';

    if (this.across.length) {
      wrap.appendChild(this._renderClueSection('Across', this.across, 'H'));
    }
    if (this.down.length) {
      wrap.appendChild(this._renderClueSection('Down', this.down, 'V'));
    }
    if (this.unplaced.length) {
      const sec = document.createElement('div');
      sec.className = 'cw-clue-section';
      const title = document.createElement('h3');
      title.className = 'cw-clue-title';
      title.textContent = 'Bonus Words';
      sec.appendChild(title);
      for (const u of this.unplaced) {
        const item = document.createElement('div');
        item.className = 'cw-clue-item cw-bonus-item';
        item.dataset.bonus = u.display;
        item.textContent = u.display;
        sec.appendChild(item);
      }
      wrap.appendChild(sec);
    }
    return wrap;
  }

  /**
   * Render a single clue section (Across or Down).
   * @param {string} title
   * @param {ClueEntry[]} entries
   * @param {'H'|'V'} dir
   */
  _renderClueSection(title, entries, dir) {
    const sec = document.createElement('div');
    sec.className = 'cw-clue-section';
    const h = document.createElement('h3');
    h.className = 'cw-clue-title';
    h.textContent = title;
    sec.appendChild(h);
    for (const e of entries) {
      const item = document.createElement('div');
      item.className = 'cw-clue-item';
      item.dataset.dir = dir;
      item.dataset.num = e.num;
      const num = document.createElement('span');
      num.className = 'cw-clue-num';
      num.textContent = e.num;
      item.appendChild(num);
      item.appendChild(document.createTextNode(e.display));
      sec.appendChild(item);
    }
    return sec;
  }

  /** Bind point-select (click) and drag-and-drop (desktop) events. */
  _bindEvents() {
    this._boundClick = (e) => this._onClick(e);
    this._boundDragStart = (e) => this._onDragStart(e);
    this._boundDragOver = (e) => this._onDragOver(e);
    this._boundDrop = (e) => this._onDrop(e);

    this.container.addEventListener('click', this._boundClick);
    this.container.addEventListener('dragstart', this._boundDragStart);
    this.container.addEventListener('dragover', this._boundDragOver);
    this.container.addEventListener('drop', this._boundDrop);
  }

  /** Delegated click handler: cells, letters, clues. */
  _onClick(e) {
    this._unlockAudio();

    // Cell tap (point-select mode)
    const cellEl = e.target.closest('.cw-cell.white');
    if (cellEl) {
      const r = Number(cellEl.dataset.r);
      const c = Number(cellEl.dataset.c);
      this._onCellTap(r, c);
      return;
    }

    // Letter bank tap
    const letterEl = e.target.closest('.cw-letter');
    if (letterEl) {
      this._onLetterTap(letterEl.dataset.letter);
      return;
    }

    // Clue tap → speak
    const clueEl = e.target.closest('.cw-clue-item');
    if (clueEl) {
      if (clueEl.dataset.bonus) {
        this._speak(clueEl.dataset.bonus);
      } else {
        const dir = clueEl.dataset.dir;
        const num = Number(clueEl.dataset.num);
        const list = dir === 'H' ? this.across : this.down;
        const entry = list.find(w => w.num === num);
        if (entry) this._speak(entry.display);
      }
      return;
    }
  }

  _onDragStart(e) {
    const letterEl = e.target.closest('.cw-letter');
    if (!letterEl) return;
    e.dataTransfer.setData('text/plain', letterEl.dataset.letter);
    e.dataTransfer.effectAllowed = 'copy';
  }

  _onDragOver(e) {
    if (e.target.closest('.cw-cell.white')) e.preventDefault();
  }

  _onDrop(e) {
    const cellEl = e.target.closest('.cw-cell.white');
    if (!cellEl) return;
    e.preventDefault();
    const letter = e.dataTransfer.getData('text/plain');
    if (!letter) return;
    this._unlockAudio();
    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);
    this._fillCell(r, c, letter);
  }

  /** Handle a cell tap in point-select mode. */
  _onCellTap(r, c) {
    if (this.solution[r][c] === null) return; // black cell
    const key = `${r},${c}`;
    if (this.cellCorrect.has(key)) return; // locked

    const current = this.userGrid[r][c];

    if (this.selectedLetter) {
      if (current === null) {
        // Fill empty cell
        this._fillCell(r, c, this.selectedLetter);
      } else if (current === this.selectedLetter) {
        // Toggle: same letter → clear
        this._clearCell(r, c);
      } else {
        // Replace with different letter
        this._fillCell(r, c, this.selectedLetter);
      }
    } else if (current !== null) {
      // No letter selected: clear filled cell
      this._clearCell(r, c);
    }
  }

  /** Handle a letter-bank tap (toggle selection). */
  _onLetterTap(letter) {
    this.selectedLetter = (this.selectedLetter === letter) ? null : letter;
    this._refreshLetterBank();
  }

  /** Fill a cell with a letter, then re-validate. */
  _fillCell(r, c, letter) {
    if (this.solution[r][c] === null) return;
    if (this.cellCorrect.has(`${r},${c}`)) return; // locked
    this.userGrid[r][c] = letter;
    this._revalidate();
  }

  /** Clear a cell, then re-validate. */
  _clearCell(r, c) {
    if (this.cellCorrect.has(`${r},${c}`)) return; // locked
    this.userGrid[r][c] = null;
    this._revalidate();
  }

  /**
   * Re-validate all non-completed words.
   *
   * Strategy: clear all wrong states, then for every non-completed word that is
   * full, check correctness. Correct words lock green; wrong cells turn red.
   * Because the grid is small (≤8 words), a full re-scan on every change is
   * cheap and avoids stale-state bugs.
   */
  _revalidate() {
    const prevWrong = new Set(this.cellWrong);
    this.cellWrong = new Set();
    const newlyCompleted = [];

    for (const w of [...this.across, ...this.down]) {
      const clueKey = `${w.dir}${w.num}`;
      if (this.completedClues.has(clueKey)) continue;

      // Is the word fully filled?
      let full = true;
      for (const cell of w.cells) {
        if (this.userGrid[cell.r][cell.c] === null) { full = false; break; }
      }
      if (!full) continue;

      // Validate every cell against the solution
      let allCorrect = true;
      for (const cell of w.cells) {
        const user = this.userGrid[cell.r][cell.c].toLowerCase();
        const sol = this.solution[cell.r][cell.c];
        if (user !== sol) { allCorrect = false; break; }
      }

      if (allCorrect) {
        this.completedClues.add(clueKey);
        for (const cell of w.cells) {
          const k = `${cell.r},${cell.c}`;
          this.cellCorrect.add(k);
          this.cellWrong.delete(k);
        }
        newlyCompleted.push(w);
      } else {
        // Mark mismatched cells (skip those locked by a completed word)
        for (const cell of w.cells) {
          const k = `${cell.r},${cell.c}`;
          if (this.cellCorrect.has(k)) continue;
          const user = this.userGrid[cell.r][cell.c].toLowerCase();
          const sol = this.solution[cell.r][cell.c];
          if (user !== sol) this.cellWrong.add(k);
        }
      }
    }

    // Refresh DOM
    this._refreshCells(prevWrong);
    this._refreshClues();

    // Celebrate newly completed words
    for (const w of newlyCompleted) {
      this._speak(w.display);
      this._sfxCorrect();
      try { this.onCorrect(w); } catch (e) { console.error('[Crossword] onCorrect:', e); }
    }

    // Wrong feedback (only if no word was just completed, to avoid audio clash)
    if (newlyCompleted.length === 0 && this.cellWrong.size > 0) {
      let hasNewWrong = false;
      for (const k of this.cellWrong) {
        if (!prevWrong.has(k)) { hasNewWrong = true; break; }
      }
      if (hasNewWrong) {
        this._sfxWrong();
        try { this.onWrong(); } catch (e) { console.error('[Crossword] onWrong:', e); }
      }
    }

    // Game complete?
    if (this._isComplete()) {
      this._sfxComplete();
      this._launchConfetti();
      try { this.onComplete(); } catch (e) { console.error('[Crossword] onComplete:', e); }
    }
  }

  /** Whether all clues have been solved. */
  _isComplete() {
    return this.totalWords > 0 && this.completedClues.size >= this.totalWords;
  }

  /** Update every cell's content and state classes. */
  _refreshCells(prevWrong) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const el = this.cellEls[r] && this.cellEls[r][c];
        if (!el) continue;
        const key = `${r},${c}`;
        const letter = this.userGrid[r][c];

        const span = el.querySelector('.cw-letter-text');
        if (span) span.textContent = letter || '';

        el.classList.toggle('filled', !!letter);
        el.classList.toggle('correct', this.cellCorrect.has(key));

        const isWrong = this.cellWrong.has(key);
        // Force-replay shake for newly-wrong cells
        if (isWrong && prevWrong && !prevWrong.has(key)) {
          el.classList.remove('wrong');
          void el.offsetWidth; // reflow to restart animation
          el.classList.add('wrong');
        } else {
          el.classList.toggle('wrong', isWrong);
        }
      }
    }
  }

  /** Toggle the "done" state on clue items. */
  _refreshClues() {
    const items = this.container.querySelectorAll('.cw-clue-item:not(.cw-bonus-item)');
    for (const item of items) {
      const clueKey = `${item.dataset.dir}${item.dataset.num}`;
      item.classList.toggle('done', this.completedClues.has(clueKey));
    }
  }

  /** Highlight the selected letter in the bank. */
  _refreshLetterBank() {
    const letters = this.container.querySelectorAll('.cw-letter');
    for (const el of letters) {
      el.classList.toggle('selected', el.dataset.letter === this.selectedLetter);
    }
  }

  // ---- Audio helpers (defensive: audio is non-critical) ----

  _unlockAudio() {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    try { if (speech && speech.unlock) speech.unlock(); } catch (e) { /* non-critical */ }
    try { if (sfx && sfx.unlock) sfx.unlock(); } catch (e) { /* non-critical */ }
  }

  _speak(text) {
    try { if (speech && speech.speak) speech.speak(text); }
    catch (e) { console.error('[Crossword] speak failed:', e); }
  }

  _sfxCorrect() {
    try { if (sfx && sfx.correct) sfx.correct(); }
    catch (e) { console.error('[Crossword] sfx.correct:', e); }
  }

  _sfxWrong() {
    try { if (sfx && sfx.wrong) sfx.wrong(); }
    catch (e) { console.error('[Crossword] sfx.wrong:', e); }
  }

  _sfxComplete() {
    try { if (sfx && sfx.complete) sfx.complete(); }
    catch (e) { console.error('[Crossword] sfx.complete:', e); }
    try { if (sfx && sfx.win) sfx.win(); } catch (e) { /* win optional */ }
  }

  // ---- Confetti ----

  /** Launch a short canvas confetti burst on game completion. */
  _launchConfetti() {
    try {
      const existing = document.getElementById('confetti-canvas');
      if (existing) existing.remove();

      const canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const colors = ['#7c3aed', '#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#ec4899'];
      const particles = [];
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 200,
          w: 8 + Math.random() * 8,
          h: 12 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          vy: 2 + Math.random() * 4,
          vx: -2 + Math.random() * 4,
          rot: Math.random() * 360,
          vrot: -5 + Math.random() * 10
        });
      }

      let frame = 0;
      const animate = () => {
        if (this._destroyed) { canvas.remove(); return; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          p.y += p.vy;
          p.x += p.vx;
          p.rot += p.vrot;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
        frame++;
        if (frame < 180) {
          requestAnimationFrame(animate);
        } else {
          canvas.remove();
        }
      };
      animate();
    } catch (err) {
      console.error('[Crossword] confetti failed:', err);
    }
  }

  /** Clean up DOM and event listeners. */
  destroy() {
    this._destroyed = true;
    if (this._boundClick) this.container.removeEventListener('click', this._boundClick);
    if (this._boundDragStart) this.container.removeEventListener('dragstart', this._boundDragStart);
    if (this._boundDragOver) this.container.removeEventListener('dragover', this._boundDragOver);
    if (this._boundDrop) this.container.removeEventListener('drop', this._boundDrop);
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) canvas.remove();
    this.container.innerHTML = '';
    this.cellEls = [];
    this.completedClues.clear();
    this.cellCorrect.clear();
    this.cellWrong.clear();
  }
}
