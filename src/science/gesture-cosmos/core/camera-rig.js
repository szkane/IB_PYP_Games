/**
 * CameraRig — unified camera orbit controller.
 * Can be driven by gesture commands or mouse OrbitControls.
 */
import * as THREE from 'three';

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);
    this.spherical = new THREE.Spherical();
    this.zoom = 60;
    this.minZoom = 5;
    this.maxZoom = 200;

    // Get initial spherical from camera position
    this._updateSpherical();
  }

  _updateSpherical() {
    const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(offset);
  }

  _applySpherical() {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  /**
   * Apply orbit command from gesture router.
   */
  applyCommand(cmd) {
    if (!cmd) return;
    if (cmd.type === 'orbit') {
      this.spherical.theta -= cmd.dx * 0.05;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + cmd.dy * 0.05));
      if (cmd.zoomFactor) {
        this.spherical.radius /= cmd.zoomFactor;
        this.spherical.radius = Math.max(this.minZoom, Math.min(this.maxZoom, this.spherical.radius));
      }
      this._applySpherical();
    } else if (cmd.type === 'reset') {
      this.spherical.set(60, Math.PI / 4, Math.PI / 4);
      this._applySpherical();
    }
  }

  /**
   * Focus on a world position.
   */
  focusOn(position, offsetRadius) {
    this.target.copy(position);
    this.spherical.radius = offsetRadius || 15;
    this._applySpherical();
  }

  /**
   * Reset to overview.
   */
  resetToOverview(radius = 60, phi = Math.PI / 4, theta = Math.PI / 4) {
    this.target.set(0, 0, 0);
    this.spherical.set(radius, phi, theta);
    this._applySpherical();
  }

  /**
   * Update — call every frame for smooth lerp if needed.
   */
  update() {
    // No smoothing needed — direct spherical application is instant.
    // This hook exists for future lerp-based smoothing.
  }
}
