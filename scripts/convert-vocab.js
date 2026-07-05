#!/usr/bin/env node
/**
 * convert-vocab.js
 *
 * Reads src/data/vocabulary.md and generates src/literacy/wordquest/js/data.js
 * as an ES module with VOCAB, GRADES, and WordUtil exports.
 *
 * Run: node scripts/convert-vocab.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'src', 'data', 'vocabulary.md');
const OUTPUT_DIR = path.join(ROOT, 'src', 'literacy', 'wordquest', 'js');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'data.js');

const GRADE_ORDER = ['kg', 'g1', 'g2', 'g3'];

/**
 * Map a grade header name to a grade ID.
 * "Kindergarten" → "kg", "Grade 1" → "g1", etc.
 * @param {string} name
 * @returns {string|null}
 */
function mapGrade(name) {
  if (name === 'Kindergarten') return 'kg';
  const m = name.match(/^Grade\s+(\d+)$/);
  return m ? 'g' + m[1] : null;
}

/**
 * Slugify a category name: lowercase, non-alphanumeric → hyphen,
 * merge consecutive hyphens, trim leading/trailing hyphens.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensure unique ID within a grade. If baseId already exists, append -2, -3, ...
 * @param {string} baseId
 * @param {Set<string>} used
 * @returns {string}
 */
function uniqueId(baseId, used) {
  if (!used.has(baseId)) {
    used.add(baseId);
    return baseId;
  }
  let n = 2;
  while (used.has(`${baseId}-${n}`)) n++;
  const id = `${baseId}-${n}`;
  used.add(id);
  return id;
}

/**
 * Parse vocabulary.md into a structured object keyed by grade ID.
 *
 * Markdown format:
 *   # Grade 3            ← grade header
 *   ## Category Name     ← category header
 *   > N words · Grade X  ← meta info (skipped)
 *   word1, word2, ...    ← comma-separated word list
 *
 * @param {string} markdown
 * @returns {Record<string, Array<{name: string, words: string[]}>>}
 */
function parseVocab(markdown) {
  const lines = markdown.split('\n');
  const result = {};
  let currentGrade = null;
  let currentCategory = null;
  let waitingForWords = false;

  for (const raw of lines) {
    const line = raw.trim();

    // Skip empty lines
    if (line === '') continue;

    // Grade header: "# Grade 3" or "# Kindergarten" (exact match only)
    const gradeMatch = line.match(/^#\s+(Grade\s+\d+|Kindergarten)\s*$/);
    if (gradeMatch) {
      currentGrade = mapGrade(gradeMatch[1]);
      if (currentGrade && !result[currentGrade]) result[currentGrade] = [];
      waitingForWords = false;
      continue;
    }

    // Category header: "## Category Name" (check before generic # skip)
    if (line.startsWith('## ')) {
      currentCategory = line.slice(3).trim();
      waitingForWords = true;
      continue;
    }

    // Skip other heading lines (e.g. "#KG - Grade 1 - Grade 3 Vocabulary")
    if (line.startsWith('#')) continue;

    // Skip horizontal rules
    if (line === '---') continue;

    // Skip meta info lines ("> N words · Grade X")
    if (line.startsWith('>')) continue;

    // Words line — first non-empty, non-meta line after a category header
    if (waitingForWords && currentGrade && currentCategory) {
      const words = line.split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);

      result[currentGrade].push({
        name: currentCategory,
        words: words
      });

      waitingForWords = false;
      currentCategory = null;
    }
  }

  return result;
}

/**
 * Escape a string for use inside single-quoted JS string literals.
 * @param {string} str
 * @returns {string}
 */
function sq(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Serialize the parsed vocab object into ES module source code.
 * @param {Record<string, Array<{name: string, words: string[]}>>} vocab
 * @returns {string}
 */
function serialize(vocab) {
  // Build VOCAB grade blocks
  const gradeBlocks = [];
  for (let gi = 0; gi < GRADE_ORDER.length; gi++) {
    const gradeId = GRADE_ORDER[gi];
    const categories = vocab[gradeId] || [];
    const usedIds = new Set();

    const catLines = categories.map((cat, i) => {
      const id = uniqueId(slugify(cat.name), usedIds);
      const wordsStr = cat.words.map(w => `'${sq(w)}'`).join(',');
      const comma = i < categories.length - 1 ? ',' : '';
      return `    { id: '${sq(id)}', name: '${sq(cat.name)}', words: [${wordsStr}] }${comma}`;
    });

    const gradeComma = gi < GRADE_ORDER.length - 1 ? ',' : '';
    gradeBlocks.push(`  ${gradeId}: [\n${catLines.join('\n')}\n  ]${gradeComma}`);
  }

  return `// Auto-generated from vocabulary.md by scripts/convert-vocab.js
// DO NOT EDIT MANUALLY - run: node scripts/convert-vocab.js

export const VOCAB = {
${gradeBlocks.join('\n')}
};

export const GRADES = [
  { id: 'kg', label: 'Kindergarten', icon: '🌱' },
  { id: 'g1', label: 'Grade 1', icon: '⭐' },
  { id: 'g2', label: 'Grade 2', icon: '📚' },
  { id: 'g3', label: 'Grade 3', icon: '🎓' }
];

export const WordUtil = {
  gridChars(word, { keepApostrophe = false } = {}) {
    let w = String(word)
      .replace(/\\s*\\([^)]*\\)\\s*/g, '')
      .replace(/[-\\s]/g, '');
    if (!keepApostrophe) w = w.replace(/'/g, '');
    return w.toLowerCase();
  },
  isGridUsable(word, minLen = 3) {
    const c = this.gridChars(word);
    return /^[a-z]+$/.test(c) && c.length >= minLen;
  },
  pickRound(category, count, seenWords = []) {
    const usable = category.words.filter(w => this.isGridUsable(w, 2));
    const unseen = usable.filter(w => !seenWords.includes(w));
    const pool = unseen.length >= count ? unseen : [...unseen, ...usable];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
};
`;
}

// --- Main ---
const markdown = fs.readFileSync(INPUT_PATH, 'utf-8');
const vocab = parseVocab(markdown);

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Serialize and write
const output = serialize(vocab);
fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');

// Summary
let total = 0;
for (const gradeId of GRADE_ORDER) {
  const count = (vocab[gradeId] || []).length;
  total += count;
  console.log(`  ${gradeId}: ${count} categories`);
}
console.log(`Total: ${total} categories`);
console.log(`✓ Written to ${path.relative(ROOT, OUTPUT_PATH)}`);
