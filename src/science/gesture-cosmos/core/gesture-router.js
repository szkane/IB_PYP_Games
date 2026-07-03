/**
 * GestureRouter — translates raw MediaPipe landmarks into unified object-control commands.
 *
 * Design (first principles):
 *  - Open palm (openness ≥ 0.6):
 *      • Hand depth (apparent size) → object scale  [farther = bigger]
 *      • Hand X sliding left/right → object Y rotation
 *  - Clenched fist (openness < 0.35, debounced):
 *      • Emits fist:true → scenes explode particles
 *  - Open palm after fist → fist:false → scenes reconstruct
 *  - Camera is NOT moved by gestures; OrbitControls handles mouse.
 *
 * Command emitted each frame:
 *   {
 *     handDepth: number,   // 0.0 (hand very close) → 1.0 (hand far away)
 *     rotateY:   number,   // delta rotation this frame (radians), 0 when fist
 *     fist:      boolean,  // stable debounced fist state
 *     openness:  number,   // 0.0=fist … 1.0=fully open palm
 *   }
 *   or null when no hand detected.
 */
export class GestureRouter {
  constructor() {
    // Fist state machine
    this._fistActive  = false;
    this._fistOnTimer  = 0;
    this._fistOffTimer = 0;
    this._fistOnDelay  = 0.25;  // seconds of closed hand before activating
    this._fistOffDelay = 0.20;  // seconds of open hand before deactivating

    this._prevPalmX = null;     // previous palm X for rotation delta
  }

  process(results, dt) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // Reset state when hand leaves frame
      this._fistActive   = false;
      this._fistOnTimer  = 0;
      this._fistOffTimer = 0;
      this._prevPalmX    = null;
      return null;
    }

    const h = results.multiHandLandmarks[0];

    // ── 1. Openness ─────────────────────────────────────────────────────────
    // Average distance of 5 fingertips (thumb + 4 fingers) to wrist.
    // Empirically: ~0.5 when fully fisted, ~1.7 when fully open.
    const wrist = h[0];
    const tips  = [4, 8, 12, 16, 20];
    let totalDist = 0;
    tips.forEach(t => {
      totalDist += Math.hypot(h[t].x - wrist.x, h[t].y - wrist.y, h[t].z - wrist.z);
    });
    const openness = Math.max(0, Math.min(1, (totalDist - 0.5) / 1.2));

    // ── 2. Fist state machine (debounced) ───────────────────────────────────
    // Hysteresis: require 250 ms hold to activate, 200 ms open to deactivate.
    // This prevents false triggers from transient tracking noise.
    const FIST_THRESHOLD = 0.35;
    if (openness < FIST_THRESHOLD) {
      this._fistOnTimer  += dt;
      this._fistOffTimer  = 0;
      if (!this._fistActive && this._fistOnTimer >= this._fistOnDelay) {
        this._fistActive = true;
      }
    } else {
      this._fistOffTimer += dt;
      this._fistOnTimer   = 0;
      if (this._fistActive && this._fistOffTimer >= this._fistOffDelay) {
        this._fistActive = false;
      }
    }

    // ── 3. Hand depth via apparent size ─────────────────────────────────────
    // Use wrist→middle-finger-tip distance in screen space as a depth proxy.
    // When hand is far from camera: small apparent size → larger handSize value
    // is counter-intuitive, so:
    //   handSize large (hand close)  → handDepth 0.0 (object shrinks)
    //   handSize small (hand far)    → handDepth 1.0 (object grows)
    //
    // Empirical range: ~0.08 (far) to ~0.38 (very close).
    const handSize = Math.hypot(h[12].x - wrist.x, h[12].y - wrist.y);
    // Invert: farther hand = higher depth value
    const HAND_NEAR = 0.35;
    const HAND_FAR  = 0.08;
    const handDepth = Math.max(0, Math.min(1,
      (HAND_NEAR - handSize) / (HAND_NEAR - HAND_FAR)
    ));

    // ── 4. Y-axis rotation from palm X slide ────────────────────────────────
    // Only rotate when open palm (not fist) to avoid conflict.
    const palmX = h[9].x;  // palm center landmark
    let rotateY = 0;
    if (!this._fistActive && this._prevPalmX !== null) {
      const deltaX = palmX - this._prevPalmX;
      // Clamp to ±0.05 per frame, scale to a reasonable rotation speed
      const clamped = Math.max(-0.05, Math.min(0.05, deltaX));
      rotateY = clamped * 6.0;  // radians per frame at 60fps
    }
    this._prevPalmX = palmX;

    return {
      handDepth,
      rotateY,
      fist:     this._fistActive,
      openness,
    };
  }
}
