/**
 * Crossword Game Controller — 2-column landscape layout, Audio-First / Peek Toggle,
 * active-word cell highlighting, letter-tap click SFX, and physical keyboard typing.
 *
 * @module crossword/controller
 */

import { speech, sfx } from '../audio.js';
import { generateCrossword } from './generator.js';
import { layoutCrossword } from './layout.js';

const CW_CSS = `
.cw-game {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.cw-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  width: 100%;
}
.cw-board-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.cw-active-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  max-width: 520px;
  padding: 8px 14px;
  background: #fffdf0;
  border: 2.5px solid var(--ink);
  border-radius: 12px;
  box-shadow: 3px 3px 0 var(--ink);
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--ink);
}
.cw-hear-active-btn {
  min-height: 36px;
  padding: 4px 12px;
  border: 2px solid var(--ink);
  border-radius: 10px;
  background: #ffe156;
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--ink);
  white-space: nowrap;
}
.cw-hear-active-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}
.cw-board {
  --cw-cell-size: clamp(34px, 6.2vw, 48px);
  display: inline-grid;
  gap: 2px;
  background: var(--ink);
  padding: 3px;
  border-radius: 12px;
  box-shadow: 5px 5px 0 var(--ink);
}
.cw-cell {
  width: var(--cw-cell-size);
  height: var(--cw-cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(16px, 3vw, 24px);
  font-weight: 800;
  position: relative;
  border-radius: 4px;
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
  transition: background 0.12s ease, box-shadow 0.12s ease;
}
.cw-cell.white:hover {
  background: var(--accent-light);
}
.cw-cell.in-active-word {
  background: #ede9fe;
}
.cw-cell.active-cell {
  background: #fef08a;
  box-shadow: inset 0 0 0 3px var(--accent);
}
.cw-cell.filled {
  color: var(--ink);
}
.cw-cell.correct {
  background: var(--good);
  color: #fff;
  cursor: pointer;
  animation: cw-pop 0.3s ease;
}
.cw-cell.correct.active-cell {
  box-shadow: inset 0 0 0 3px var(--ink);
}
.cw-cell.wrong {
  background: var(--bad);
  color: #fff;
  animation: cw-shake 0.4s ease;
}
.cw-num {
  position: absolute;
  top: 2px;
  left: 3px;
  font-size: 9px;
  font-weight: 800;
  opacity: 0.7;
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
  0% { transform: scale(0.75); }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.cw-side-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.cw-bank-card,
.cw-clues-card {
  background: var(--panel);
  border: 3px solid var(--ink);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--ink);
  padding: 12px 14px;
}

.cw-letter-bank {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 6px;
}
.cw-letter {
  min-width: 40px;
  min-height: 42px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  font-family: inherit;
  background: #fffdf0;
  color: var(--ink);
  border: 2.5px solid var(--ink);
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 2px 2px 0 var(--ink);
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease;
}
.cw-letter:hover {
  background: var(--accent-light);
}
.cw-letter:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink);
}
.cw-letter.selected {
  background: var(--accent);
  color: #fff;
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}
.cw-letter-backspace {
  background: #fee2e2;
  font-size: 16px;
}

.cw-clues-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.cw-clues-heading {
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink);
}
.cw-peek-btn {
  min-height: 36px;
  padding: 5px 12px;
  border: 2px solid var(--ink);
  border-radius: 10px;
  background: #fef9c3;
  color: var(--ink);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--ink);
}
.cw-peek-btn.showing {
  background: var(--accent-light);
}
.cw-peek-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}

.cw-clues {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}
.cw-clue-section {
  min-width: 0;
}
.cw-clue-title {
  font-weight: 900;
  margin-bottom: 6px;
  color: var(--accent);
  font-size: 0.92rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.cw-clue-item {
  width: 100%;
  text-align: left;
  padding: 7px 10px;
  min-height: 38px;
  border: 2px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  margin-bottom: 5px;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  background: #f8fafc;
  color: var(--ink);
  transition: background 0.14s ease, border-color 0.14s ease, opacity 0.14s ease;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cw-clue-item:hover {
  background: var(--accent-light);
  border-color: var(--ink);
}
.cw-clue-item.active {
  background: #fef08a;
  border-color: var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
}
.cw-clue-item.done {
  background: #dcfce7;
  color: #166534;
  text-decoration: line-through;
  opacity: 0.8;
}
.cw-clue-num {
  font-weight: 900;
  color: var(--accent);
  flex-shrink: 0;
}
.cw-clue-item.done .cw-clue-num {
  color: var(--good);
}
.cw-bonus-item {
  font-style: italic;
  opacity: 0.72;
}

.cw-empty,
.cw-error {
  text-align: center;
  padding: 40px 20px;
  font-weight: 700;
}
.cw-empty { color: var(--muted); font-size: 1.05rem; }
.cw-error { color: var(--bad); }

@media (min-width: 960px) {
  .cw-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.95fr);
    align-items: start;
    gap: 20px;
  }
  .cw-board {
    --cw-cell-size: clamp(34px, 3.8vw, 48px);
  }
  .cw-letter-bank {
    grid-template-columns: repeat(9, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .cw-clues {
    grid-template-columns: 1fr;
  }
}
`;

export class CrosswordGame {
  constructor(container, options = {}) {
    this.container = container;
    this.words = options.words || [];
    this.gradeId = options.gradeId || '';
    this.onComplete = options.onComplete || (() => {});
    this.onCorrect = options.onCorrect || (() => {});
    this.onWrong = options.onWrong || (() => {});

    this.solution = null;
    this.numbers = null;
    this.across = [];
    this.down = [];
    this.unplaced = [];
    this.rows = 0;
    this.cols = 0;

    this.userGrid = null;
    this.cellEls = [];
    this.selectedLetter = null;
    this.activeClue = null;
    this.activeCell = null;
    this.showWords = false; // Audio-first by default; kids can tap "👁️ Show Words"
    this.completedClues = new Set();
    this.cellCorrect = new Set();
    this.cellWrong = new Set();
    this.totalWords = 0;

    this._audioUnlocked = false;
    this._styleEl = null;
    this._boundClick = null;
    this._boundDragStart = null;
    this._boundDragOver = null;
    this._boundDrop = null;
    this._boundKeyDown = null;
    this._destroyed = false;
  }

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

      if (this.totalWords === 0) {
        this.container.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'cw-empty';
        msg.textContent = 'No words available for a crossword. Try Word Search instead!';
        this.container.appendChild(msg);
        return;
      }

      this.userGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
      const firstClue = this.across[0] || this.down[0] || null;
      this.activeClue = firstClue;
      this.activeCell = firstClue ? { r: firstClue.row, c: firstClue.col } : null;

      this._injectStyles();
      this._render();
      this._refreshActiveHighlight();
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

  _injectStyles() {
    if (document.getElementById('cw-styles')) return;
    const style = document.createElement('style');
    style.id = 'cw-styles';
    style.textContent = CW_CSS;
    document.head.appendChild(style);
    this._styleEl = style;
  }

  _render() {
    this.container.innerHTML = '';

    const game = document.createElement('div');
    game.className = 'cw-game';

    const layout = document.createElement('div');
    layout.className = 'cw-layout';

    // Left column: Active prompt + Board
    const boardCol = document.createElement('div');
    boardCol.className = 'cw-board-col';

    const activeBar = document.createElement('div');
    activeBar.className = 'cw-active-bar';
    const activeText = document.createElement('span');
    activeText.className = 'cw-active-label';
    activeText.id = 'cwActiveLabel';
    const hearBtn = document.createElement('button');
    hearBtn.type = 'button';
    hearBtn.className = 'cw-hear-active-btn';
    hearBtn.dataset.action = 'hear-active';
    hearBtn.textContent = '🔊 Hear Word';
    activeBar.append(activeText, hearBtn);
    boardCol.appendChild(activeBar);
    boardCol.appendChild(this._renderBoard());
    layout.appendChild(boardCol);

    // Right column: A-Z Bank + Clues
    const sideCol = document.createElement('div');
    sideCol.className = 'cw-side-col';

    const bankCard = document.createElement('div');
    bankCard.className = 'cw-bank-card';
    bankCard.appendChild(this._renderLetterBank());
    sideCol.appendChild(bankCard);

    const cluesCard = document.createElement('div');
    cluesCard.className = 'cw-clues-card';
    const cluesHead = document.createElement('div');
    cluesHead.className = 'cw-clues-head';
    const cluesTitle = document.createElement('span');
    cluesTitle.className = 'cw-clues-heading';
    cluesTitle.textContent = '🔊 Tap a clue to hear & highlight';
    const peekBtn = document.createElement('button');
    peekBtn.type = 'button';
    peekBtn.className = 'cw-peek-btn';
    peekBtn.id = 'cwPeekBtn';
    peekBtn.dataset.action = 'toggle-peek';
    peekBtn.textContent = '👁️ Show Words';
    cluesHead.append(cluesTitle, peekBtn);
    cluesCard.appendChild(cluesHead);
    cluesCard.appendChild(this._renderClues());
    sideCol.appendChild(cluesCard);

    layout.appendChild(sideCol);
    game.appendChild(layout);
    this.container.appendChild(game);
  }

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

  _renderLetterBank() {
    const bank = document.createElement('div');
    bank.className = 'cw-letter-bank';
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      const btn = document.createElement('button');
      btn.className = 'cw-letter';
      btn.type = 'button';
      btn.dataset.letter = letter;
      btn.textContent = letter;
      btn.setAttribute('aria-label', `Letter ${letter}`);
      btn.draggable = true;
      bank.appendChild(btn);
    }
    const backBtn = document.createElement('button');
    backBtn.className = 'cw-letter cw-letter-backspace';
    backBtn.type = 'button';
    backBtn.dataset.action = 'backspace';
    backBtn.textContent = '⌫';
    backBtn.title = 'Erase letter';
    backBtn.setAttribute('aria-label', 'Backspace');
    bank.appendChild(backBtn);
    return bank;
  }

  _renderClues() {
    const wrap = document.createElement('div');
    wrap.className = 'cw-clues';

    if (this.across.length) {
      wrap.appendChild(this._renderClueSection('Across →', this.across, 'H'));
    }
    if (this.down.length) {
      wrap.appendChild(this._renderClueSection('Down ↓', this.down, 'V'));
    }
    if (this.unplaced.length) {
      const sec = document.createElement('div');
      sec.className = 'cw-clue-section';
      const title = document.createElement('h3');
      title.className = 'cw-clue-title';
      title.textContent = 'Bonus Words';
      sec.appendChild(title);
      for (const u of this.unplaced) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cw-clue-item cw-bonus-item';
        item.dataset.bonus = u.display;
        item.textContent = `🔊 ${u.display}`;
        sec.appendChild(item);
      }
      wrap.appendChild(sec);
    }
    return wrap;
  }

  _formatClueLabel(entry) {
    const clueKey = `${entry.dir}${entry.num}`;
    if (this.completedClues.has(clueKey)) {
      return `✓ ${entry.display}`;
    }
    if (this.showWords) {
      return `🔊 ${entry.display} (${entry.len})`;
    }
    return `🔊 Word ${entry.num} (${entry.len} letters)`;
  }

  _renderClueSection(title, entries, dir) {
    const sec = document.createElement('div');
    sec.className = 'cw-clue-section';
    const h = document.createElement('h3');
    h.className = 'cw-clue-title';
    h.textContent = title;
    sec.appendChild(h);
    for (const e of entries) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cw-clue-item';
      item.dataset.dir = dir;
      item.dataset.num = e.num;
      const num = document.createElement('span');
      num.className = 'cw-clue-num';
      num.textContent = `${e.num}.`;
      const label = document.createElement('span');
      label.className = 'cw-clue-label';
      label.textContent = this._formatClueLabel(e);
      item.append(num, label);
      sec.appendChild(item);
    }
    return sec;
  }

  _bindEvents() {
    this._boundClick = (e) => this._onClick(e);
    this._boundDragStart = (e) => this._onDragStart(e);
    this._boundDragOver = (e) => this._onDragOver(e);
    this._boundDrop = (e) => this._onDrop(e);
    this._boundKeyDown = (e) => this._onKeyDown(e);

    this.container.addEventListener('click', this._boundClick);
    this.container.addEventListener('dragstart', this._boundDragStart);
    this.container.addEventListener('dragover', this._boundDragOver);
    this.container.addEventListener('drop', this._boundDrop);
    document.addEventListener('keydown', this._boundKeyDown);
  }

  _findCluesAt(r, c) {
    const all = [...this.across, ...this.down];
    return all.filter(w => w.cells.some(cell => cell.r === r && cell.c === c));
  }

  _firstEditableCell(clue) {
    if (!clue) return null;
    for (const cell of clue.cells) {
      const k = `${cell.r},${cell.c}`;
      if (!this.cellCorrect.has(k) && this.userGrid[cell.r][cell.c] === null) {
        return { r: cell.r, c: cell.c };
      }
    }
    for (const cell of clue.cells) {
      if (!this.cellCorrect.has(`${cell.r},${cell.c}`)) {
        return { r: cell.r, c: cell.c };
      }
    }
    return clue.cells[0] ? { r: clue.cells[0].r, c: clue.cells[0].c } : null;
  }

  _advanceInActiveClue() {
    if (!this.activeClue || !this.activeCell) return;
    const cells = this.activeClue.cells;
    const idx = cells.findIndex(c => c.r === this.activeCell.r && c.c === this.activeCell.c);
    if (idx === -1) return;

    // Move to next empty unlocked cell ahead
    for (let i = idx + 1; i < cells.length; i++) {
      const cell = cells[i];
      if (!this.cellCorrect.has(`${cell.r},${cell.c}`) && this.userGrid[cell.r][cell.c] === null) {
        this.activeCell = { r: cell.r, c: cell.c };
        return;
      }
    }
    // Otherwise next unlocked cell ahead
    for (let i = idx + 1; i < cells.length; i++) {
      const cell = cells[i];
      if (!this.cellCorrect.has(`${cell.r},${cell.c}`)) {
        this.activeCell = { r: cell.r, c: cell.c };
        return;
      }
    }
    // If active word is now complete, jump smoothly to next incomplete word
    const clueKey = `${this.activeClue.dir}${this.activeClue.num}`;
    if (this.completedClues.has(clueKey)) {
      const nextClue = [...this.across, ...this.down].find(w => !this.completedClues.has(`${w.dir}${w.num}`));
      if (nextClue) {
        this.activeClue = nextClue;
        this.activeCell = this._firstEditableCell(nextClue);
      }
    }
  }

  _stepBackwardInActiveClue() {
    if (!this.activeClue || !this.activeCell) return;
    const cells = this.activeClue.cells;
    const idx = cells.findIndex(c => c.r === this.activeCell.r && c.c === this.activeCell.c);
    for (let i = idx - 1; i >= 0; i--) {
      const cell = cells[i];
      if (!this.cellCorrect.has(`${cell.r},${cell.c}`)) {
        this.activeCell = { r: cell.r, c: cell.c };
        return;
      }
    }
  }

  _onKeyDown(e) {
    if (this._destroyed || this._isComplete()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      this._unlockAudio();
      this._sfxClick();
      if (!this.activeCell) {
        const nextClue = this.activeClue || this.across[0] || this.down[0];
        this.activeClue = nextClue;
        this.activeCell = this._firstEditableCell(nextClue);
      }
      if (!this.activeCell) return;
      const { r, c } = this.activeCell;
      if (this.cellCorrect.has(`${r},${c}`)) {
        this._advanceInActiveClue();
        this._refreshActiveHighlight();
        return;
      }
      this._fillCell(r, c, e.key.toUpperCase());
      this._advanceInActiveClue();
      this._refreshActiveHighlight();
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this._unlockAudio();
      this._sfxClick();
      if (!this.activeCell) return;
      const { r, c } = this.activeCell;
      if (!this.cellCorrect.has(`${r},${c}`) && this.userGrid[r][c] !== null) {
        this._clearCell(r, c);
      } else {
        this._stepBackwardInActiveClue();
        if (this.activeCell && !this.cellCorrect.has(`${this.activeCell.r},${this.activeCell.c}`)) {
          this._clearCell(this.activeCell.r, this.activeCell.c);
        }
      }
      this._refreshActiveHighlight();
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this._moveActiveCellByArrow(e.key);
      return;
    }

    if (e.key === ' ' && this.activeClue) {
      e.preventDefault();
      this._unlockAudio();
      this._speak(this.activeClue.display);
    }
  }

  _moveActiveCellByArrow(key) {
    if (!this.activeCell) {
      const first = this.across[0] || this.down[0];
      if (!first) return;
      this.activeClue = first;
      this.activeCell = { r: first.row, c: first.col };
      this._refreshActiveHighlight();
      return;
    }
    const dr = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    const dc = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
    let nr = this.activeCell.r + dr;
    let nc = this.activeCell.c + dc;
    while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
      if (this.solution[nr][nc] !== null) {
        this.activeCell = { r: nr, c: nc };
        const clues = this._findCluesAt(nr, nc);
        const preferDir = dc !== 0 ? 'H' : 'V';
        this.activeClue = clues.find(w => w.dir === preferDir) || clues[0] || this.activeClue;
        this._sfxClick();
        this._refreshActiveHighlight();
        return;
      }
      nr += dr;
      nc += dc;
    }
  }

  _onClick(e) {
    this._unlockAudio();

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === 'toggle-peek') {
        this._sfxClick();
        this.showWords = !this.showWords;
        actionEl.textContent = this.showWords ? '🙈 Hide Words' : '👁️ Show Words';
        actionEl.classList.toggle('showing', this.showWords);
        this._refreshClues();
        this._refreshActiveHighlight();
        return;
      }
      if (action === 'hear-active') {
        this._sfxClick();
        if (this.activeClue) this._speak(this.activeClue.display);
        return;
      }
      if (action === 'backspace') {
        this._sfxClick();
        if (this.activeCell) {
          const { r, c } = this.activeCell;
          if (!this.cellCorrect.has(`${r},${c}`) && this.userGrid[r][c] !== null) {
            this._clearCell(r, c);
          } else {
            this._stepBackwardInActiveClue();
            if (this.activeCell && !this.cellCorrect.has(`${this.activeCell.r},${this.activeCell.c}`)) {
              this._clearCell(this.activeCell.r, this.activeCell.c);
            }
          }
          this._refreshActiveHighlight();
        }
        return;
      }
    }

    const cellEl = e.target.closest('.cw-cell.white');
    if (cellEl) {
      const r = Number(cellEl.dataset.r);
      const c = Number(cellEl.dataset.c);
      this._onCellTap(r, c);
      return;
    }

    const letterEl = e.target.closest('.cw-letter[data-letter]');
    if (letterEl) {
      this._onLetterTap(letterEl.dataset.letter);
      return;
    }

    const clueEl = e.target.closest('.cw-clue-item');
    if (clueEl) {
      this._sfxClick();
      if (clueEl.dataset.bonus) {
        this._speak(clueEl.dataset.bonus);
      } else {
        const dir = clueEl.dataset.dir;
        const num = Number(clueEl.dataset.num);
        const list = dir === 'H' ? this.across : this.down;
        const entry = list.find(w => w.num === num);
        if (entry) {
          this.activeClue = entry;
          this.activeCell = this._firstEditableCell(entry);
          this._refreshActiveHighlight();
          this._speak(entry.display);
        }
      }
    }
  }

  _onDragStart(e) {
    const letterEl = e.target.closest('.cw-letter[data-letter]');
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
    this._sfxClick();
    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);
    this.activeCell = { r, c };
    const clues = this._findCluesAt(r, c);
    if (clues.length && (!this.activeClue || !clues.includes(this.activeClue))) {
      this.activeClue = clues[0];
    }
    this._fillCell(r, c, letter);
    this._advanceInActiveClue();
    this._refreshActiveHighlight();
  }

  _onCellTap(r, c) {
    if (this.solution[r][c] === null) return;
    const key = `${r},${c}`;
    const clues = this._findCluesAt(r, c);
    const sameCell = this.activeCell && this.activeCell.r === r && this.activeCell.c === c;

    if (sameCell && clues.length > 1 && !this.selectedLetter) {
      // Toggle between Across and Down at intersections
      const other = clues.find(w => w !== this.activeClue);
      if (other) this.activeClue = other;
    } else if (clues.length && (!this.activeClue || !clues.includes(this.activeClue))) {
      this.activeClue = clues[0];
    }
    this.activeCell = { r, c };

    if (this.cellCorrect.has(key)) {
      this._sfxClick();
      this._refreshActiveHighlight();
      return;
    }

    const current = this.userGrid[r][c];
    if (this.selectedLetter) {
      this._sfxClick();
      if (current === this.selectedLetter) {
        this._clearCell(r, c);
      } else {
        this._fillCell(r, c, this.selectedLetter);
        this._advanceInActiveClue();
      }
      this.selectedLetter = null;
      this._refreshLetterBank();
    } else if (current !== null && sameCell) {
      this._sfxClick();
      this._clearCell(r, c);
    } else {
      this._sfxClick();
    }
    this._refreshActiveHighlight();
  }

  _onLetterTap(letter) {
    this._sfxClick();
    // If an editable active cell is focused, type right into it and advance!
    if (this.activeCell && !this.cellCorrect.has(`${this.activeCell.r},${this.activeCell.c}`)) {
      const { r, c } = this.activeCell;
      this._fillCell(r, c, letter);
      this._advanceInActiveClue();
      this._refreshActiveHighlight();
      return;
    }
    // Fallback point-select toggle
    this.selectedLetter = (this.selectedLetter === letter) ? null : letter;
    this._refreshLetterBank();
  }

  _fillCell(r, c, letter) {
    if (this.solution[r][c] === null) return;
    if (this.cellCorrect.has(`${r},${c}`)) return;
    this.userGrid[r][c] = letter;
    this._revalidate();
  }

  _clearCell(r, c) {
    if (this.cellCorrect.has(`${r},${c}`)) return;
    this.userGrid[r][c] = null;
    this._revalidate();
  }

  _revalidate() {
    const prevWrong = new Set(this.cellWrong);
    this.cellWrong = new Set();
    const newlyCompleted = [];

    for (const w of [...this.across, ...this.down]) {
      const clueKey = `${w.dir}${w.num}`;
      if (this.completedClues.has(clueKey)) continue;

      let full = true;
      for (const cell of w.cells) {
        if (this.userGrid[cell.r][cell.c] === null) { full = false; break; }
      }
      if (!full) continue;

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
        for (const cell of w.cells) {
          const k = `${cell.r},${cell.c}`;
          if (this.cellCorrect.has(k)) continue;
          const user = this.userGrid[cell.r][cell.c].toLowerCase();
          const sol = this.solution[cell.r][cell.c];
          if (user !== sol) this.cellWrong.add(k);
        }
      }
    }

    this._refreshCells(prevWrong);
    this._refreshClues();

    for (const w of newlyCompleted) {
      this._speak(w.display);
      this._sfxCorrect();
      try { this.onCorrect(w); } catch (e) { console.error('[Crossword] onCorrect:', e); }
    }

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

    // Complete! Fanfare fires ONCE in screens.renderDone() via onComplete()
    if (this._isComplete()) {
      this._launchConfetti();
      try { this.onComplete(); } catch (e) { console.error('[Crossword] onComplete:', e); }
    }
  }

  _isComplete() {
    return this.totalWords > 0 && this.completedClues.size >= this.totalWords;
  }

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
        if (isWrong && prevWrong && !prevWrong.has(key)) {
          el.classList.remove('wrong');
          void el.offsetWidth;
          el.classList.add('wrong');
        } else {
          el.classList.toggle('wrong', isWrong);
        }
      }
    }
  }

  _refreshClues() {
    const items = this.container.querySelectorAll('.cw-clue-item:not(.cw-bonus-item)');
    for (const item of items) {
      const dir = item.dataset.dir;
      const num = Number(item.dataset.num);
      const clueKey = `${dir}${num}`;
      const list = dir === 'H' ? this.across : this.down;
      const entry = list.find(w => w.num === num);
      item.classList.toggle('done', this.completedClues.has(clueKey));
      if (entry) {
        const label = item.querySelector('.cw-clue-label');
        if (label) label.textContent = this._formatClueLabel(entry);
      }
    }
  }

  _refreshActiveHighlight() {
    const activeWordSet = new Set(
      this.activeClue ? this.activeClue.cells.map(c => `${c.r},${c.c}`) : []
    );
    const activeCellKey = this.activeCell ? `${this.activeCell.r},${this.activeCell.c}` : null;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const el = this.cellEls[r] && this.cellEls[r][c];
        if (!el) continue;
        const k = `${r},${c}`;
        el.classList.toggle('in-active-word', activeWordSet.has(k));
        el.classList.toggle('active-cell', k === activeCellKey);
      }
    }

    const activeKey = this.activeClue ? `${this.activeClue.dir}${this.activeClue.num}` : null;
    this.container.querySelectorAll('.cw-clue-item:not(.cw-bonus-item)').forEach(item => {
      item.classList.toggle('active', `${item.dataset.dir}${item.dataset.num}` === activeKey);
    });

    const activeLabel = this.container.querySelector('#cwActiveLabel');
    if (activeLabel) {
      if (this.activeClue) {
        const dirText = this.activeClue.dir === 'H' ? 'Across' : 'Down';
        activeLabel.textContent = this.showWords
          ? `${this.activeClue.num} ${dirText}: ${this.activeClue.display} (${this.activeClue.len} letters)`
          : `${this.activeClue.num} ${dirText} · Word ${this.activeClue.num} (${this.activeClue.len} letters)`;
      } else {
        activeLabel.textContent = 'Tap any clue or square to start spelling!';
      }
    }
  }

  _refreshLetterBank() {
    const letters = this.container.querySelectorAll('.cw-letter[data-letter]');
    for (const el of letters) {
      el.classList.toggle('selected', el.dataset.letter === this.selectedLetter);
    }
  }

  _unlockAudio() {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    try { if (speech && speech.unlock) speech.unlock(); } catch (e) {}
    try { if (sfx && sfx.unlock) sfx.unlock(); } catch (e) {}
  }

  _speak(text) {
    try { if (speech && speech.speak) speech.speak(text); }
    catch (e) { console.error('[Crossword] speak failed:', e); }
  }

  _sfxClick() {
    try { if (sfx && sfx.click) sfx.click(); } catch (e) {}
  }

  _sfxCorrect() {
    try { if (sfx && sfx.correct) sfx.correct(); }
    catch (e) { console.error('[Crossword] sfx.correct:', e); }
  }

  _sfxWrong() {
    try { if (sfx && sfx.wrong) sfx.wrong(); }
    catch (e) { console.error('[Crossword] sfx.wrong:', e); }
  }

  _launchConfetti() {
    try {
      const existing = document.getElementById('confetti-canvas');
      if (existing) existing.remove();

      const canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998';
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
        if (frame < 180) requestAnimationFrame(animate);
        else canvas.remove();
      };
      animate();
    } catch (err) {
      console.error('[Crossword] confetti failed:', err);
    }
  }

  destroy() {
    this._destroyed = true;
    if (this._boundClick) this.container.removeEventListener('click', this._boundClick);
    if (this._boundDragStart) this.container.removeEventListener('dragstart', this._boundDragStart);
    if (this._boundDragOver) this.container.removeEventListener('dragover', this._boundDragOver);
    if (this._boundDrop) this.container.removeEventListener('drop', this._boundDrop);
    if (this._boundKeyDown) document.removeEventListener('keydown', this._boundKeyDown);
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) canvas.remove();
    this.container.innerHTML = '';
  }
}
