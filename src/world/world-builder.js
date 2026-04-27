import { COLORS } from "../config.js";

function makeCanvasTexture(width, height, painter) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  painter(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

AFRAME.registerComponent("world-builder", {
  init() {
    const root = this.el.object3D;
    this.el.sceneEl.object3D.fog = new THREE.Fog(COLORS.fog, 1.7, 11);

    const wallpaper = makeCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(74, 73, 54, 0.55)";
      for (let y = 0; y < h; y += 16) {
        ctx.fillRect(0, y, w, 2);
      }
      ctx.fillStyle = "rgba(98, 93, 71, 0.35)";
      for (let x = 0; x < w; x += 24) {
        ctx.fillRect(x, 0, 2, h);
      }
    });
    wallpaper.repeat.set(8, 3);

    const floorTex = makeCanvasTexture(64, 64, (ctx, w, h) => {
      ctx.fillStyle = COLORS.floor;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(90, 86, 71, 0.25)";
      for (let i = 0; i < 14; i += 1) {
        ctx.fillRect((i * 9) % w, 0, 2, h);
      }
    });
    floorTex.repeat.set(10, 18);

    const wallMat = new THREE.MeshLambertMaterial({ map: wallpaper, flatShading: true });
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTex, flatShading: true });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x3b3928, flatShading: true });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 14), floorMat);
    floor.position.set(0, -0.05, -3.8);
    root.add(floor);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 14), trimMat);
    ceiling.position.set(0, 2.35, -3.8);
    root.add(ceiling);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 14), wallMat);
    leftWall.position.set(-1.2, 1.15, -3.8);
    root.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.set(1.2, 1.15, -3.8);
    root.add(rightWall);

    for (let i = 0; i < 6; i += 1) {
      const z = -1.5 - i * 2;
      const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), trimMat);
      lightBox.position.set(i % 2 === 0 ? -1.08 : 1.08, 1.56, z);
      root.add(lightBox);

      const point = new THREE.PointLight(0xb6bc84, 0.35, 2.3, 2);
      point.position.copy(lightBox.position).add(new THREE.Vector3(0, 0, 0.08));
      root.add(point);
    }

    const farLight = new THREE.PointLight(0xd6e5b5, 0.7, 5.2, 2);
    farLight.position.set(0, 1.7, -9.8);
    root.add(farLight);

    const windowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xcddbb0, transparent: true, opacity: 0.55 })
    );
    windowMesh.position.set(0, 1.4, -10.1);
    root.add(windowMesh);

    const ambience = new THREE.AmbientLight(0x6f734e, 0.55);
    root.add(ambience);
  }
});
