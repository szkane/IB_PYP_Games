/**
 * SceneHost — manages scene lifecycle.
 *
 * Each scene module exports:
 *   { name, init(ctx), update(dt, cmd), dispose() }
 *
 * Shared ctx = { scene, camera, renderer, textureLoader, cameraRig, handEngine, gestureRouter }
 */
import * as THREE from 'three';

export class SceneHost {
  constructor() {
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
    this.ctx = null;
  }

  register(name, sceneModule) {
    this.scenes.set(name, sceneModule);
  }

  setContext(ctx) {
    this.ctx = ctx;
  }

  getCurrentName() {
    return this.currentName;
  }

  switchTo(name) {
    const next = this.scenes.get(name);
    if (!next) throw new Error(`Scene not found: ${name}`);

    // Dispose previous
    if (this.current && typeof this.current.dispose === 'function') {
      try { this.current.dispose(); } catch (e) {
        console.error(`[SceneHost] Error disposing "${this.currentName}":`, e);
      }
    }

    // Reset camera target
    this.ctx.cameraRig.resetToOverview();

    // Init next
    this.current = next;
    this.currentName = name;
    try {
      this.current.init(this.ctx);
    } catch (e) {
      console.error(`[SceneHost] Error initializing "${name}":`, e);
      this.current = null;
      this.currentName = null;
      throw e; // Let caller handle
    }
  }

  update(dt, cmd) {
    if (this.current && typeof this.current.update === 'function') {
      this.current.update(dt, cmd);
    }
  }
}
