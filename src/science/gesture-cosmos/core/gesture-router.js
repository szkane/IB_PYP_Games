/**
 * GestureRouter — normalizes hand landmarks into unified commands.
 *
 * Command types emitted:
 *   { type: 'orbit',  dx: number, dy: number }
 *   { type: 'zoom',   factor: number }         // 1 = no zoom, <1 = out, >1 = in
 *   { type: 'select', screenX: number, screenY: number }
 *   { type: 'reset' }
 *   null  // no hand
 */
export class GestureRouter {
  constructor() {
    this.lastCommand = null;
    this.openPalmTimer = 0;
    this.pointTimer = 0;
    this.openPalmThreshold = 0.6;  // seconds
    this.pointThreshold = 0.8;
    this.prevLandmarks = null;
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
      this.prevLandmarks = null;
      return null;
    }

    const hands = results.multiHandLandmarks;
    const h = hands[0]; // primary hand

    // ---- Orbit: palm center (landmark 9) delta ----
    let dx = 0, dy = 0;
    if (this.prevLandmarks) {
      dx = (h[9].x - this.prevLandmarks[9].x) * 4;
      dy = (h[9].y - this.prevLandmarks[9].y) * 4;
    }
    this.prevLandmarks = h.map(l => ({ x: l.x, y: l.y, z: l.z }));

    // ---- Zoom: thumb(4)↔index(8) pinch distance ----
    const pinchDist = Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y, h[4].z - h[8].z);
    const zoomFactor = 1 + (0.5 - pinchDist) * 2; // ~0.3 → zoom out, ~0.7 → zoom in

    // ---- Open palm detection for RESET ----
    const fingerTips = [8, 12, 16, 20];
    let totalSpread = 0;
    fingerTips.forEach(t => {
      totalSpread += Math.hypot(h[t].x - h[0].x, h[t].y - h[0].y, h[t].z - h[0].z);
    });
    const isOpenPalm = totalSpread > 1.2;

    if (isOpenPalm) {
      this.openPalmTimer += dt;
    } else {
      this.openPalmTimer = 0;
    }

    // ---- Point detection for SELECT (index finger extended, others curled) ----
    const indexTip = h[8];
    const indexPip = h[6];
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
    if (this.openPalmTimer >= this.openPalmThreshold) {
      this.openPalmTimer = 0;
      return { type: 'reset' };
    }

    if (this.pointTimer >= this.pointThreshold) {
      this.pointTimer = 0;
      return {
        type: 'select',
        screenX: h[8].x,
        screenY: h[8].y
      };
    }

    return {
      type: 'orbit',
      dx,
      dy,
      zoomFactor
    };
  }
}
