import { AudioManager } from "./audio/audio-manager.js";
import "./input/vr-hand-controls.js";
import "./input/strict-hand-state.js";
import "./npc/npc-controller.js";
import "./rendering/psx-post.js";
import "./ui/ui-surface.js";
import "./world/world-builder.js";
import { publish, state, subscribe } from "./state.js";

const scene = document.querySelector("a-scene");
const enterButton = document.getElementById("enter-vr");
const uploadInput = document.getElementById("song-upload");
const overlay = document.getElementById("boot-overlay");
const statusCopy = document.getElementById("status-copy");
const mp3Entity = document.getElementById("mp3-player");
const audio = new AudioManager();
const pointerTimers = new Map();

AFRAME.registerComponent("mp3-player", {
  init() {
    this.grabbedBy = null;
    this.returnAnchor = new THREE.Vector3(0.28, 1.02, -3.45);
    this.target = new THREE.Vector3();
    this.temp = new THREE.Vector3();
    this.screenOffset = new THREE.Vector3(0, -0.08, -0.46);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.28, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x717767, flatShading: true })
    );
    body.position.set(0, 0, 0);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.025, 0.01),
      new THREE.MeshLambertMaterial({ color: 0xbcb692, flatShading: true })
    );
    top.position.set(0, 0.12, 0.035);
    body.add(top);

    const sideButton = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.08, 0.012),
      new THREE.MeshLambertMaterial({ color: 0x2d2f24, flatShading: true })
    );
    sideButton.position.set(0.095, 0.02, 0.02);
    body.add(sideButton);

    this.el.setObject3D("mesh", body);
    this.el.sceneEl.addEventListener("loaded", () => this.syncUiVisibility());

    subscribe("hand:state", ({ hand, state: handState, grabber }) => {
      if (handState !== "fist") {
        if (this.grabbedBy === hand) {
          this.grabbedBy = null;
          this.syncUiVisibility();
        }
        return;
      }

      const grabberPos = grabber.getWorldPosition(new THREE.Vector3());
      const mp3Pos = this.el.object3D.getWorldPosition(new THREE.Vector3());
      if (!this.grabbedBy && grabberPos.distanceTo(mp3Pos) < 0.2) {
        this.grabbedBy = hand;
        this.syncUiVisibility();
      }
    });
  },

  syncUiVisibility() {
    const surface = this.el.components["ui-surface"];
    surface?.setVisible(Boolean(this.grabbedBy));
  },

  tick(_, dtMs) {
    const dt = dtMs / 1000;
    if (this.grabbedBy) {
      const head = document.getElementById("head").object3D;
      this.target.copy(this.screenOffset);
      head.localToWorld(this.target);
      this.el.object3D.position.lerp(this.target, 1 - Math.pow(0.0008, dt));
      this.el.object3D.lookAt(head.getWorldPosition(this.temp));
    } else {
      this.el.object3D.position.lerp(this.returnAnchor, 1 - Math.pow(0.008, dt));
      this.el.object3D.rotation.x = THREE.MathUtils.lerp(this.el.object3D.rotation.x, 0, 0.06);
      this.el.object3D.rotation.y = THREE.MathUtils.lerp(this.el.object3D.rotation.y, 0.2, 0.06);
    }
  }
});

function setStatus(text) {
  statusCopy.textContent = text;
}

function initUiActions() {
  subscribe("ui:play-song", ({ index }) => audio.playSong(index));
  subscribe("ui:trigger-upload", () => uploadInput.click());
}

function wireUiSurface() {
  scene.addEventListener("loaded", () => {
    const surface = mp3Entity.components["ui-surface"];
    if (!surface) {
      return;
    }
    subscribe("hidden-mode:toggled", () => surface.draw());
  });
}

async function startVrSession() {
  const supported = navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr"));
  if (!supported) {
    setStatus("Immersive VR is unavailable in this browser.");
    return;
  }

  await audio.init();
  scene.enterVR();
}

function registerSceneLifecycle() {
  scene.addEventListener("enter-vr", async () => {
    state.xrActive = true;
    overlay.classList.add("hidden");
    await audio.ensureResumed();
    setStatus("VR session active.");
  });

  scene.addEventListener("exit-vr", () => {
    state.xrActive = false;
    overlay.classList.remove("hidden");
    setStatus("VR exited. Re-enter to continue.");
  });

  scene.addEventListener("loaded", () => {
    setStatus("Scene ready. Enter VR to begin.");
  });
}

function animate() {
  audio.updateAnalysis();

  document.querySelectorAll("[strict-hand-state]").forEach((handEl) => {
    const handState = handEl.components["strict-hand-state"];
    if (!handState) {
      return;
    }
    const intersections = handState.ray.components.raycaster?.intersections || [];
    const key = handState.data.hand;
    const current = pointerTimers.get(key) || { target: null, started: 0 };
    const activeTarget = state.handStates[key] === "point" && intersections[0]?.object?.el?.classList?.contains("ui-hit")
      ? intersections[0]
      : null;

    if (!activeTarget) {
      pointerTimers.set(key, { target: null, started: 0 });
      return;
    }

    const targetUuid = activeTarget.object.uuid;
    if (current.target !== targetUuid) {
      pointerTimers.set(key, { target: targetUuid, started: performance.now() });
      return;
    }

    if (performance.now() - current.started > 420) {
      publish("ui:pointer", { intersection: activeTarget, hand: key });
      pointerTimers.set(key, { target: null, started: 0 });
    }
  });

  requestAnimationFrame(animate);
}

enterButton.addEventListener("click", startVrSession);
uploadInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  audio.addUploadedSong(file);
});

initUiActions();
wireUiSurface();
registerSceneLifecycle();
animate();
