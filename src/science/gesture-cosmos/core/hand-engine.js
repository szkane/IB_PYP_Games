/**
 * HandEngine — Resilient MediaPipe Hands singleton wrapper.
 * Uses multi-CDN fallback loader, direct getUserMedia, and a 30fps
 * isProcessing-guarded requestAnimationFrame pump (no camera_utils).
 */

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

let _mpCdnBase = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function ensureMediaPipeHands() {
  if (typeof window.Hands === 'function') return _mpCdnBase;
  const bases = [
    'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
    'https://unpkg.com/@mediapipe/hands'
  ];
  for (const base of bases) {
    try {
      await loadScript(`${base}/hands.js`);
      if (typeof window.Hands === 'function') {
        _mpCdnBase = base;
        return base;
      }
    } catch (_) {}
  }
  throw new Error('Could not load MediaPipe Hands from CDN');
}

export class HandEngine {
  constructor() {
    this.isActive = false;
    this.isRunning = false;
    this.isProcessing = false;
    this.videoElement = null;
    this.skeletonCanvas = null;
    this.hands = null;
    this.stream = null;
    this.rafId = null;
    this.lastSendTime = 0;
    this.lastResults = null;
    this.onResults = null; // callback(results)
    this.onError = null;   // callback(error)
    this.onDrawLandmarks = null; // optional callback(results)
  }

  setSkeletonCanvas(canvas) {
    this.skeletonCanvas = canvas;
  }

  /**
   * Initialize MediaPipe Hands instance.
   * @param {HTMLVideoElement} videoElement
   */
  async init(videoElement) {
    if (videoElement) this.videoElement = videoElement;
    try {
      const cdnBase = await ensureMediaPipeHands();
      this.hands = new window.Hands({
        locateFile: (file) => `${cdnBase}/${file}`
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
      this._drawSkeleton(results);
      if (this.onDrawLandmarks) this.onDrawLandmarks(results);
      if (this.onResults) this.onResults(results);
    });

    this.isActive = true;
  }

  /**
   * Request webcam directly inside user gesture and start 30fps pump.
   * Safe to call before or after init().
   * @param {HTMLVideoElement} [videoElement]
   */
  async startCamera(videoElement = null) {
    if (videoElement) this.videoElement = videoElement;
    if (!this.videoElement) throw new Error('Video element is required');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('Camera access requires HTTPS or localhost.');
      if (this.onError) this.onError(err);
      throw err;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });

      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('webkit-playsinline', '');
      this.videoElement.muted = true;
      this.videoElement.autoplay = true;
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      this.isRunning = true;
      this._startPump();
    } catch (err) {
      this.stop();
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  _startPump() {
    if (this.rafId !== null) return;
    const tick = () => {
      if (!this.isRunning) {
        this.rafId = null;
        return;
      }
      const now = performance.now();
      if (
        now - this.lastSendTime >= 33 &&
        this.hands &&
        this.videoElement &&
        this.videoElement.readyState >= 2 &&
        this.videoElement.videoWidth > 0 &&
        !this.isProcessing
      ) {
        this.lastSendTime = now;
        this.isProcessing = true;
        this.hands.send({ image: this.videoElement })
          .catch((e) => console.warn('[HandEngine] Frame skipped:', e))
          .finally(() => {
            this.isProcessing = false;
          });
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _drawSkeleton(results) {
    if (!this.skeletonCanvas) return;
    const ctx = this.skeletonCanvas.getContext('2d');
    if (!ctx) return;
    const w = this.skeletonCanvas.width;
    const h = this.skeletonCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const handsList = results && results.multiHandLandmarks;
    if (!handsList || !handsList.length) return;

    handsList.forEach((lms, idx) => {
      ctx.strokeStyle = idx === 0 ? '#00f3ff' : '#ffe156';
      ctx.lineWidth = 2.5;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(lms[a].x * w, lms[a].y * h);
        ctx.lineTo(lms[b].x * w, lms[b].y * h);
        ctx.stroke();
      }
      for (let i = 0; i < lms.length; i++) {
        ctx.beginPath();
        ctx.arc(lms[i].x * w, lms[i].y * h, i === 9 ? 5 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = i === 9 ? '#ffe156' : '#86efac';
        ctx.fill();
      }
    });
  }

  stop() {
    this.isRunning = false;
    this.isActive = false;
    this.isProcessing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      this.videoElement.srcObject = null;
    }
    if (this.hands) {
      try { this.hands.close(); } catch (_) {}
      this.hands = null;
    }
    this.lastResults = null;
    this._drawSkeleton(null);
  }
}
