/**
 * gesture-control.js — shared object-gesture controller for all Gesture Cosmos scenes.
 *
 * Usage:
 *   import { createGestureState, applyGestureControl } from '../core/gesture-control.js';
 *
 *   const _gs = createGestureState();         // in module scope
 *
 *   // inside update(dt, cmd):
 *   applyGestureControl(myRootGroup, cmd, _gs, dt);
 *   if (_gs.fistRising)  { computeExplodeOffsets(); }
 *   if (_gs.fistFalling) { reconstructShape(); }
 *
 * Scale semantics (matches user spec):
 *   • Default (no hand)          → targetScale = DEFAULT_SCALE (fills ~80% of view)
 *   • Hand far from camera       → targetScale grows up to MAX_SCALE
 *   • Hand close to camera       → targetScale shrinks down to MIN_SCALE (50% of default)
 *
 * Rotation semantics:
 *   • Open palm sliding left/right → rotates root group on Y axis
 *   • Fist active                  → no rotation (hand is clenched)
 */

export const DEFAULT_SCALE = 1.0;    // corresponds to 80 % viewport fill
export const MIN_SCALE     = 0.5;    // never smaller than this
export const MAX_SCALE     = 2.0;    // ceiling for outward hand movement

/**
 * Create a per-scene gesture state object.
 * Call once at module scope or inside init().
 */
export function createGestureState() {
  return {
    currentScale: DEFAULT_SCALE,
    targetScale:  DEFAULT_SCALE,
    fist:         false,
    fistRising:   false,  // true for exactly one frame on fist activation
    fistFalling:  false,  // true for exactly one frame on fist release
  };
}

/**
 * Apply gesture cmd to a Three.js Object3D (group, mesh, Points, etc.).
 *
 * @param {THREE.Object3D} root  - the scene's main object to scale/rotate
 * @param {object|null}    cmd   - command from GestureRouter.process()
 * @param {object}         state - gesture state from createGestureState()
 * @param {number}         dt    - delta time in seconds
 */
export function applyGestureControl(root, cmd, state, dt) {
  const prevFist = state.fist;

  if (cmd) {
    // ── Scale from hand depth ──────────────────────────────────────────────
    // cmd.handDepth: 0.0 = hand close (small), 1.0 = hand far (large)
    state.targetScale = MIN_SCALE + cmd.handDepth * (MAX_SCALE - MIN_SCALE);

    // ── Rotation from palm X slide (open palm only) ────────────────────────
    if (!cmd.fist && root) {
      root.rotation.y += cmd.rotateY;
    }

    // ── Fist state ─────────────────────────────────────────────────────────
    state.fist = cmd.fist;
  } else {
    // No hand detected: smoothly return to default scale, no rotation change
    state.targetScale = DEFAULT_SCALE;
    state.fist = false;
  }

  // Rising / falling edge detection (one frame only)
  state.fistRising  = state.fist && !prevFist;
  state.fistFalling = !state.fist && prevFist;

  // ── Smooth scale lerp ─────────────────────────────────────────────────────
  // Clamp target to valid range first
  state.targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, state.targetScale));
  state.currentScale = lerp(state.currentScale, state.targetScale, 0.06);

  if (root) {
    root.scale.setScalar(state.currentScale);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
