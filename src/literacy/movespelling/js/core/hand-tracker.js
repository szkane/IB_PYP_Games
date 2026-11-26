/**
 * HandTracker - MediaPipe Hands Integration
 * Provides resilient hand detection and gesture recognition for MoveSpell.
 */

let _mpHandsCdnBase = "https://cdn.jsdelivr.net/npm/@mediapipe/hands";

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureMediaPipeHands() {
  if (typeof window.Hands === "function") {
    return _mpHandsCdnBase;
  }
  const bases = [
    "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
    "https://unpkg.com/@mediapipe/hands",
  ];
  for (const base of bases) {
    try {
      await _loadScript(`${base}/hands.js`);
      if (typeof window.Hands === "function") {
        _mpHandsCdnBase = base;
        return base;
      }
    } catch (_) {}
  }
  throw new Error(
    "Could not load MediaPipe Hands library. Check your network connection or use Touch / Mouse mode."
  );
}

class HandTracker {
  constructor() {
    this.hands = null;
    this.camera = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;

    // Hand state
    this.isTracking = false;
    this.isProcessing = false;
    this.currentState = "IDLE"; // 'IDLE' | 'OPEN' | 'FIST'
    this.previousState = "IDLE";
    this.stateChangeTime = 0;

    // Position tracking
    this.handPosition = { x: 0, y: 0 };
    this.smoothedPosition = { x: 0, y: 0 };
    this.hasPositioned = false;
    this.smoothingFactor = 0.35;

    // Gesture detection thresholds (palm-normalized ratio: avg(dist(tip, wrist)) / avg(dist(mcp, wrist)))
    this.FIST_RATIO_THRESHOLD = 1.28;
    this.OPEN_RATIO_THRESHOLD = 1.52;
    this.STATE_DEBOUNCE_MS = 90;

    // Frame rate limiting (30fps)
    this.targetFPS = 30;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.consecutiveErrors = 0;
    this.MAX_CONSECUTIVE_ERRORS = 5;

    // Animation frame tracking for proper cleanup
    this.animationFrameId = null;

    // Callbacks
    this.onHandUpdate = null;
    this.onStateChange = null;

    // Debug / skeleton canvas mode
    this.debugMode = true;
  }

  /**
   * Initialize MediaPipe Hands
   * @param {HTMLVideoElement} videoElement - Video element for camera feed
   * @param {HTMLCanvasElement} canvasElement - Canvas for skeleton drawing (optional)
   */
  async init(videoElement, canvasElement = null) {
    if (videoElement) this.videoElement = videoElement;
    if (canvasElement) {
      this.canvasElement = canvasElement;
      this.canvasCtx = canvasElement.getContext("2d");
    }

    const cdnBase = await ensureMediaPipeHands();
    this.hands = new window.Hands({
      locateFile: (file) => `${cdnBase}/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    this.hands.onResults((results) => this.onResults(results));
    console.log("[HandTracker] MediaPipe Hands initialized");
  }

  /**
   * Start camera directly inside user click handler and begin tracking pump.
   * Safe to call before or after init().
   * @param {HTMLVideoElement} [videoElement]
   */
  async startCamera(videoElement = null) {
    if (videoElement) this.videoElement = videoElement;
    if (!this.videoElement) {
      throw new Error("Camera video element is missing.");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Camera access requires HTTPS or localhost. Use Touch / Mouse mode or open over HTTPS/localhost."
      );
    }

    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: false,
      };

      console.log("[HandTracker] Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.videoElement.setAttribute("playsinline", "true");
      this.videoElement.setAttribute("webkit-playsinline", "true");
      this.videoElement.muted = true;
      this.videoElement.autoplay = true;
      this.videoElement.srcObject = stream;

      try {
        await this.videoElement.play();
      } catch (playError) {
        console.warn("[HandTracker] Video play failed, retrying...", playError);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.videoElement.play();
      }

      this.isTracking = true;
      if (this.animationFrameId === null) {
        this.trackLoop();
      }

      console.log("[HandTracker] Camera started successfully");
      return true;
    } catch (error) {
      console.error("[HandTracker] Camera access error:", error);

      let errorMessage = error.message || "Camera access denied";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on this device.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera constraints could not be satisfied.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Camera access requires HTTPS or localhost.";
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Stop tracking and release camera
   */
  stop() {
    this.isTracking = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isProcessing = false;
    this.consecutiveErrors = 0;

    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      this.videoElement.srcObject = null;
    }

    if (this.hands) {
      try {
        this.hands.close();
      } catch (error) {
        console.warn("[HandTracker] Error closing MediaPipe:", error);
      }
      this.hands = null;
    }
  }

  /**
   * 30fps tracking loop with re-entrancy guard
   */
  async trackLoop() {
    if (!this.isTracking) {
      this.animationFrameId = null;
      return;
    }

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now;

      if (
        this.hands &&
        this.videoElement &&
        this.videoElement.readyState >= 2 &&
        this.videoElement.videoWidth > 0 &&
        !this.isProcessing
      ) {
        this.isProcessing = true;
        try {
          await this.hands.send({ image: this.videoElement });
          this.consecutiveErrors = 0;
        } catch (error) {
          this.consecutiveErrors++;
          console.error(
            `[HandTracker] Error processing frame (${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}):`,
            error
          );
          if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
            this.consecutiveErrors = 0;
            if (this.onHandUpdate) {
              this.onHandUpdate({
                detected: false,
                state: "IDLE",
                position: this.handPosition,
              });
            }
          }
        } finally {
          this.isProcessing = false;
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.trackLoop());
  }

  /**
   * Process MediaPipe results
   * @param {Object} results - MediaPipe hand detection results
   */
  onResults(results) {
    if (this.canvasCtx && this.debugMode && this.canvasElement) {
      this.canvasCtx.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
    }

    if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const palmCenter = landmarks[9];

      const screenX = (1 - palmCenter.x) * window.innerWidth;
      const screenY = palmCenter.y * window.innerHeight;

      // Snap directly when transitioning from IDLE or first detection so cursor doesn't fly from (0,0)
      if (this.currentState === "IDLE" || !this.hasPositioned) {
        this.smoothedPosition.x = screenX;
        this.smoothedPosition.y = screenY;
        this.hasPositioned = true;
      } else {
        this.smoothedPosition.x +=
          (screenX - this.smoothedPosition.x) * this.smoothingFactor;
        this.smoothedPosition.y +=
          (screenY - this.smoothedPosition.y) * this.smoothingFactor;
      }

      this.handPosition = { ...this.smoothedPosition };

      const newState = this.detectHandState(landmarks);
      const now = Date.now();
      if (newState !== this.currentState) {
        if (this.currentState === "IDLE" || now - this.stateChangeTime > this.STATE_DEBOUNCE_MS) {
          this.previousState = this.currentState;
          this.currentState = newState;
          this.stateChangeTime = now;

          if (this.onStateChange) {
            this.onStateChange(this.currentState, this.previousState);
          }
        }
      }

      if (this.onHandUpdate) {
        this.onHandUpdate({
          position: this.handPosition,
          state: this.currentState,
          landmarks,
          detected: true,
        });
      }

      if (this.canvasCtx && this.debugMode && this.canvasElement) {
        this.drawHandLandmarks(landmarks);
      }
    } else {
      // No hand detected — immediately notify Phaser scenes so cursor hides
      if (this.currentState !== "IDLE") {
        this.previousState = this.currentState;
        this.currentState = "IDLE";
        this.stateChangeTime = Date.now();

        if (this.onStateChange) {
          this.onStateChange("IDLE", this.previousState);
        }
      }

      if (this.onHandUpdate) {
        this.onHandUpdate({
          position: this.handPosition,
          state: "IDLE",
          detected: false,
        });
      }
    }
  }

  /**
   * Scale-invariant palm-normalized extension ratio: avg(dist(tip, wrist)) / avg(dist(mcp, wrist))
   * Works reliably both when fingers curl to palm center (~1.05) and when tucked toward wrist (<1.0).
   * @param {Array} landmarks - 21 hand landmarks
   * @returns {String} 'FIST' | 'OPEN'
   */
  detectHandState(landmarks) {
    const wrist = landmarks[0];
    const fingerTips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    const fingerBases = [landmarks[5], landmarks[9], landmarks[13], landmarks[17]];

    let totalTipWristDist = 0;
    let totalMcpWristDist = 0;

    for (let i = 0; i < fingerTips.length; i++) {
      const tip = fingerTips[i];
      const base = fingerBases[i];

      const dx = tip.x - wrist.x;
      const dy = tip.y - wrist.y;
      const dz = (tip.z || 0) - (wrist.z || 0);
      totalTipWristDist += Math.sqrt(dx * dx + dy * dy + dz * dz);

      const bdx = base.x - wrist.x;
      const bdy = base.y - wrist.y;
      const bdz = (base.z || 0) - (wrist.z || 0);
      totalMcpWristDist += Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
    }

    const avgTipWrist = totalTipWristDist / fingerTips.length;
    const avgMcpWrist = Math.max(totalMcpWristDist / fingerBases.length, 0.001);
    const extensionRatio = avgTipWrist / avgMcpWrist;

    if (extensionRatio < this.FIST_RATIO_THRESHOLD) {
      return "FIST";
    } else if (extensionRatio > this.OPEN_RATIO_THRESHOLD) {
      return "OPEN";
    } else {
      return this.currentState !== "IDLE" ? this.currentState : "OPEN";
    }
  }

  /**
   * Draw hand landmarks on PiP skeleton canvas
   * @param {Array} landmarks - Hand landmarks
   */
  drawHandLandmarks(landmarks) {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    this.canvasCtx.strokeStyle = "#00f3ff";
    this.canvasCtx.lineWidth = 2.5;

    for (const [start, end] of connections) {
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(landmarks[start].x * w, landmarks[start].y * h);
      this.canvasCtx.lineTo(landmarks[end].x * w, landmarks[end].y * h);
      this.canvasCtx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(lm.x * w, lm.y * h, i === 9 ? 5 : 3.5, 0, 2 * Math.PI);
      this.canvasCtx.fillStyle = i === 9 ? "#ffe156" : "#00ff88";
      this.canvasCtx.fill();
    }
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  getState() {
    return this.currentState;
  }

  getPosition() {
    return { ...this.handPosition };
  }

  isGrabbing() {
    return this.currentState === "FIST";
  }

  isOpen() {
    return this.currentState === "OPEN";
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HandTracker;
}
