import { COLORS } from "../config.js";

AFRAME.registerComponent("psx-post", {
  init() {
    const sceneEl = this.el;
    sceneEl.object3D.fog = new THREE.Fog(COLORS.fog, 1.7, 11);
    sceneEl.renderer.setClearColor(new THREE.Color("#050704"));
    sceneEl.renderer.xr.setFramebufferScaleFactor(0.9);
    sceneEl.renderer.domElement.style.imageRendering = "pixelated";

    sceneEl.addEventListener("render-target-loaded", () => {
      sceneEl.renderer.outputColorSpace = THREE.SRGBColorSpace;
    });

    this.noisePlane = null;
    sceneEl.addEventListener("enter-vr", () => this.attachNoise());
  },

  attachNoise() {
    if (this.noisePlane || !document.getElementById("head")) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.13,
      depthWrite: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat);
    plane.position.set(0, 0, -0.45);
    document.getElementById("head").object3D.add(plane);
    this.noisePlane = { ctx, canvas, texture };
  },

  tick() {
    if (!this.noisePlane) {
      return;
    }
    const { ctx, canvas, texture } = this.noisePlane;
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const shade = 80 + Math.random() * 70;
      imageData.data[i] = shade * 0.9;
      imageData.data[i + 1] = shade;
      imageData.data[i + 2] = shade * 0.72;
      imageData.data[i + 3] = 18;
    }
    ctx.putImageData(imageData, 0, 0);
    texture.needsUpdate = true;
  }
});
