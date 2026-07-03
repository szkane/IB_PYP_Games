/**
 * GestureRouter — normalizes hand landmarks into unified commands.
 *
 * Command types emitted:
 *   { type: 'orbit',  dx, dy, zoomFactor, openness, fist }
 *   { type: 'select', screenX, screenY, openness, fist }
 *   { type: 'reset',  openness, fist }
 *   null  // no hand
 *
 * Design principles:
 *  - Gestures are STATES detected once, not re-evaluated per frame.
 *  - openness: 0.0 = fully closed fist, 1.0 = fully open palm
 *  - fist: boolean, true only when openness < FIST_THRESHOLD, stable after debounce
 */
export class GestureRouter {
  constructor() {
    this.openPalmTimer = 0;
    this.openPalmThreshold = 0.6;  // seconds held for camera reset
    this.pointTimer = 0;
    this.pointThreshold = 0.8;

    this._prevLandmarks = null;
    this._prevPinchDist = null;

    // Fist state — persistent boolean, not recomputed each frame
    this._fistActive = false;
    this._fistOnTimer = 0;
    this._fistOffTimer = 0;
    this._fistOnDelay  = 0.25; // seconds of closed fist before activation
    this._fistOffDelay = 0.15; // seconds of open hand before deactivation
  }

  /**
   * Process MediaPipe landmarks → command.
   * @param {object|null} results - MediaPipe onResults data, or null
   * @param {number} dt - delta time in seconds
   * @returns {object|null} command
   */
  process(results, dt) {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.openPalmTimer = 0;
      this.pointTimer = 0;
      this._prevLandmarks = null;
      this._prevPinchDist = null;
      this._fistActive = false;
      this._fistOnTimer = 0;
      this._fistOffTimer = 0;
      return null;
    }

    const h = results.multiHandLandmarks[0]; // primary hand

    // ---- Hand openness: avg distance of 5 fingertips to wrist ----
    // Normalized: 0.0 = fist, 1.0 = fully open palm
    const wrist = h[0];
    const tips = [4, 8, 12, 16, 20]; // thumb + 4 finger tips
    let totalDist = 0;
    tips.forEach(t => {
      totalDist += Math.hypot(h[t].x - wrist.x, h[t].y - wrist.y, h[t].z - wrist.z);
    });
    // Empirical range: ~0.5 (fist) to ~1.7 (open palm)
    const openness = Math.max(0.0, Math.min(1.0, (totalDist - 0.5) / 1.2));

    // ---- Fist state machine (debounced) ----
    const FIST_THRESHOLD = 0.35;
    const isClosed = openness < FIST_THRESHOLD;
    if (isClosed) {
      this._fistOnTimer += dt;
      this._fistOffTimer = 0;
      if (!this._fistActive && this._fistOnTimer >= this._fistOnDelay) {
        this._fistActive = true;
      }
    } else {
      this._fistOffTimer += dt;
      this._fistOnTimer = 0;
      if (this._fistActive && this._fistOffTimer >= this._fistOffDelay) {
        this._fistActive = false;
      }
    }

    // ---- Orbit: palm center (landmark 9) delta ----
    let dx = 0, dy = 0;
    if (this._prevLandmarks) {
      dx = (h[9].x - this._prevLandmarks[9].x) * 4;
      dy = (h[9].y - this._prevLandmarks[9].y) * 4;
    }
    this._prevLandmarks = h.map(l => ({ x: l.x, y: l.y, z: l.z }));

    // ---- Zoom: differential pinch distance (thumb tip ↔ index tip) ----
    const pinchDist = Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y, h[4].z - h[8].z);
    let zoomFactor = 1.0;
    if (this._prevPinchDist !== null) {
      let deltaPinch = pinchDist - this._prevPinchDist;
      if (Math.abs(deltaPinch) < 0.003) deltaPinch = 0; // dead zone
      const clampedDelta = Math.max(-0.05, Math.min(0.05, deltaPinch));
      zoomFactor = 1.0 + clampedDelta * 4.0;
    }
    this._prevPinchDist = pinchDist;

    // ---- Open palm hold → camera RESET ----
    const isOpenPalm = openness > 0.8;
    if (isOpenPalm) {
      this.openPalmTimer += dt;
    } else {
      this.openPalmTimer = 0;
    }

    // ---- Point detection → SELECT (index extended, others curled) ----
    const indexTip = h[8];
    const indexPip = h[6];
    const fingerTips = [8, 12, 16, 20];
    const isPointing = (Math.hypot(indexTip.y - indexPip.y, indexTip.z - indexPip.z) > 0.08)
      && fingerTips.slice(1).every(t => {
        const d = Math.hypot(h[t].y - h[t-2].y, h[t].z - h[t-2].z);
        return d < 0.05;
      });

    if (isPointing) {
      this.pointTimer += dt;
    } else {
      this.pointTimer = 0;
    }

    // ---- Emit command ----
    const meta = { openness, fist: this._fistActive };

    if (this.openPalmTimer >= this.openPalmThreshold) {
      this.openPalmTimer = 0;
      return { type: 'reset', ...meta };
    }

    if (this.pointTimer >= this.pointThreshold) {
      this.pointTimer = 0;
      return { type: 'select', screenX: h[8].x, screenY: h[8].y, ...meta };
    }

    return { type: 'orbit', dx, dy, zoomFactor, ...meta };
  }
}
