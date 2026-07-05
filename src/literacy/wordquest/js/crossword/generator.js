/**
 * Crossword Generator — Core placement algorithm.
 *
 * Builds a sparse crossword grid from a word list using a multi-seed greedy
 * strategy with strict adjacency constraints and a template fallback.
 *
 * Reliability layers:
 *   1. Multi-seed retry (40 shuffled attempts, best-score wins)
 *   2. Candidate scoring (intersection density + compactness)
 *   3. Strict canPlace constraints (no accidental word merging)
 *   4. Template fallback (alternating H/V through any matching letter)
 *
 * @module crossword/generator
 */

import { WordUtil } from '../data.js';

const N_SEEDS = 40;
const MAX_WORDS = 8;
const MAX_CANDIDATES = 12;

/**
 * Generate a crossword from raw words.
 *
 * @param {string[]} rawWords - Original words (may contain apostrophes/spaces).
 * @returns {{grid: Map<string,string>, placed: Array<Object>, unplaced: Array<Object>, bboxArea: number, score?: number}}
 *   - grid: sparse map of "r,c" → char
 *   - placed: [{word, display, row, col, dir, len, cells}]
 *   - unplaced: [{word, display}] (selected-but-unplaceable + surplus bonus words)
 */
export function generateCrossword(rawWords) {
  // 1. Clean + validate input: only pure a-z, length 3-8, deduped by grid chars
  const seen = new Set();
  const words = [];
  for (const w of rawWords) {
    const chars = WordUtil.gridChars(w);
    if (!/^[a-z]{3,8}$/.test(chars)) continue; // crossword is strict
    if (seen.has(chars)) continue;             // dedupe
    seen.add(chars);
    words.push({ display: w, word: chars });
  }

  if (words.length < 4) {
    return {
      grid: new Map(),
      placed: [],
      unplaced: words.map(w => ({ word: w.word, display: w.display })),
      bboxArea: 0
    };
  }

  const selected = words.slice(0, Math.min(MAX_WORDS, words.length));
  const extra = words.slice(MAX_WORDS); // surplus → bonus display words

  // 2. Multi-seed retry
  let best = null;
  for (let seed = 0; seed < N_SEEDS; seed++) {
    const shuffled = shuffle([...selected]);
    // Long words first, same length randomly ordered
    shuffled.sort((a, b) => b.word.length - a.word.length || (Math.random() - 0.5));

    const result = tryBuild(shuffled);
    const score = result.placed.length * 100 - result.bboxArea;

    if (!best || score > best.score) {
      best = { ...result, score };
    }
    // Early stop: all placed and at least 5
    if (best.placed.length === selected.length && best.placed.length >= 5) break;
  }

  // 3. Template fallback if placement is poor
  if (best.placed.length < Math.min(5, selected.length)) {
    const tmpl = templateFallback(selected);
    if (tmpl.placed.length > best.placed.length) {
      best = tmpl;
    }
  }

  // 4. Merge surplus bonus words into unplaced for display
  best.unplaced = [
    ...(best.unplaced || []),
    ...extra.map(w => ({ word: w.word, display: w.display }))
  ];

  return best;
}

/**
 * Attempt to build a crossword from an ordered word list.
 * @param {Array<{word:string, display:string}>} words
 * @returns {{grid: Map, placed: Array, unplaced: Array, bboxArea: number}}
 */
function tryBuild(words) {
  const grid = new Map(); // "r,c" → char
  const placed = [];

  // Place the first word horizontally at the origin
  const first = words[0];
  placeWord(grid, first.word, 0, 0, 'H');
  placed.push({
    word: first.word,
    display: first.display,
    row: 0,
    col: 0,
    dir: 'H',
    len: first.word.length,
    cells: getCells(0, 0, 'H', first.word.length)
  });

  // First pass
  let unplaced = [];
  for (let i = 1; i < words.length; i++) {
    if (!tryPlaceWord(grid, words[i], placed)) {
      unplaced.push(words[i]);
    }
  }

  // Second pass: retry unplaced words against the now-larger grid.
  // Later placements create new intersection opportunities.
  const stillUnplaced = [];
  for (const w of unplaced) {
    if (!tryPlaceWord(grid, w, placed)) {
      stillUnplaced.push(w);
    }
  }

  const { minR, maxR, minC, maxC } = getBounds(grid);
  const bboxArea = grid.size === 0 ? 0 : (maxR - minR + 1) * (maxC - minC + 1);

  return {
    grid,
    placed,
    unplaced: stillUnplaced.map(w => ({ word: w.word, display: w.display })),
    bboxArea
  };
}

/**
 * Find valid candidates for a word, pick the best-scoring one, and place it.
 * @returns {boolean} true if placed
 */
function tryPlaceWord(grid, w, placed) {
  const candidates = findCandidates(grid, w, placed);
  candidates.sort((a, b) => b.score - a.score);

  const limit = Math.min(MAX_CANDIDATES, candidates.length);
  for (let j = 0; j < limit; j++) {
    const c = candidates[j];
    // canPlace was already checked in findCandidates, but re-check for safety
    if (canPlace(grid, w.word, c.row, c.col, c.dir)) {
      placeWord(grid, w.word, c.row, c.col, c.dir);
      placed.push({
        word: w.word,
        display: w.display,
        row: c.row,
        col: c.col,
        dir: c.dir,
        len: w.word.length,
        cells: getCells(c.row, c.col, c.dir, w.word.length)
      });
      return true;
    }
  }
  return false;
}

/**
 * For each letter in `word`, find existing grid cells with the same letter and
 * generate horizontal/vertical crossing candidates. Only valid candidates
 * (passing canPlace) are kept; duplicates are filtered.
 *
 * @param {Map<string,string>} grid
 * @param {{word:string}} word
 * @param {Array<Object>} placed
 * @returns {Array<{row:number, col:number, dir:string, score:number}>}
 */
function findCandidates(grid, word, placed) {
  const candidates = [];
  const seen = new Set();
  const chars = word.word;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    for (const p of placed) {
      for (const cell of p.cells) {
        if (grid.get(`${cell.r},${cell.c}`) !== ch) continue;

        // Horizontal: chars[i] lands at (cell.r, cell.c); start = (cell.r, cell.c - i)
        const hRow = cell.r;
        const hCol = cell.c - i;
        const hKey = `${hRow},${hCol},H`;
        if (!seen.has(hKey) && canPlace(grid, chars, hRow, hCol, 'H')) {
          seen.add(hKey);
          candidates.push({ row: hRow, col: hCol, dir: 'H', score: scoreCandidate(grid, chars, hRow, hCol, 'H') });
        }

        // Vertical: chars[i] lands at (cell.r, cell.c); start = (cell.r - i, cell.c)
        const vRow = cell.r - i;
        const vCol = cell.c;
        const vKey = `${vRow},${vCol},V`;
        if (!seen.has(vKey) && canPlace(grid, chars, vRow, vCol, 'V')) {
          seen.add(vKey);
          candidates.push({ row: vRow, col: vCol, dir: 'V', score: scoreCandidate(grid, chars, vRow, vCol, 'V') });
        }
      }
    }
  }
  return candidates;
}

/**
 * Score a candidate placement: prefer more intersections (denser) and
 * positions closer to the origin (more compact).
 */
function scoreCandidate(grid, chars, row, col, dir) {
  const [dr, dc] = dir === 'H' ? [0, 1] : [1, 0];
  let intersections = 0;
  for (let i = 0; i < chars.length; i++) {
    if (grid.has(`${row + dr * i},${col + dc * i}`)) intersections++;
  }
  const dist = Math.abs(row) + Math.abs(col);
  return intersections * 10 - dist;
}

/**
 * Check whether a word can be placed at (row, col) in direction `dir`.
 *
 * Constraints:
 *   A. The cell immediately before the start and after the end must be empty
 *      (prevents two words from joining end-to-end).
 *   B. For every NEW (non-intersection) cell, its perpendicular neighbours must
 *      be empty (prevents parallel words from accidentally fusing into non-words).
 *   C. At every EXISTING cell (intersection), the letter must match.
 *   D. The placement must add at least one new cell (rejects fully-overlapping
 *      duplicates).
 *
 * @param {Map<string,string>} grid
 * @param {string} chars
 * @param {number} row
 * @param {number} col
 * @param {'H'|'V'} dir
 * @returns {boolean}
 */
function canPlace(grid, chars, row, col, dir) {
  const [dr, dc] = dir === 'H' ? [0, 1] : [1, 0];
  const len = chars.length;

  // Constraint A: head/tail outer neighbours must be empty
  if (grid.has(`${row - dr},${col - dc}`)) return false;
  if (grid.has(`${row + dr * len},${col + dc * len}`)) return false;

  // Perpendicular direction (rotate 90°): for H → vertical, for V → horizontal
  const perpDr = dc;
  const perpDc = -dr;

  let hasNewCell = false;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid.get(`${r},${c}`);

    if (existing === undefined) {
      // New cell
      hasNewCell = true;
      // Constraint B: perpendicular neighbours must be empty
      if (grid.has(`${r + perpDr},${c + perpDc}`)) return false;
      if (grid.has(`${r - perpDr},${c - perpDc}`)) return false;
    } else if (existing !== chars[i]) {
      // Constraint C: intersection letter mismatch
      return false;
    }
    // else: valid intersection, continue
  }

  // Constraint D: reject fully-overlapping placement
  return hasNewCell;
}

/** Write a word's letters into the grid. */
function placeWord(grid, chars, row, col, dir) {
  const [dr, dc] = dir === 'H' ? [0, 1] : [1, 0];
  for (let i = 0; i < chars.length; i++) {
    grid.set(`${row + dr * i},${col + dc * i}`, chars[i]);
  }
}

/** Compute the list of cell coords occupied by a word. */
function getCells(row, col, dir, len) {
  const [dr, dc] = dir === 'H' ? [0, 1] : [1, 0];
  const cells = [];
  for (let i = 0; i < len; i++) {
    cells.push({ r: row + dr * i, c: col + dc * i });
  }
  return cells;
}

/** Compute the bounding box of all filled cells. */
function getBounds(grid) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const key of grid.keys()) {
    const comma = key.indexOf(',');
    const r = Number(key.slice(0, comma));
    const c = Number(key.slice(comma + 1));
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  return { minR, maxR, minC, maxC };
}

/** Fisher–Yates shuffle (in place). */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Template fallback: place the longest word horizontally, then cross each
 * remaining word through ANY matching letter of ANY already-placed word.
 * Tries both directions for robustness. Stops at 6 placed words.
 */
function templateFallback(words) {
  const grid = new Map();
  const placed = [];
  const unplaced = [];

  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);

  // Place the longest word horizontally at the origin
  const first = sorted[0];
  placeWord(grid, first.word, 0, 0, 'H');
  placed.push({
    word: first.word,
    display: first.display,
    row: 0,
    col: 0,
    dir: 'H',
    len: first.word.length,
    cells: getCells(0, 0, 'H', first.word.length)
  });

  for (let i = 1; i < sorted.length && placed.length < 6; i++) {
    const w = sorted[i];
    let placedOk = false;

    for (let li = 0; li < w.word.length && !placedOk; li++) {
      const ch = w.word[li];
      for (const p of placed) {
        if (placedOk) break;
        for (const cell of p.cells) {
          if (grid.get(`${cell.r},${cell.c}`) !== ch) continue;
          // Try both directions; the perpendicular one is the useful crossing,
          // but we attempt both for safety (canPlace filters invalid ones).
          for (const dir of ['H', 'V']) {
            const [dr, dc] = dir === 'H' ? [0, 1] : [1, 0];
            const newRow = cell.r - li * dr;
            const newCol = cell.c - li * dc;
            if (canPlace(grid, w.word, newRow, newCol, dir)) {
              placeWord(grid, w.word, newRow, newCol, dir);
              placed.push({
                word: w.word,
                display: w.display,
                row: newRow,
                col: newCol,
                dir,
                len: w.word.length,
                cells: getCells(newRow, newCol, dir, w.word.length)
              });
              placedOk = true;
              break;
            }
          }
          if (placedOk) break;
        }
      }
    }
    if (!placedOk) unplaced.push(w);
  }

  const { minR, maxR, minC, maxC } = getBounds(grid);
  const bboxArea = grid.size === 0 ? 0 : (maxR - minR + 1) * (maxC - minC + 1);

  return {
    grid,
    placed,
    unplaced: unplaced.map(w => ({ word: w.word, display: w.display })),
    bboxArea
  };
}
