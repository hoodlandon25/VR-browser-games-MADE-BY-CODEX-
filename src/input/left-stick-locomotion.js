AFRAME.registerComponent("left-stick-locomotion", {
  schema: {
    hand: { type: "string", default: "left-hand" },
    camera: { type: "string", default: "head" },
    speed: { default: 2.2 },
    deadzone: { default: 0.15 }
  },

  init() {
    this.handEl = null;
    this.cameraEl = null;
    this.axis = { x: 0, y: 0 };
    this.move = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();

    this.onThumbstickMoved = (event) => {
      const detail = event.detail || {};
      this.axis.x = detail.x || 0;
      this.axis.y = detail.y || 0;
    };

    this.onThumbstickEnded = () => {
      this.axis.x = 0;
      this.axis.y = 0;
    };

    this.resolveTargets = this.resolveTargets.bind(this);
    this.el.sceneEl?.addEventListener("loaded", this.resolveTargets);
    this.resolveTargets();
  },

  play() {
    this.resolveTargets();
    this.handEl?.addEventListener("thumbstickmoved", this.onThumbstickMoved);
    this.handEl?.addEventListener("thumbstickdown", this.onThumbstickMoved);
    this.handEl?.addEventListener("thumbstickup", this.onThumbstickEnded);
  },

  pause() {
    this.handEl?.removeEventListener("thumbstickmoved", this.onThumbstickMoved);
    this.handEl?.removeEventListener("thumbstickdown", this.onThumbstickMoved);
    this.handEl?.removeEventListener("thumbstickup", this.onThumbstickEnded);
  },

  remove() {
    this.pause();
    this.el.sceneEl?.removeEventListener("loaded", this.resolveTargets);
  },

  resolveTargets() {
    this.handEl = document.getElementById(this.data.hand);
    this.cameraEl = document.getElementById(this.data.camera);
  },

  tick(_, dtMs) {
    if (!this.cameraEl || !this.handEl) {
      return;
    }

    const x = Math.abs(this.axis.x) > this.data.deadzone ? this.axis.x : 0;
    const y = Math.abs(this.axis.y) > this.data.deadzone ? this.axis.y : 0;
    if (!x && !y) {
      return;
    }

    const yaw = this.cameraEl.object3D.rotation.y;
    this.forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    this.move.copy(this.forward).multiplyScalar(-y);
    this.move.addScaledVector(this.right, x);
    if (this.move.lengthSq() > 1) {
      this.move.normalize();
    }

    this.el.object3D.position.addScaledVector(this.move, this.data.speed * (dtMs / 1000));
    this.el.object3D.position.x = THREE.MathUtils.clamp(this.el.object3D.position.x, -0.9, 0.9);
    this.el.object3D.position.z = THREE.MathUtils.clamp(this.el.object3D.position.z, -0.2, 8.8);
  }
});
