/**
 * CameraRig — unified camera orbit controller.
 * Can be driven by gesture commands or OrbitControls.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);
    this.minZoom = 5;
    this.maxZoom = 500;

    // Initialize OrbitControls
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = this.minZoom;
    this.orbitControls.maxDistance = this.maxZoom;
    this.orbitControls.target.copy(this.target);
  }

  /**
   * Apply orbit command from gesture router.
   */
  applyCommand(cmd) {
    if (!cmd) {
      this.orbitControls.update();
      return;
    }

    if (cmd.type === 'orbit') {
      const offset = new THREE.Vector3().copy(this.camera.position).sub(this.orbitControls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      spherical.theta -= cmd.dx * 0.05;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + cmd.dy * 0.05));
      
      if (cmd.zoomFactor) {
        spherical.radius /= cmd.zoomFactor;
        spherical.radius = Math.max(this.minZoom, Math.min(this.maxZoom, spherical.radius));
      }

      const newOffset = new THREE.Vector3().setFromSpherical(spherical);
      this.camera.position.copy(this.orbitControls.target).add(newOffset);
      this.camera.lookAt(this.orbitControls.target);
      this.orbitControls.update();
    } else if (cmd.type === 'reset') {
      this.resetToOverview();
    }
  }

  /**
   * Focus on a world position.
   */
  focusOn(position, offsetRadius) {
    this.orbitControls.target.copy(position);
    const offset = new THREE.Vector3(0, offsetRadius * 0.5, offsetRadius);
    this.camera.position.copy(position).add(offset);
    this.camera.lookAt(position);
    this.orbitControls.update();
  }

  /**
   * Reset to overview.
   */
  resetToOverview(radius = 60, phi = Math.PI / 4, theta = Math.PI / 4) {
    this.orbitControls.target.set(0, 0, 0);
    const spherical = new THREE.Spherical(radius, phi, theta);
    const offset = new THREE.Vector3().setFromSpherical(spherical);
    this.camera.position.copy(this.orbitControls.target).add(offset);
    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();
  }

  /**
   * Update called every frame.
   */
  update() {
    this.orbitControls.update();
  }
}
