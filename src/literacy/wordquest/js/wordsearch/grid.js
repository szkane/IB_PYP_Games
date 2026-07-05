/**
 * WordSearch Grid Generator
 * Generates a letter grid with hidden words for the Word Search game.
 * Words are placed in grade-appropriate directions (progressive difficulty).
 */

import { WordUtil } from '../data.js';

/** Direction vectors: [row delta, col delta] */
const DIRECTIONS = {
  right: [0, 1],
  left: [0, -1],
  down: [1, 0],
  up: [-1, 0],
  downRight: [1, 1],
  upLeft: [-1, -1],
  downLeft: [1, -1],
  upRight: [-1, 1]
};

/**
 * Grade-level direction sets — progressive difficulty.
 * KG: 2 dirs, G1: 4 dirs, G2: 6 dirs, G3: 8 dirs (all).
 */
const GRADE_DIRECTIONS = {
  kg: ['right', 'down'],
  g1: ['right', 'down', 'left', 'up'],
  g2: ['right', 'down', 'left', 'up', 'downRight', 'upLeft'],
  g3: ['right', 'down', 'left', 'up', 'downRight', 'upLeft', 'downLeft', 'upRight']
};

/** Letter frequency order (most → least common in English). */
const FREQ_LETTERS = 'etaoinshrdlucmpfywgbvkjxqz';

/**
 * Generate a word search grid from raw words.
 *
 * @param {string[]} rawWords - Words to hide (may contain apostrophes, spaces, parentheticals).
 * @param {string} gradeId - Grade identifier: 'kg' | 'g1' | 'g2' | 'g3'.
 * @returns {{ grid: string[][], placements: Array<{ chars: string, display: string, cells: Array<{r:number,c:number}>, dir: string }>, size: number }}
 *    Returns `{ grid: [], placements: [], size: 0 }` if no valid words.
 */
export function generateGrid(rawWords, gradeId) {
  // 1. Clean & filter words: convert to grid chars, deduplicate
  const seen = new Set();
  const words = rawWords
    .map(w => ({
      display: String(w),
      chars: WordUtil.gridChars(w)
    }))
    .filter(x => {
      if (!/^[a-z]+$/.test(x.chars)) return false;
      if (x.chars.length < 2 || x.chars.length > 12) return false;
      if (seen.has(x.chars)) return false; // dedupe by cleaned form
      seen.add(x.chars);
      return true;
    });

  if (words.length === 0) {
    return { grid: [], placements: [], size: 0 };
  }

  // 2. Calculate grid size based on word lengths
  const maxLen = Math.max(...words.map(w => w.chars.length));
  const totalLetters = words.reduce((sum, w) => sum + w.chars.length, 0);
  // Grade-specific size range: KG smaller, G3 larger
  const gradeRange = { kg: [8, 10], g1: [8, 12], g2: [10, 14], g3: [12, 16] };
  const [minSize, maxSize] = gradeRange[gradeId] || [8, 16];
  let size = Math.max(maxLen, Math.round(Math.sqrt(totalLetters * 1.6)));
  size = Math.max(minSize, Math.min(maxSize, size));

  // 3. Try to place all words (up to 5 full reshuffles)
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = tryPlace(words, size, gradeId);
    if (result.placements.length === words.length) {
      return fillGrid(result, size);
    }
    // On the last attempt, accept partial result (rare)
    if (attempt === 4) {
      return fillGrid(result, size);
    }
  }

  // Defensive fallback (should never reach here)
  return fillGrid(tryPlace(words, size, gradeId), size);
}

/**
 * Attempt to place all words into a blank grid.
 * @param {Array<{display:string,chars:string}>} words - Pre-cleaned words
 * @param {number} size - Grid dimension
 * @param {string} gradeId - Grade for direction selection
 * @returns {{ grid: (string|null)[][], placements: Array }}
 */
function tryPlace(words, size, gradeId) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = [];
  const dirs = GRADE_DIRECTIONS[gradeId] || GRADE_DIRECTIONS.g3;

  // Shuffle then sort by length descending — long words first, random order within same length
  const sorted = [...words]
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => b.chars.length - a.chars.length);

  for (const word of sorted) {
    let placed = false;
    const len = word.chars.length;

    for (let attempt = 0; attempt < 100; attempt++) {
      const dirName = dirs[Math.floor(Math.random() * dirs.length)];
      const [dr, dc] = DIRECTIONS[dirName];

      // Compute valid start range so the word stays within bounds
      const minR = dr < 0 ? Math.abs(dr) * (len - 1) : 0;
      const maxR = dr > 0 ? size - 1 - dr * (len - 1) : size - 1;
      const minC = dc < 0 ? Math.abs(dc) * (len - 1) : 0;
      const maxC = dc > 0 ? size - 1 - dc * (len - 1) : size - 1;

      if (minR > maxR || minC > maxC) continue;

      const r = minR + Math.floor(Math.random() * (maxR - minR + 1));
      const c = minC + Math.floor(Math.random() * (maxC - minC + 1));

      if (canPlace(grid, word.chars, r, c, dr, dc, size)) {
        const cells = [];
        for (let i = 0; i < len; i++) {
          const cr = r + dr * i;
          const cc = c + dc * i;
          grid[cr][cc] = word.chars[i];
          cells.push({ r: cr, c: cc });
        }
        placements.push({ chars: word.chars, display: word.display, cells, dir: dirName });
        placed = true;
        break;
      }
    }
    // If not placed after 100 attempts, skip (very rare with reasonable word counts)
    if (!placed) {
      console.warn('[WordSearch] Could not place word:', word.chars);
    }
  }

  return { grid, placements };
}

/**
 * Check if a word can be placed at (r, c) in direction (dr, dc).
 * Allows same-letter overlap (shared cells between crossing words).
 *
 * @param {(string|null)[][]} grid - Current grid state
 * @param {string} chars - Word characters
 * @param {number} r - Start row
 * @param {number} c - Start col
 * @param {number} dr - Row delta
 * @param {number} dc - Col delta
 * @param {number} size - Grid dimension
 * @returns {boolean}
 */
function canPlace(grid, chars, r, c, dr, dc, size) {
  for (let i = 0; i < chars.length; i++) {
    const cr = r + dr * i;
    const cc = c + dc * i;
    if (cr < 0 || cr >= size || cc < 0 || cc >= size) return false;
    const existing = grid[cr][cc];
    if (existing !== null && existing !== chars[i]) return false;
  }
  return true;
}

/**
 * Fill empty grid cells with random letters.
 * 70% from the pool of letters used in placed words (makes grid feel cohesive),
 * 30% from full alphabet weighted by English letter frequency.
 *
 * @param {{ grid: (string|null)[][], placements: Array }} result - Placement result
 * @param {number} size - Grid dimension
 * @returns {{ grid: string[][], placements: Array, size: number }}
 */
function fillGrid(result, size) {
  // Collect letters used in placed words
  const usedLetters = new Set();
  for (const p of result.placements) {
    for (const ch of p.chars) usedLetters.add(ch);
  }
  const letterPool = usedLetters.size > 0 ? [...usedLetters] : FREQ_LETTERS.split('');

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (result.grid[r][c] === null) {
        if (Math.random() < 0.7 && letterPool.length > 0) {
          result.grid[r][c] = letterPool[Math.floor(Math.random() * letterPool.length)];
        } else {
          result.grid[r][c] = FREQ_LETTERS[Math.floor(Math.random() * FREQ_LETTERS.length)];
        }
      }
    }
  }

  return { grid: result.grid, placements: result.placements, size };
}
