/**
 * WordQuest - Router Module
 * Hash-based routing with URL query parameter support.
 *
 * Hash formats:
 *   #/                                    → home (grade list)
 *   #/g/:grade                            → categories for grade
 *   #/g/:grade/:cat                       → mode-select
 *   #/g/:grade/:cat/:mode/play            → gameplay
 */

export const router = {
  _onChange: null,

  /**
   * Initialize the router with a change callback.
   * @param {Function} onChange - Called with (route, query) on hash/query changes
   */
  init(onChange) {
    this._onChange = onChange;
    window.addEventListener('hashchange', () => this._fire());
    this._fire();
  },

  /**
   * Fire the change callback with parsed route and query.
   */
  _fire() {
    if (this._onChange) this._onChange(this.parseRoute(), this.parseQuery());
  },

  /**
   * Navigate to a new hash route.
   * @param {string} hash - Hash path (e.g. '#/g/g1')
   */
  navigate(hash) {
    window.location.hash = hash;
  },

  /**
   * Parse the current hash into a route object.
   * @returns {Object} { grade, cat, mode, action }
   */
  parseRoute() {
    const hash = window.location.hash.slice(1);
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) return { grade: null, cat: null, mode: null, action: 'home' };
    if (parts[0] !== 'g') return { grade: null, cat: null, mode: null, action: 'home' };
    return {
      grade: parts[1] || null,
      cat: parts[2] || null,
      mode: parts[3] || null,
      action: parts[4] || (parts[3] ? 'play' : (parts[2] ? 'mode-select' : (parts[1] ? 'categories' : 'home')))
    };
  },

  /**
   * Parse URL query parameters.
   * @returns {URLSearchParams} Query parameters
   */
  parseQuery() {
    return new URLSearchParams(window.location.search);
  }
};
