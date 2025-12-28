/**
 * HandTracker - MediaPipe Hands Integration
 * Provides hand detection and gesture recognition for the game.
 */

class HandTracker {
  constructor() {
    this.hands = null;
    this.camera = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;

    // Hand state
    this.isTracking = false;
    this.currentState = "IDLE"; // 'IDLE' | 'OPEN' | 'FIST'
    this.previousState = "IDLE";
    this.stateChangeTime = 0;

    // Position tracking
    this.handPosition = { x: 0, y: 0 };
    this.smoothedPosition = { x: 0, y: 0 };
    this.positionHistory = [];
    this.smoothingFactor = 0.3;

    // Gesture detection thresholds
    this.FIST_THRESHOLD = 0.08;
    this.OPEN_THRESHOLD = 0.15;
    this.STATE_DEBOUNCE_MS = 100;

    // Callbacks
    this.onHandUpdate = null;
    this.onStateChange = null;

    // Debug mode
    this.debugMode = false;
  }

  /**
   * Initialize MediaPipe Hands and camera
   * @param {HTMLVideoElement} videoElement - Video element for camera feed
   * @param {HTMLCanvasElement} canvasElement - Canvas for debug drawing (optional)
   */
  async init(videoElement, canvasElement = null) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    if (canvasElement) {
      this.canvasCtx = canvasElement.getContext("2d");
    }

    // Initialize MediaPipe Hands
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
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
   * Start camera and begin tracking
   */
  async startCamera() {
    try {
      // More comprehensive video constraints for mobile compatibility
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
          // iOS/iPadOS specific optimizations
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: false, // Explicitly disable audio
      };

      console.log("[HandTracker] Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.videoElement.srcObject = stream;

      // Set video element attributes for iOS compatibility
      this.videoElement.setAttribute("playsinline", "true");
      this.videoElement.setAttribute("webkit-playsinline", "true");
      this.videoElement.muted = true;

      // Ensure video plays (iOS requires explicit play() call)
      try {
        await this.videoElement.play();
        console.log("[HandTracker] Video playback started");
      } catch (playError) {
        console.warn("[HandTracker] Video play failed, retrying...", playError);
        // Retry after a short delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        await this.videoElement.play();
      }

      // Start tracking loop
      this.isTracking = true;
      this.trackLoop();

      console.log("[HandTracker] Camera started successfully");
      console.log(
        "[HandTracker] Stream settings:",
        stream.getVideoTracks()[0].getSettings()
      );
      return true;
    } catch (error) {
      console.error("[HandTracker] Camera access error:", error);

      // Provide more specific error messages
      let errorMessage = "Camera access denied";
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

      console.error("[HandTracker]", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Stop tracking and release camera
   */
  stop() {
    this.isTracking = false;

    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    console.log("[HandTracker] Tracking stopped");
  }

  /**
   * Main tracking loop
   */
  async trackLoop() {
    if (!this.isTracking) return;

    if (this.videoElement.readyState >= 2) {
      await this.hands.send({ image: this.videoElement });
    }

    requestAnimationFrame(() => this.trackLoop());
  }

  /**
   * Process MediaPipe results
   * @param {Object} results - MediaPipe hand detection results
   */
  onResults(results) {
    // Clear debug canvas if exists
    if (this.canvasCtx && this.debugMode) {
      this.canvasCtx.save();
      this.canvasCtx.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      // Mirror the canvas
      this.canvasCtx.scale(-1, 1);
      this.canvasCtx.translate(-this.canvasElement.width, 0);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Get palm center (landmark 9 is middle finger base)
      const palmCenter = landmarks[9];

      // Convert to screen coordinates (mirrored)
      const screenX = (1 - palmCenter.x) * window.innerWidth;
      const screenY = palmCenter.y * window.innerHeight;

      // Apply smoothing
      this.smoothedPosition.x +=
        (screenX - this.smoothedPosition.x) * this.smoothingFactor;
      this.smoothedPosition.y +=
        (screenY - this.smoothedPosition.y) * this.smoothingFactor;

      this.handPosition = { ...this.smoothedPosition };

      // Detect hand state
      const newState = this.detectHandState(landmarks);

      // Apply debouncing
      const now = Date.now();
      if (newState !== this.currentState) {
        if (now - this.stateChangeTime > this.STATE_DEBOUNCE_MS) {
          this.previousState = this.currentState;
          this.currentState = newState;
          this.stateChangeTime = now;

          if (this.onStateChange) {
            this.onStateChange(this.currentState, this.previousState);
          }
        }
      }

      // Call update callback
      if (this.onHandUpdate) {
        this.onHandUpdate({
          position: this.handPosition,
          state: this.currentState,
          landmarks: landmarks,
        });
      }

      // Debug drawing
      if (this.canvasCtx && this.debugMode) {
        this.drawHandLandmarks(landmarks);
      }
    } else {
      // No hand detected
      if (this.currentState !== "IDLE") {
        this.previousState = this.currentState;
        this.currentState = "IDLE";

        if (this.onStateChange) {
          this.onStateChange("IDLE", this.previousState);
        }
      }
    }

    if (this.canvasCtx && this.debugMode) {
      this.canvasCtx.restore();
    }
  }

  /**
   * Detect if the hand is open, closed (fist), or idle
   * @param {Array} landmarks - The 21 hand keypoints from MediaPipe
   * @returns {String} 'FIST' | 'OPEN' | 'IDLE'
   */
  detectHandState(landmarks) {
    // Key landmark indices:
    // 0: Wrist
    // 4: Thumb tip
    // 8: Index finger tip
    // 12: Middle finger tip
    // 16: Ring finger tip
    // 20: Pinky tip
    // 5, 9, 13, 17: Finger bases (MCP joints)

    const wrist = landmarks[0];
    const fingerTips = [
      landmarks[8],
      landmarks[12],
      landmarks[16],
      landmarks[20],
    ];
    const fingerBases = [
      landmarks[5],
      landmarks[9],
      landmarks[13],
      landmarks[17],
    ];

    // Calculate average distance from fingertips to palm center
    let totalDistance = 0;
    let totalBaseDistance = 0;

    for (let i = 0; i < fingerTips.length; i++) {
      const tip = fingerTips[i];
      const base = fingerBases[i];

      // Distance from tip to base (finger curl measurement)
      const dx = tip.x - base.x;
      const dy = tip.y - base.y;
      const dz = tip.z - base.z;

      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Distance from base to wrist (for normalization)
      const bdx = base.x - wrist.x;
      const bdy = base.y - wrist.y;
      const bdz = base.z - wrist.z;

      totalBaseDistance += Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
    }

    const avgTipDistance = totalDistance / fingerTips.length;
    const avgBaseDistance = totalBaseDistance / fingerBases.length;

    // Normalize by hand size
    const normalizedDistance = avgTipDistance / avgBaseDistance;

    // Determine state based on normalized finger extension
    if (normalizedDistance < 0.5) {
      return "FIST";
    } else if (normalizedDistance > 0.8) {
      return "OPEN";
    } else {
      // In between - return previous stable state
      return this.currentState !== "IDLE" ? this.currentState : "OPEN";
    }
  }

  /**
   * Draw hand landmarks for debugging
   * @param {Array} landmarks - Hand landmarks
   */
  drawHandLandmarks(landmarks) {
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky
      [5, 9],
      [9, 13],
      [13, 17], // Palm
    ];

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    // Draw connections
    this.canvasCtx.strokeStyle = "#00f3ff";
    this.canvasCtx.lineWidth = 2;

    for (const [start, end] of connections) {
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(landmarks[start].x * w, landmarks[start].y * h);
      this.canvasCtx.lineTo(landmarks[end].x * w, landmarks[end].y * h);
      this.canvasCtx.stroke();
    }

    // Draw landmarks
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI);
      this.canvasCtx.fillStyle = i === 9 ? "#ff00ff" : "#00ff88";
      this.canvasCtx.fill();
    }
  }

  /**
   * Enable or disable debug mode
   * @param {Boolean} enabled - Debug mode state
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Get current hand state
   * @returns {String} Current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Get current hand position
   * @returns {Object} Position {x, y}
   */
  getPosition() {
    return { ...this.handPosition };
  }

  /**
   * Check if hand is grabbing (fist)
   * @returns {Boolean}
   */
  isGrabbing() {
    return this.currentState === "FIST";
  }

  /**
   * Check if hand is open
   * @returns {Boolean}
   */
  isOpen() {
    return this.currentState === "OPEN";
  }
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = HandTracker;
}
