/**
 * CameraRig — mouse-only orbit controller.
 *
 * Gestures no longer move the camera; they control scene objects directly.
 * OrbitControls provides mouse/touch drag + scroll zoom for desktop use.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraRig {
  constructor(camera, domElement) {
    this.camera     = camera;
    this.domElement = domElement;
    this.target     = new THREE.Vector3(0, 0, 0);
    this.minZoom    = 5;
    this.maxZoom    = 800;

    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enableDamping   = true;
    this.orbitControls.dampingFactor   = 0.05;
    this.orbitControls.minDistance     = this.minZoom;
    this.orbitControls.maxDistance     = this.maxZoom;
    this.orbitControls.target.copy(this.target);
  }

  /**
   * Called every frame — just ticks OrbitControls damping.
   * Gesture commands are handled by scene modules directly.
   */
  applyCommand(_cmd) {
    this.orbitControls.update();
  }

  /**
   * Focus camera on a world position (used by Solar System planet buttons).
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
    const offset    = new THREE.Vector3().setFromSpherical(spherical);
    this.camera.position.copy(this.orbitControls.target).add(offset);
    this.camera.lookAt(this.orbitControls.target);
    this.orbitControls.update();
  }

  update() {
    this.orbitControls.update();
  }
}
