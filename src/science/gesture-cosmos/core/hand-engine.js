/**
 * HandEngine — MediaPipe Hands singleton wrapper.
 * Loaded via global script tags; accesses `window.Hands` and `window.Camera`.
 */
export class HandEngine {
  constructor() {
    this.isActive = false;
    this.isRunning = false;
    this.videoElement = null;
    this.hands = null;
    this.camera = null;
    this.lastResults = null;
    this.onResults = null; // callback(results)
    this.onError = null;   // callback(error)
  }

  /**
   * Initialize MediaPipe Hands. Must be called after user gesture.
   * @param {HTMLVideoElement} videoElement
   */
  async init(videoElement) {
    if (typeof Hands === 'undefined') {
      throw new Error('MediaPipe Hands not loaded');
    }
    this.videoElement = videoElement;
    try {
      this.hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
    } catch (err) {
      if (this.onError) this.onError(err);
      throw err;
    }
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    this.hands.onResults((results) => {
      this.lastResults = results;
      if (this.onResults) this.onResults(results);
    });
    this.isActive = true;
  }

  async startCamera() {
    if (!this.hands) throw new Error('Call init() first');
    if (typeof Camera === 'undefined') {
      const err = new Error('MediaPipe Camera utility not loaded');
      if (this.onError) this.onError(err);
      throw err;
    }
    try {
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.hands && this.videoElement.readyState >= 2) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });
      await this.camera.start();
    } catch (err) {
      if (this.onError) this.onError(err);
      throw err;
    }
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
    this.isActive = false;
    if (this.camera) { try { this.camera.stop(); } catch(e) {} }
    if (this.hands) { try { this.hands.close(); } catch(e) {} }
    this.hands = null;
    this.camera = null;
    this.lastResults = null;
  }
}
