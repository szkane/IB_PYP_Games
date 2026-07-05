/**
 * Crossword Layout — Compact dense grid + clue numbering.
 *
 * Converts the sparse generator output (a Map of "r,c" → char) into a
 * normalized 2D array shifted to (0,0), then assigns sequential numbers to
 * every cell that starts an across or down word.
 *
 * Numbering rule (standard crossword convention):
 *   Scan top-to-bottom, left-to-right. A cell receives the next number when it
 *   is the start of an across word (left edge / left neighbour null AND a
 *   right neighbour exists) OR the start of a down word (top edge / top
 *   neighbour null AND a bottom neighbour exists).
 *
 * @module crossword/layout
 */

/**
 * @typedef {Object} ClueEntry
 * @property {number} num       - Clue number shown on the grid.
 * @property {string} word      - Grid chars (lowercase a-z), used for validation.
 * @property {string} display   - Original word string, used for display/speech.
 * @property {number} row       - Start row (0-indexed in dense grid).
 * @property {number} col       - Start col (0-indexed in dense grid).
 * @property {number} len       - Word length.
 * @property {string} dir       - 'H' (across) or 'V' (down).
 * @property {Array<{r:number,c:number}>} cells - All cell coords.
 */

/**
 * Layout a sparse crossword into a dense, numbered grid.
 *
 * @param {Object} sparseResult - Output of generateCrossword().
 * @param {Map<string,string>} sparseResult.grid
 * @param {Array<Object>} sparseResult.placed
 * @param {Array<Object>} [sparseResult.unplaced]
 * @returns {{
 *   grid: (string|null)[][],
 *   across: ClueEntry[],
 *   down: ClueEntry[],
 *   rows: number,
 *   cols: number,
 *   numbers: Map<string,number>,
 *   unplaced: Array<{word:string, display:string}>
 * }}
 */
export function layoutCrossword(sparseResult) {
  const { grid: sparseGrid, placed } = sparseResult;

  // 1. Find bounding box
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const key of sparseGrid.keys()) {
    const comma = key.indexOf(',');
    const r = Number(key.slice(0, comma));
    const c = Number(key.slice(comma + 1));
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  // Empty grid → return an empty layout
  if (minR === Infinity) {
    return {
      grid: [],
      across: [],
      down: [],
      rows: 0,
      cols: 0,
      numbers: new Map(),
      unplaced: sparseResult.unplaced || []
    };
  }

  // 2. Shift to (0,0) and build a dense 2D array (null = black cell)
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (const [key, char] of sparseGrid.entries()) {
    const comma = key.indexOf(',');
    const r = Number(key.slice(0, comma));
    const c = Number(key.slice(comma + 1));
    grid[r - minR][c - minC] = char;
  }

  // 3. Shift placed-word coordinates to match the dense grid
  const shiftedPlaced = placed.map(p => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
    cells: p.cells.map(cell => ({ r: cell.r - minR, c: cell.c - minC }))
  }));

  // 4. Numbering pass
  const numbers = new Map(); // "r,c" → number
  let num = 0;
  const across = [];
  const down = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === null) continue;

      // Across start: left edge/null on the left AND a letter to the right
      const isAcrossStart =
        (c === 0 || grid[r][c - 1] === null) &&
        (c < cols - 1 && grid[r][c + 1] !== null);

      // Down start: top edge/null above AND a letter below
      const isDownStart =
        (r === 0 || grid[r - 1][c] === null) &&
        (r < rows - 1 && grid[r + 1][c] !== null);

      if (isAcrossStart || isDownStart) {
        num++;
        numbers.set(`${r},${c}`, num);

        if (isAcrossStart) {
          const p = shiftedPlaced.find(p => p.dir === 'H' && p.row === r && p.col === c);
          if (p) {
            across.push({
              num,
              word: p.word,
              display: p.display,
              row: r,
              col: c,
              len: p.len,
              dir: 'H',
              cells: p.cells
            });
          }
        }

        if (isDownStart) {
          const p = shiftedPlaced.find(p => p.dir === 'V' && p.row === r && p.col === c);
          if (p) {
            down.push({
              num,
              word: p.word,
              display: p.display,
              row: r,
              col: c,
              len: p.len,
              dir: 'V',
              cells: p.cells
            });
          }
        }
      }
    }
  }

  return {
    grid,
    across,
    down,
    rows,
    cols,
    numbers,
    unplaced: sparseResult.unplaced || []
  };
}
