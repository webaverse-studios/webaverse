import * as THREE from 'three';

export class SkyManager extends EventTarget {
  constructor({
    lightingManager,
  }) {
    super();

    this.lightingManager = lightingManager;

    const light = new THREE.DirectionalLight();
    this.skyLight = light;
  }

  initSkyLight() {
    const DIR_LIGHT_SHADOW_PARAMS = [100, 4096, 0.1, 100, -0.005, 0.2];
    
    this.lightingManager.addLight(
      this.skyLight,
      'directional',
      DIR_LIGHT_SHADOW_PARAMS,
      [0, 0, 0]
    );
  }

  getSkyLight() {
    return this.skyLight;
  }

  setSkyLightPosition(position) {
    this.skyLight.position.copy(position);
    this.skyLight.updateMatrixWorld();
  }

  setSkyLightColor(color) {
    this.skyLight.color.set(color);
  }

  setSkyLightIntensity(intensity) {
    this.skyLight.intensity = intensity;
  }
}