/**
 * GestureRouter — translates raw MediaPipe landmarks into unified object-control commands.
 *
 * Uses scale-invariant palm-normalized openness so open palms at arm's length
 * are never misclassified as fists:
 *   tipDist = sum(|landmarks[t] - landmarks[0]|) for t in [8, 12, 16, 20]
 *   palmDist = sum(|landmarks[b] - landmarks[0]|) for b in [5, 9, 13, 17]
 *   ratio = tipDist / max(palmDist, 0.001)
 *   openness = clamp((ratio - 1.05) / 0.80, 0, 1)
 */
export class GestureRouter {
  constructor() {
    // Fist state machine
    this._fistActive   = false;
    this._fistOnTimer  = 0;
    this._fistOffTimer = 0;
    this._fistOnDelay  = 0.25;  // seconds of closed hand before activating
    this._fistOffDelay = 0.20;  // seconds of open hand before deactivating

    this._prevPalmX = null;     // previous palm X for rotation delta
  }

  process(results, dt) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this._fistActive   = false;
      this._fistOnTimer  = 0;
      this._fistOffTimer = 0;
      this._prevPalmX    = null;
      return null;
    }

    const h = results.multiHandLandmarks[0];
    const wrist = h[0];

    // ── 1. Scale-invariant palm-normalized openness ─────────────────────────
    const tips = [8, 12, 16, 20];
    const bases = [5, 9, 13, 17];
    let tipDist = 0;
    let palmDist = 0;
    for (let i = 0; i < 4; i++) {
      const t = h[tips[i]];
      const b = h[bases[i]];
      tipDist += Math.hypot(t.x - wrist.x, t.y - wrist.y, (t.z || 0) - (wrist.z || 0));
      palmDist += Math.hypot(b.x - wrist.x, b.y - wrist.y, (b.z || 0) - (wrist.z || 0));
    }
    const ratio = tipDist / Math.max(palmDist, 0.001);
    const openness = Math.max(0, Math.min(1, (ratio - 1.05) / 0.80));

    // ── 2. Fist state machine (debounced with hysteresis) ───────────────────
    const FIST_THRESHOLD = 0.30;
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
    const handSize = Math.hypot(h[12].x - wrist.x, h[12].y - wrist.y);
    const HAND_NEAR = 0.35;
    const HAND_FAR  = 0.08;
    const handDepth = Math.max(0, Math.min(1,
      (HAND_NEAR - handSize) / (HAND_NEAR - HAND_FAR)
    ));

    // ── 4. Y-axis rotation from palm X slide with deadzone ──────────────────
    const palmX = h[9].x;
    let rotateY = 0;
    if (!this._fistActive && this._prevPalmX !== null) {
      const deltaX = palmX - this._prevPalmX;
      if (Math.abs(deltaX) >= 0.004) {
        const clamped = Math.max(-0.05, Math.min(0.05, deltaX));
        rotateY = clamped * 6.0;
      }
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
