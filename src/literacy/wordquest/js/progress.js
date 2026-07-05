/**
 * WordQuest - Progress Module
 * Manages per-grade, per-category progress via localStorage.
 * Tracks round-based word lists and star completion for Word Search (ws)
 * and Crossword (cw) modes.
 */

import { VOCAB, WordUtil } from './data.js';

const STORAGE_KEY = 'pyp_wordquest_v1';

export const progress = {
  /**
   * Load progress data from localStorage.
   * @returns {Object} Progress data object { version, byGrade }
   */
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[WordQuest] progress load failed:', e);
    }
    return { version: 1, byGrade: {} };
  },

  /**
   * Save progress data to localStorage.
   * @param {Object} data - Progress data to save
   */
  _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[WordQuest] progress save failed:', e);
    }
  },

  /**
   * Get progress for a specific category.
   * @param {string} gradeId - Grade ID (e.g. 'g1')
   * @param {string} catId - Category ID
   * @returns {Object} Category progress { rounds, cursor, starWS, starCW }
   */
  getCategory(gradeId, catId) {
    const data = this._load();
    const g = data.byGrade[gradeId] || (data.byGrade[gradeId] = {});
    return g[catId] || { rounds: [], cursor: 0, starWS: false, starCW: false };
  },

  /**
   * Record completion of a mode for a category.
   * @param {string} gradeId - Grade ID
   * @param {string} catId - Category ID
   * @param {string} mode - 'ws' (word search) or 'cw' (crossword)
   * @param {string[]} words - Words used in this round
   */
  recordCompletion(gradeId, catId, mode, words) {
    const data = this._load();
    const g = data.byGrade[gradeId] || (data.byGrade[gradeId] = {});
    const cat = g[catId] || { rounds: [], cursor: 0, starWS: false, starCW: false };
    const cursor = cat.cursor || 0;
    if (!cat.rounds[cursor]) cat.rounds[cursor] = { words: [...words], ws: false, cw: false };
    cat.rounds[cursor][mode] = true;
    if (mode === 'ws') cat.starWS = true;
    if (mode === 'cw') cat.starCW = true;
    if (cat.rounds[cursor].ws && cat.rounds[cursor].cw) {
      cat.cursor = cursor + 1;
    }
    g[catId] = cat;
    this._save(data);
  },

  /**
   * Get the words for the current round of a category.
   * Uses WordUtil.pickRound with previously seen words excluded.
   * @param {string} gradeId - Grade ID
   * @param {string} catId - Category ID
   * @param {Object} category - Category object from VOCAB
   * @param {number} [count=10] - Number of words to pick
   * @returns {string[]} Selected words for this round
   */
  getRoundWords(gradeId, catId, category, count = 10) {
    const cat = this.getCategory(gradeId, catId);
    const seenWords = cat.rounds.flatMap(r => r.words || []);
    return WordUtil.pickRound(category, count, seenWords);
  },

  /**
   * Check if a category is fully complete (both stars earned).
   * @param {string} gradeId - Grade ID
   * @param {string} catId - Category ID
   * @returns {boolean}
   */
  isCategoryComplete(gradeId, catId) {
    const cat = this.getCategory(gradeId, catId);
    return cat.starWS && cat.starCW;
  },

  /**
   * Get aggregate progress for an entire grade.
   * @param {string} gradeId - Grade ID
   * @returns {Object} { total, wsDone, cwDone, fullyDone }
   */
  getGradeProgress(gradeId) {
    const data = this._load();
    const g = data.byGrade[gradeId] || {};
    const categories = VOCAB[gradeId] || [];
    let wsDone = 0, cwDone = 0, fullyDone = 0;
    for (const cat of categories) {
      const p = g[cat.id];
      if (p) {
        if (p.starWS) wsDone++;
        if (p.starCW) cwDone++;
        if (p.starWS && p.starCW) fullyDone++;
      }
    }
    return { total: categories.length, wsDone, cwDone, fullyDone };
  },

  /**
   * Clear all stored progress.
   */
  clearAll() {
    this._save({ version: 1, byGrade: {} });
  }
};
