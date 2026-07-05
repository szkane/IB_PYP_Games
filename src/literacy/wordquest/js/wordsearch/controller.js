/**
 * WordSearchGame - Interactive word search controller.
 * Renders the grid UI and handles drag-to-select interaction via Pointer Events.
 *
 * Usage:
 *   const game = new WordSearchGame(container, {
 *     words: ['cat', 'bat', 'hat'],
 *     gradeId: 'g1',
 *     onComplete: () => { ... },
 *     onFound: (word) => { ... }
 *   });
 *   game.start();
 */

import { generateGrid } from './grid.js';
import { speech, sfx } from '../audio.js';

export class WordSearchGame {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {Object} options - Game options
   * @param {string[]} options.words - Words to hide in the grid
   * @param {string} options.gradeId - Grade level: 'kg' | 'g1' | 'g2' | 'g3'
   * @param {Function} [options.onComplete] - Called when all words are found
   * @param {Function} [options.onFound] - Called when a single word is found
   * @param {Function} [options.onBack] - Called when back button is clicked
   */
  constructor(container, options) {
    this.container = container;
    this.words = (options && options.words) || [];
    this.gradeId = (options && options.gradeId) || 'g3';
    this.onComplete = (options && options.onComplete) || (() => {});
    this.onFound = (options && options.onFound) || (() => {});
    this.onBack = (options && options.onBack) || null;

    /** @type {{ grid: string[][], placements: Array, size: number } | null} */
    this.gridData = null;
    /** Set of found word chars strings */
    this.foundWords = new Set();
    /** 2D array of cell DOM elements [r][c] */
    this.cellElements = [];

    this.selecting = false;
    this.selStart = null;
    this.selCells = [];

    this._destroyed = false;
    this._confettiAnimId = null;
    this._bound = {};
  }

  /**
   * Generate the grid and render the game UI.
   */
  start() {
    try {
      this.gridData = generateGrid(this.words, this.gradeId);
      if (!this.gridData.grid.length || !this.gridData.placements.length) {
        this.renderError('No valid words to search. Please try a different set.');
        return;
      }
      this.injectStyles();
      this.render();
      this.bindEvents();
    } catch (err) {
      console.error('[WordSearch] Failed to start:', err);
      this.renderError('Something went wrong. Please try again.');
    }
  }

  /**
   * Inject game-specific CSS into document head (once).
   */
  injectStyles() {
    if (document.getElementById('ws-styles')) return;
    const style = document.createElement('style');
    style.id = 'ws-styles';
    style.textContent = `
.ws-game {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
}
.ws-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ws-title {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--ink, #1e1b4b);
  flex: 1;
}
.ws-progress-text {
  font-weight: 800;
  color: var(--accent, #7c3aed);
  font-size: 0.95rem;
  white-space: nowrap;
}
.ws-progress-bar {
  width: 100%;
  height: 12px;
  background: var(--accent-light, #ede9fe);
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--ink, #1e1b4b);
}
.ws-progress-fill {
  height: 100%;
  width: 0%;
  background: var(--accent, #7c3aed);
  border-radius: 6px;
  transition: width 0.4s ease;
}
.ws-word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 8px 0;
}
.ws-word-chip {
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--accent-light, #ede9fe);
  font-weight: 700;
  font-size: 14px;
  color: var(--ink, #1e1b4b);
  cursor: pointer;
  transition: all 0.2s ease;
}
.ws-word-chip.found {
  background: var(--good, #10b981);
  color: #fff;
  text-decoration: line-through;
  opacity: 0.7;
}
.ws-grid-scroll {
  overflow-x: auto;
  display: flex;
  justify-content: center;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}
.ws-grid {
  display: grid;
  gap: 2px;
  background: var(--accent-light, #ede9fe);
  padding: 8px;
  border-radius: 12px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  width: fit-content;
}
.ws-cell {
  width: clamp(28px, 6vw, 44px);
  height: clamp(28px, 6vw, 44px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(14px, 3vw, 22px);
  font-weight: 700;
  background: var(--panel, #fff);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.ws-cell.selected {
  background: var(--accent, #7c3aed);
  color: #fff;
  transform: scale(0.92);
}
.ws-cell.found {
  background: var(--good, #10b981);
  color: #fff;
}
.ws-cell.found.selected {
  background: var(--good, #10b981);
  box-shadow: 0 0 0 3px var(--accent, #7c3aed);
}
.ws-error {
  text-align: center;
  padding: 40px 20px;
}
.ws-error p {
  color: var(--ink, #1e1b4b);
  font-size: 1.1rem;
  margin-bottom: 16px;
}
.ws-complete-card {
  max-width: 400px;
  margin: 20px auto;
  padding: 40px;
  background: var(--panel, #fff);
  border: 3px solid var(--ink, #1e1b4b);
  border-radius: 16px;
  box-shadow: 6px 6px 0 var(--ink, #1e1b4b);
  text-align: center;
  animation: wsPopIn 0.4s ease;
}
.ws-complete-emoji {
  font-size: 64px;
  line-height: 1;
}
.ws-complete-card h2 {
  margin-top: 12px;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--ink, #1e1b4b);
}
.ws-complete-card p {
  margin-top: 8px;
  color: var(--muted, #6b7280);
  font-weight: 600;
}
.ws-complete-stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 20px 0;
}
.ws-star {
  font-size: 32px;
  line-height: 1;
}
.ws-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 4px 4px 0 var(--shadow, #2e1065);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.ws-btn:active {
  transform: translateY(2px);
  box-shadow: 2px 2px 0 var(--shadow, #2e1065);
}
.ws-btn-primary {
  background: var(--accent, #7c3aed);
  color: #fff;
}
.ws-btn-back {
  background: var(--panel, #fff);
  color: var(--ink, #1e1b4b);
  border: 2px solid var(--ink, #1e1b4b);
  padding: 8px 16px;
  font-size: 0.9rem;
}
@keyframes wsPopIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@media (max-width: 640px) {
  .ws-cell {
    width: clamp(24px, 8vw, 32px);
    height: clamp(24px, 8vw, 32px);
    font-size: clamp(12px, 3.5vw, 16px);
  }
  .ws-complete-card {
    margin: 12px auto;
    padding: 28px 20px;
  }
  .ws-complete-emoji {
    font-size: 52px;
  }
  .ws-star {
    font-size: 28px;
  }
}
    `;
    document.head.appendChild(style);
  }

  /**
   * Build the game DOM: header, word list, and grid.
   */
  render() {
    this.container.innerHTML = '';

    const game = document.createElement('div');
    game.className = 'ws-game';

    // --- Header: back button (optional) + title + progress ---
    const header = document.createElement('div');
    header.className = 'ws-header';

    if (this.onBack) {
      const backBtn = document.createElement('button');
      backBtn.className = 'ws-btn ws-btn-back';
      backBtn.textContent = '\u2190 Back';
      backBtn.addEventListener('click', () => {
        if (!this._destroyed) this.onBack();
      });
      header.appendChild(backBtn);
    }

    const title = document.createElement('div');
    title.className = 'ws-title';
    title.textContent = '\uD83D\uDD0D Word Search';
    header.appendChild(title);

    const progressText = document.createElement('span');
    progressText.className = 'ws-progress-text';
    progressText.textContent = `0 / ${this.gridData.placements.length}`;
    header.appendChild(progressText);

    const progressBar = document.createElement('div');
    progressBar.className = 'ws-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'ws-progress-fill';
    progressBar.appendChild(progressFill);
    header.appendChild(progressBar);

    game.appendChild(header);

    // --- Word list ---
    const wordList = document.createElement('div');
    wordList.className = 'ws-word-list';
    for (const p of this.gridData.placements) {
      const chip = document.createElement('span');
      chip.className = 'ws-word-chip';
      chip.dataset.chars = p.chars;
      chip.textContent = p.display;
      chip.title = 'Click to hear: ' + p.display;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        try { speech.speak(p.display); } catch (err) { /* non-critical */ }
      });
      wordList.appendChild(chip);
    }
    game.appendChild(wordList);

    // --- Grid ---
    const gridScroll = document.createElement('div');
    gridScroll.className = 'ws-grid-scroll';

    const grid = document.createElement('div');
    grid.className = 'ws-grid';
    grid.style.gridTemplateColumns = `repeat(${this.gridData.size}, 1fr)`;

    this.cellElements = [];
    for (let r = 0; r < this.gridData.size; r++) {
      this.cellElements[r] = [];
      for (let c = 0; c < this.gridData.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.textContent = this.gridData.grid[r][c];
        grid.appendChild(cell);
        this.cellElements[r][c] = cell;
      }
    }

    gridScroll.appendChild(grid);
    game.appendChild(gridScroll);

    this.container.appendChild(game);
  }

  /**
   * Bind Pointer Events for drag selection.
   * pointerdown on grid; pointermove/up on document to handle dragging outside.
   */
  bindEvents() {
    const grid = this.container.querySelector('.ws-grid');
    if (!grid) return;

    this._bound = {
      down: (e) => this.onPointerDown(e),
      move: (e) => this.onPointerMove(e),
      up: (e) => this.onPointerUp(e)
    };

    grid.addEventListener('pointerdown', this._bound.down);
    document.addEventListener('pointermove', this._bound.move);
    document.addEventListener('pointerup', this._bound.up);
    document.addEventListener('pointercancel', this._bound.up);
  }

  /**
   * Remove all event listeners.
   */
  unbindEvents() {
    const grid = this.container.querySelector('.ws-grid');
    if (grid) {
      grid.removeEventListener('pointerdown', this._bound.down);
    }
    document.removeEventListener('pointermove', this._bound.move);
    document.removeEventListener('pointerup', this._bound.up);
    document.removeEventListener('pointercancel', this._bound.up);
  }

  /**
   * Pointer down on a cell — start selection.
   * @param {PointerEvent} e
   */
  onPointerDown(e) {
    if (this._destroyed) return;
    const cell = this.getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();

    // Unlock audio on first user interaction
    try { speech.unlock(); sfx.unlock(); } catch (err) { /* non-critical */ }

    this.selecting = true;
    this.selStart = { r: cell.r, c: cell.c };
    this.selCells = [{ r: cell.r, c: cell.c }];
    this.highlightSelection();
  }

  /**
   * Pointer move — extend selection along a straight line.
   * @param {PointerEvent} e
   */
  onPointerMove(e) {
    if (this._destroyed || !this.selecting) return;
    const cell = this.getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;

    // Skip if pointer hasn't moved to a new cell
    const last = this.selCells[this.selCells.length - 1];
    if (last && last.r === cell.r && last.c === cell.c) return;

    // Compute straight line from start to current cell
    const line = this.getLineCells(this.selStart, { r: cell.r, c: cell.c });
    if (line) {
      this.selCells = line;
      this.highlightSelection();
    }
    // If not a valid straight line, keep the previous selection unchanged
  }

  /**
   * Pointer up — check if selection matches a word.
   * @param {PointerEvent} e
   */
  onPointerUp(e) {
    if (this._destroyed || !this.selecting) return;
    this.selecting = false;

    if (this.selCells.length >= 2) {
      this.checkMatch();
    }

    this.clearHighlight();
    this.selStart = null;
    this.selCells = [];
  }

  /**
   * Find the grid cell at the given screen coordinates.
   * @param {number} x - clientX
   * @param {number} y - clientY
   * @returns {{ r: number, c: number } | null}
   */
  getCellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cellEl = el.closest('[data-r][data-c]');
    if (!cellEl || !this.container.contains(cellEl)) return null;
    return {
      r: parseInt(cellEl.dataset.r, 10),
      c: parseInt(cellEl.dataset.c, 10)
    };
  }

  /**
   * Compute all cells along a straight line from start to end.
   * Supports horizontal, vertical, and diagonal (45°) lines.
   * Returns null if start→end is not a straight line.
   *
   * @param {{ r: number, c: number }} start
   * @param {{ r: number, c: number }} end
   * @returns {Array<{ r: number, c: number }> | null}
   */
  getLineCells(start, end) {
    const dr = end.r - start.r;
    const dc = end.c - start.c;

    // Same cell
    if (dr === 0 && dc === 0) return [{ r: start.r, c: start.c }];

    // Horizontal
    if (dr === 0) {
      const cells = [];
      const step = dc > 0 ? 1 : -1;
      for (let c = start.c; c !== end.c + step; c += step) {
        cells.push({ r: start.r, c });
      }
      return cells;
    }

    // Vertical
    if (dc === 0) {
      const cells = [];
      const step = dr > 0 ? 1 : -1;
      for (let r = start.r; r !== end.r + step; r += step) {
        cells.push({ r, c: start.c });
      }
      return cells;
    }

    // Diagonal (must be perfect 45°)
    if (Math.abs(dr) === Math.abs(dc)) {
      const cells = [];
      const rStep = dr > 0 ? 1 : -1;
      const cStep = dc > 0 ? 1 : -1;
      const len = Math.abs(dr);
      for (let i = 0; i <= len; i++) {
        cells.push({ r: start.r + rStep * i, c: start.c + cStep * i });
      }
      return cells;
    }

    // Not a straight line
    return null;
  }

  /**
   * Highlight the current selection cells.
   * Found cells get a ring overlay; normal cells get purple fill.
   */
  highlightSelection() {
    this.clearHighlight();
    for (const { r, c } of this.selCells) {
      const el = this.cellElements[r] && this.cellElements[r][c];
      if (el) {
        el.classList.add('selected');
      }
    }
  }

  /**
   * Remove all selection highlights (does not touch .found).
   */
  clearHighlight() {
    const cells = this.container.querySelectorAll('.ws-cell.selected');
    cells.forEach(el => el.classList.remove('selected'));
  }

  /**
   * Check if the current selection spells a target word (forward or reverse).
   */
  checkMatch() {
    if (!this.selCells.length) return;

    const chars = this.selCells
      .map(({ r, c }) => this.gridData.grid[r][c])
      .join('');
    const reversed = [...chars].reverse().join('');

    for (const p of this.gridData.placements) {
      if (this.foundWords.has(p.chars)) continue;
      if (chars === p.chars || reversed === p.chars) {
        this.markFound(p);
        return;
      }
    }

    // No match — gentle wrong feedback
    try { sfx.wrong(); } catch (err) { /* non-critical */ }
  }

  /**
   * Mark a word as found: highlight cells, cross out chip, play audio.
   * @param {{ chars: string, display: string, cells: Array<{r:number,c:number}> }} placement
   */
  markFound(placement) {
    this.foundWords.add(placement.chars);

    // Mark cells as found (permanent green)
    for (const { r, c } of placement.cells) {
      const el = this.cellElements[r] && this.cellElements[r][c];
      if (el) el.classList.add('found');
    }

    // Cross out the word chip
    const chips = this.container.querySelectorAll('.ws-word-chip');
    for (const chip of chips) {
      if (chip.dataset.chars === placement.chars) {
        chip.classList.add('found');
        break;
      }
    }

    // Update progress bar
    this.updateProgress();

    // Audio: correct sound + speak the word
    try {
      sfx.correct();
      speech.speak(placement.display);
    } catch (err) {
      console.error('[WordSearch] Audio error (non-critical):', err);
    }

    // Callback
    this.onFound(placement.display);

    // Check if all words found
    if (this.isComplete()) {
      this.handleComplete();
    }
  }

  /**
   * Update the progress bar and text.
   */
  updateProgress() {
    const total = this.gridData.placements.length;
    const found = this.foundWords.size;
    const pct = total > 0 ? (found / total) * 100 : 0;

    const fill = this.container.querySelector('.ws-progress-fill');
    if (fill) fill.style.width = pct + '%';

    const text = this.container.querySelector('.ws-progress-text');
    if (text) text.textContent = `${found} / ${total}`;
  }

  /**
   * Check if all words have been found.
   * @returns {boolean}
   */
  isComplete() {
    return this.foundWords.size >= this.gridData.placements.length;
  }

  /**
   * Handle game completion: sound, confetti, completion card, callback.
   */
  handleComplete() {
    try { sfx.complete(); } catch (err) { /* non-critical */ }
    this.showConfetti();
    this.showCompleteCard();
    this.onComplete();
  }

  /**
   * Show confetti animation. Uses window.confetti if available, otherwise
   * falls back to a canvas-based particle effect.
   */
  showConfetti() {
    // Use global confetti library if available
    if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
      try {
        window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        return;
      } catch (err) {
        // Fall through to canvas-based confetti
      }
    }

    // Canvas-based confetti fallback
    let canvas = document.getElementById('ws-confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ws-confetti-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#7c3aed', '#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#ec4899'];
    const particles = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 2 + Math.random() * 3,
        vx: -1 + Math.random() * 2,
        rot: Math.random() * Math.PI * 2,
        vrot: -0.2 + Math.random() * 0.4
      });
    }

    const animate = () => {
      if (this._destroyed) {
        canvas.remove();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vrot;
        if (p.y < canvas.height + 50) {
          alive++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      if (alive > 0) {
        this._confettiAnimId = requestAnimationFrame(animate);
      } else {
        canvas.remove();
        this._confettiAnimId = null;
      }
    };
    animate();
  }

  /**
   * Stop confetti animation and remove canvas.
   */
  stopConfetti() {
    if (this._confettiAnimId) {
      cancelAnimationFrame(this._confettiAnimId);
      this._confettiAnimId = null;
    }
    const canvas = document.getElementById('ws-confetti-canvas');
    if (canvas) canvas.remove();
  }

  /**
   * Show the completion card with stars and a replay button.
   */
  showCompleteCard() {
    const card = document.createElement('div');
    card.className = 'ws-complete-card';
    card.innerHTML = `
      <div class="ws-complete-emoji">\uD83C\uDF89</div>
      <h2>All Found!</h2>
      <p>You found all ${this.foundWords.size} words!</p>
      <div class="ws-complete-stars">
        <span class="ws-star">\u2B50</span>
        <span class="ws-star">\u2B50</span>
        <span class="ws-star">\u2B50</span>
      </div>
    `;

    const btn = document.createElement('button');
    btn.className = 'ws-btn ws-btn-primary';
    btn.textContent = 'Play Again';
    btn.addEventListener('click', () => {
      if (this._destroyed) return;
      this.stopConfetti();
      card.remove();
      this.restart();
    });
    card.appendChild(btn);

    this.container.appendChild(card);
  }

  /**
   * Restart the game with the same words (new grid layout).
   */
  restart() {
    this.stopConfetti();
    this.unbindEvents();
    this.foundWords.clear();
    this.selecting = false;
    this.selStart = null;
    this.selCells = [];
    this.cellElements = [];
    this.start();
  }

  /**
   * Render an error message with a retry button.
   * @param {string} message
   */
  renderError(message) {
    this.container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'ws-error';

    const p = document.createElement('p');
    p.textContent = message;
    div.appendChild(p);

    const btn = document.createElement('button');
    btn.className = 'ws-btn ws-btn-primary';
    btn.textContent = 'Retry';
    btn.addEventListener('click', () => {
      if (this._destroyed) return;
      this.restart();
    });
    div.appendChild(btn);

    this.container.appendChild(div);
  }

  /**
   * Clean up: remove event listeners, DOM content, and confetti.
   */
  destroy() {
    this._destroyed = true;
    this.stopConfetti();
    this.unbindEvents();
    this.container.innerHTML = '';
  }
}
