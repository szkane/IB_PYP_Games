/**
 * WordQuest - Application Entry Point
 *
 * Initializes the router, wires up route changes to screen rendering, and
 * unlocks audio on the first user interaction (iOS Safari requirement).
 *
 * The app mounts into #app (see index.html). All screen content is rendered
 * by screens.js; this file just orchestrates the route → screen mapping.
 */

import { router } from './router.js';
import { screens, destroyCurrentGame } from './screens.js';
import { speech, sfx } from './audio.js';
import { initVoiceControl, showVoiceControl } from './voice-control.js';

/** @type {HTMLElement} */
const app = document.getElementById('app');

/* ---------------------------------------------------------------------------
 * Audio unlock — must happen on first user gesture (click/tap/keydown)
 * ------------------------------------------------------------------------ */

let audioUnlocked = false;

/**
 * Unlock speech synthesis + sound effects on the first user interaction.
 * Idempotent — safe to call from multiple event listeners.
 */
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { speech.unlock(); } catch (e) { /* non-critical */ }
  try { sfx.unlock(); } catch (e) { /* non-critical */ }
}

// Listen for the first interaction of each type (once)
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

/* ---------------------------------------------------------------------------
 * Route handling
 * ------------------------------------------------------------------------ */

/**
 * Handle a route change: destroy the previous game, clear the container,
 * and render the appropriate screen based on the parsed route.
 *
 * @param {Object} route - Parsed route from router.parseRoute()
 *   { grade, cat, mode, action }
 *   action: 'home' | 'categories' | 'mode-select' | 'play'
 * @param {URLSearchParams} query - URL query parameters (for deep links)
 */
function handleRouteChange(route, query) {
  // Release the previous screen's game instance (event listeners, DOM, etc.)
  destroyCurrentGame();

  // Clear the app container for the new screen
  app.innerHTML = '';

  // Deep-link support: ?grade=g2 on the home page → jump to categories
  const qGrade = query.get('grade');
  if (qGrade && route.action === 'home') {
    router.navigate('#/g/' + qGrade);
    return;
  }

  // Toggle voice switcher vs PYP Map link based on route
  showVoiceControl(route.action === 'play');

  // Render the screen matching the route action
  switch (route.action) {
    case 'categories':
      screens.renderCategories(app, route.grade);
      break;
    case 'mode-select':
      screens.renderModeSelect(app, route.grade, route.cat);
      break;
    case 'play':
      screens.renderPlay(app, route.grade, route.cat, route.mode);
      break;
    case 'home':
    default:
      screens.renderHome(app);
      break;
  }
}

/* ---------------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  initVoiceControl();
  router.init(handleRouteChange);
});
