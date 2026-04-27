import { subscribe, state } from "../state.js";

AFRAME.registerComponent("npc-controller", {
  init() {
    this.time = 0;
    this.lastBeatPunch = 0;
    this.returnTimer = 0;
    this.hiddenIndicator = false;

    this.root = new THREE.Group();
    this.el.setObject3D("mesh", this.root);
    this.buildNpc();

    subscribe("audio:pause", () => {
      this.returnTimer = 1.4;
      this.lastBeatPunch = 0.45;
    });
  },

  buildNpc() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x7a7d66, flatShading: true });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x444734, flatShading: true });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.22), bodyMat);
    torso.position.set(0, 1.15, 0);
    this.root.add(torso);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.18), darkMat);
    pelvis.position.set(0, 0.64, 0);
    this.root.add(pelvis);

    this.headPivot = new THREE.Object3D();
    this.headPivot.position.set(0, 1.58, 0.02);
    this.root.add(this.headPivot);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.24), bodyMat);
    head.position.set(0, 0, 0);
    this.headPivot.add(head);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), darkMat);
    eyeL.position.set(-0.05, 0.03, 0.125);
    head.add(eyeL);

    const eyeR = eyeL.clone();
    eyeR.position.x = 0.05;
    head.add(eyeR);

    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 0.12), darkMat);
    this.armL.position.set(-0.32, 1.1, 0);
    this.root.add(this.armL);

    this.armR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 0.12), darkMat);
    this.armR.position.set(0.32, 1.1, 0);
    this.root.add(this.armR);

    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.14), darkMat);
    this.legL.position.set(-0.1, 0.22, 0);
    this.root.add(this.legL);

    this.legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.14), darkMat);
    this.legR.position.set(0.1, 0.22, 0);
    this.root.add(this.legR);
  },

  tick(_, dtMs) {
    const dt = dtMs / 1000;
    this.time += dt;

    const analysis = state.analysis;
    const head = document.getElementById("head")?.object3D;
    const distance = head ? this.el.object3D.position.distanceTo(head.getWorldPosition(new THREE.Vector3())) : 4;
    const proximity = THREE.MathUtils.clamp(1.45 - distance / 4.8, 0.15, 1);
    const active = state.hiddenMode && state.isPlaying;
    const intensity = THREE.MathUtils.clamp((analysis.amplitude * 0.65 + analysis.bass * 0.35) * proximity, 0, 1);

    if (analysis.beat && active) {
      this.lastBeatPunch = 0.16 + intensity * 0.28;
      if (Math.random() < 0.38 + intensity * 0.25) {
        this.root.position.x = (Math.random() - 0.5) * 0.15 * (0.2 + intensity);
        this.root.position.z = (Math.random() - 0.5) * 0.1 * intensity;
      }
    }

    if (this.lastBeatPunch > 0) {
      this.lastBeatPunch -= dt;
    }

    if (this.returnTimer > 0) {
      this.returnTimer -= dt;
    }

    if (!active) {
      const breathe = Math.sin(this.time * 1.2) * 0.02;
      this.root.position.y = breathe;
      this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, 0, 0.05);
      this.headPivot.rotation.y = THREE.MathUtils.lerp(this.headPivot.rotation.y, 0.2, 0.03);
      this.headPivot.rotation.x = THREE.MathUtils.lerp(this.headPivot.rotation.x, -0.04, 0.03);
      this.armL.rotation.z = THREE.MathUtils.lerp(this.armL.rotation.z, 0.05, 0.04);
      this.armR.rotation.z = THREE.MathUtils.lerp(this.armR.rotation.z, -0.05, 0.04);

      if (this.returnTimer > 0) {
        this.headPivot.rotation.y = THREE.MathUtils.lerp(this.headPivot.rotation.y, -0.55, 0.06);
      }
      return;
    }

    const sway = Math.sin(this.time * (1.2 + intensity * 4.2)) * (0.04 + intensity * 0.18);
    const headTurn = Math.sin(this.time * (0.7 + analysis.mids * 4)) * (0.18 + intensity * 0.75);
    const armSnap = Math.sin(this.time * (3.4 + analysis.treble * 12)) * intensity * 0.55;
    const skip = intensity > 0.7 && Math.floor(this.time * 12) % 6 === 0;

    if (!skip) {
      this.root.position.y = sway * 0.35;
      this.root.rotation.y = sway * 0.55;
      this.armL.rotation.z = -0.2 + armSnap;
      this.armR.rotation.z = 0.2 - armSnap;
      this.legL.rotation.x = -sway * 1.1;
      this.legR.rotation.x = sway * 1.1;
    }

    this.headPivot.rotation.x = -0.08 - analysis.bass * 0.32;
    this.headPivot.rotation.y = headTurn;

    if (analysis.beat) {
      this.headPivot.rotation.y = (Math.random() < 0.5 ? -1 : 1) * (0.5 + intensity * 0.7);
      this.headPivot.rotation.x = -0.25 - intensity * 0.35;

      if (head && Math.random() < 0.42) {
        const target = head.getWorldPosition(new THREE.Vector3());
        const dir = target.sub(this.headPivot.getWorldPosition(new THREE.Vector3()));
        const yaw = Math.atan2(dir.x, dir.z);
        this.root.rotation.y = yaw;
      }
    }

    if (this.lastBeatPunch > 0 && intensity > 0.55) {
      this.root.position.x += (Math.random() - 0.5) * 0.016;
      this.root.position.y += (Math.random() - 0.5) * 0.028;
    }
  }
});
