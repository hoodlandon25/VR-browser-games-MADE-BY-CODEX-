import { COLORS } from "../config.js";
import { publish, state, subscribe } from "../state.js";

function routeKey() {
  return state.uiRoute.join("/");
}

const SCREEN_WIDTH = 0.34;
const SCREEN_HEIGHT = 0.24;
const HALF_SCREEN_WIDTH = SCREEN_WIDTH / 2;
const HALF_SCREEN_HEIGHT = SCREEN_HEIGHT / 2;
const VISIBLE_SONG_ROWS = 4;

function setRoute(route) {
  state.uiRoute = route;
  state.uiSelection = 0;
}

AFRAME.registerComponent("ui-surface", {
  init() {
    this.screenMesh = null;
    this.touchProbe = new THREE.Vector3();
    this.canvas = document.createElement("canvas");
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;

    this.screen = document.createElement("a-plane");
    this.screen.setAttribute("width", String(SCREEN_WIDTH));
    this.screen.setAttribute("height", String(SCREEN_HEIGHT));
    this.screen.setAttribute("position", "0 0.024 0.031");
    this.screen.setAttribute("class", "ui-hit");
    this.screen.setAttribute("material", "shader: flat; transparent: true; opacity: 0.42; side: double");
    this.el.appendChild(this.screen);

    this.screen.addEventListener("loaded", () => {
      this.screenMesh = this.screen.getObject3D("mesh");
      this.screenMesh.material.map = this.texture;
      this.screenMesh.material.needsUpdate = true;
      this.applyScreenMaterial();
    });

    this.handlePointer = this.handlePointer.bind(this);
    subscribe("ui:pointer", this.handlePointer);
    subscribe("ui:touch", this.handlePointer);
    subscribe("ui:move", ({ delta }) => this.moveSelection(delta));
    subscribe("ui:confirm", () => this.confirmSelection());
    subscribe("ui:back", () => this.goBack());
    subscribe("playlist:changed", () => this.draw());
    subscribe("audio:analysis", () => this.draw());

    this.draw();
  },

  setVisible(visible) {
    state.uiVisible = visible;
    if (!visible) {
      setRoute(["menu"]);
      state.songScrollOffset = 0;
    } else {
      state.uiSelection = 0;
    }
    this.applyScreenMaterial();
    this.draw();
  },

  applyScreenMaterial() {
    if (!this.screenMesh) {
      return;
    }
    this.screenMesh.material.transparent = true;
    this.screenMesh.material.opacity = state.uiVisible ? 1 : 0.42;
    this.screenMesh.material.side = THREE.DoubleSide;
    this.screenMesh.material.color.set(state.uiVisible ? "#ffffff" : "#d0d5b8");
    this.screenMesh.material.needsUpdate = true;
  },

  handlePointer({ intersection, hand, x, y }) {
    if (!state.uiVisible || state.handStates[hand] !== "point") {
      return;
    }

    if (typeof x === "number" && typeof y === "number") {
      this.activateAt(x, y);
      return;
    }

    const uv = intersection?.uv;
    if (!uv) {
      return;
    }
    this.activateAt(uv.x * this.canvas.width, (1 - uv.y) * this.canvas.height);
  },

  getTouchPoint(worldPoint) {
    if (!this.screenMesh || !state.uiVisible) {
      return null;
    }

    this.touchProbe.copy(worldPoint);
    this.screen.object3D.worldToLocal(this.touchProbe);

    if (this.touchProbe.z < -0.004 || this.touchProbe.z > 0.014) {
      return null;
    }
    if (
      this.touchProbe.x < -HALF_SCREEN_WIDTH ||
      this.touchProbe.x > HALF_SCREEN_WIDTH ||
      this.touchProbe.y < -HALF_SCREEN_HEIGHT ||
      this.touchProbe.y > HALF_SCREEN_HEIGHT
    ) {
      return null;
    }

    return {
      x: ((this.touchProbe.x + HALF_SCREEN_WIDTH) / (HALF_SCREEN_WIDTH * 2)) * this.canvas.width,
      y: ((HALF_SCREEN_HEIGHT - this.touchProbe.y) / (HALF_SCREEN_HEIGHT * 2)) * this.canvas.height
    };
  },

  activateAt(x, y) {
    const currentRoute = routeKey();
    if (currentRoute === "menu") {
      if (y > 72 && y < 118) {
        setRoute(["songs"]);
      } else if (y > 128 && y < 174) {
        setRoute(["files"]);
      }
    } else if (currentRoute === "songs") {
      if (y > 70 && y < 98) {
        state.songScrollOffset = Math.max(0, state.songScrollOffset - 1);
      } else if (y > 202 && y < 230) {
        state.songScrollOffset = Math.min(
          Math.max(0, state.songs.length - VISIBLE_SONG_ROWS),
          state.songScrollOffset + 1
        );
      } else {
        const listStart = 112;
        const rowHeight = 24;
        const localIndex = Math.floor((y - listStart) / rowHeight);
        const index = state.songScrollOffset + localIndex;
        if (localIndex >= 0 && localIndex < VISIBLE_SONG_ROWS && index < state.songs.length) {
          publish("ui:play-song", { index });
        } else if (y > 238) {
          setRoute(["menu"]);
        }
      }
    } else if (currentRoute === "files") {
      if (y > 88 && y < 134) {
        publish("ui:trigger-upload");
      } else if (y > 144 && y < 190) {
        setRoute(["files", "advanced"]);
      } else if (y > 238) {
        setRoute(["menu"]);
      }
    } else if (currentRoute === "files/advanced") {
      if (y > 136 && y < 184) {
        setRoute(["files", "advanced", "unknown"]);
      } else if (y > 238) {
        setRoute(["menu"]);
      }
    } else if (currentRoute === "files/advanced/unknown") {
      if (y > 164 && y < 212) {
        state.hiddenMode = !state.hiddenMode;
        publish("hidden-mode:toggled", state.hiddenMode);
      } else if (y > 238) {
        setRoute(["menu"]);
      }
    }
    this.draw();
  },

  getSelectionCount() {
    const route = routeKey();
    if (route === "menu") {
      return 2;
    }
    if (route === "songs") {
      return Math.min(VISIBLE_SONG_ROWS, state.songs.length - state.songScrollOffset) + 3;
    }
    if (route === "files") {
      return 3;
    }
    if (route === "files/advanced") {
      return 2;
    }
    if (route === "files/advanced/unknown") {
      return 2;
    }
    return 0;
  },

  moveSelection(delta) {
    if (!state.uiVisible) {
      return;
    }
    const count = this.getSelectionCount();
    if (!count) {
      return;
    }
    state.uiSelection = THREE.MathUtils.clamp(state.uiSelection + delta, 0, count - 1);
    this.draw();
  },

  confirmSelection() {
    if (!state.uiVisible) {
      return;
    }
    const route = routeKey();
    const selected = state.uiSelection;
    if (route === "menu") {
      setRoute(selected === 0 ? ["songs"] : ["files"]);
    } else if (route === "songs") {
      const visibleCount = Math.min(VISIBLE_SONG_ROWS, state.songs.length - state.songScrollOffset);
      if (selected === 0) {
        state.songScrollOffset = Math.max(0, state.songScrollOffset - 1);
      } else if (selected <= visibleCount) {
        publish("ui:play-song", { index: state.songScrollOffset + selected - 1 });
      } else if (selected === visibleCount + 1) {
        state.songScrollOffset = Math.min(Math.max(0, state.songs.length - VISIBLE_SONG_ROWS), state.songScrollOffset + 1);
      } else {
        setRoute(["menu"]);
      }
    } else if (route === "files") {
      if (selected === 0) {
        publish("ui:trigger-upload");
      } else if (selected === 1) {
        setRoute(["files", "advanced"]);
      } else {
        setRoute(["menu"]);
      }
    } else if (route === "files/advanced") {
      if (selected === 0) {
        setRoute(["files", "advanced", "unknown"]);
      } else {
        setRoute(["menu"]);
      }
    } else if (route === "files/advanced/unknown") {
      if (selected === 0) {
        state.hiddenMode = !state.hiddenMode;
        publish("hidden-mode:toggled", state.hiddenMode);
      } else {
        setRoute(["menu"]);
      }
    }
    this.draw();
  },

  goBack() {
    if (!state.uiVisible) {
      return;
    }
    const route = routeKey();
    if (route === "menu") {
      return;
    }
    if (route === "songs" || route === "files") {
      setRoute(["menu"]);
    } else if (route === "files/advanced") {
      setRoute(["files"]);
    } else if (route === "files/advanced/unknown") {
      setRoute(["files", "advanced"]);
    }
    this.draw();
  },

  draw() {
    const ctx = this.ctx;
    const analysis = state.analysis;
    const screenGradient = ctx.createLinearGradient(0, 0, 0, 256);
    screenGradient.addColorStop(0, "#1b2217");
    screenGradient.addColorStop(0.45, COLORS.uiBg);
    screenGradient.addColorStop(1, "#091008");
    ctx.fillStyle = screenGradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = state.hiddenMode ? "rgba(140,20,18,0.18)" : "rgba(190,197,140,0.06)";
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 2, 256);
    }

    ctx.fillStyle = "rgba(10, 14, 10, 0.45)";
    ctx.fillRect(10, 10, 236, 236);
    ctx.strokeStyle = state.hiddenMode ? COLORS.uiDanger : COLORS.uiAccent;
    ctx.strokeRect(6, 6, 244, 244);
    ctx.strokeStyle = "rgba(245, 247, 219, 0.15)";
    ctx.strokeRect(10, 10, 236, 236);
    ctx.font = "16px monospace";
    ctx.fillStyle = COLORS.uiText;
    ctx.fillText("MZ-01 WALKMAN", 18, 28);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(18, 34, 220, 2);

    if (state.hiddenMode && Math.random() < 0.12) {
      ctx.fillStyle = COLORS.uiDanger;
      ctx.fillText("[]", 210, 28);
    } else if (state.hiddenMode) {
      ctx.fillStyle = COLORS.uiDanger;
      ctx.fillText("H", 220, 28);
    }

    const route = routeKey();
    if (route === "menu") {
      this.drawButton(18, 72, 220, 40, "SONGS", state.uiSelection === 0);
      this.drawButton(18, 126, 220, 40, "FILES / SYSTEM", state.uiSelection === 1);
    }

    if (route === "songs") {
      ctx.fillText("PLAYLIST", 18, 58);
      const visibleCount = Math.min(VISIBLE_SONG_ROWS, state.songs.length - state.songScrollOffset);
      this.drawButton(18, 70, 220, 24, "SCROLL UP", state.uiSelection === 0);
      const visibleSongs = state.songs.slice(state.songScrollOffset, state.songScrollOffset + VISIBLE_SONG_ROWS);
      visibleSongs.forEach((song, localIndex) => {
        const index = state.songScrollOffset + localIndex;
        const y = 124 + localIndex * 24;
        const active = index === state.currentSongIndex;
        const selected = state.uiSelection === localIndex + 1;
        ctx.fillStyle = selected ? "rgba(212, 232, 146, 0.28)" : active ? "rgba(161,191,95,0.22)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(18, y - 16, 220, 22);
        ctx.fillStyle = selected || active ? COLORS.uiAccent : COLORS.uiText;
        ctx.fillText(song.title.slice(0, 22), 24, y);
        ctx.fillStyle = "#8a8f72";
        ctx.font = "10px monospace";
        ctx.fillText((song.album || "Library").slice(0, 26), 24, y + 11);
        ctx.font = "16px monospace";
      });
      this.drawButton(18, 202, 220, 24, "SCROLL DOWN", state.uiSelection === visibleCount + 1);
      this.drawBack(238, state.uiSelection === visibleCount + 2);
    }

    if (route === "files") {
      ctx.fillText("FILES / SYSTEM", 18, 58);
      this.drawButton(18, 88, 220, 40, "UPLOAD SONG", state.uiSelection === 0);
      this.drawButton(18, 142, 220, 40, "ADVANCED", state.uiSelection === 1);
      this.drawBack(238, state.uiSelection === 2);
    }

    if (route === "files/advanced") {
      ctx.fillText("ADVANCED", 18, 58);
      this.drawButton(18, 136, 220, 42, "UNKNOWN", state.uiSelection === 0);
      this.drawBack(238, state.uiSelection === 1);
    }

    if (route === "files/advanced/unknown") {
      ctx.fillStyle = "#c4c1a6";
      ctx.fillText("UNKNOWN", 18, 58);
      this.drawButton(
        18,
        164,
        220,
        42,
        `VISUALIZER MODE: ${state.hiddenMode ? "HUMAN" : "OFF"}`,
        state.uiSelection === 0
      );
      this.drawBack(238, state.uiSelection === 1);
    }

    this.drawVisualizer(148, 188, 90, 32, analysis);
    this.drawControlHint();
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "12px monospace";
    ctx.fillText(state.isPlaying ? "PLAYING" : "IDLE", 150, 180);
    if (!state.uiVisible) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(16, 100, 224, 54);
      ctx.strokeStyle = "rgba(161,191,95,0.38)";
      ctx.strokeRect(16, 100, 224, 54);
      ctx.fillStyle = COLORS.uiText;
      ctx.fillText("GRAB PLAYER", 68, 124);
      ctx.font = "12px monospace";
      ctx.fillText("FIST HAND TO USE", 60, 142);
    }
    ctx.font = "16px monospace";
    this.texture.needsUpdate = true;
  },

  drawButton(x, y, w, h, label, selected = false) {
    const buttonGradient = this.ctx.createLinearGradient(0, y, 0, y + h);
    buttonGradient.addColorStop(0, selected ? "rgba(224, 242, 156, 0.26)" : "rgba(236, 230, 188, 0.14)");
    buttonGradient.addColorStop(1, selected ? "rgba(116, 138, 52, 0.28)" : "rgba(70, 88, 44, 0.12)");
    this.ctx.fillStyle = buttonGradient;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = selected ? "rgba(214, 236, 144, 0.95)" : "rgba(161,191,95,0.55)";
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = selected ? COLORS.uiAccent : COLORS.uiText;
    this.ctx.fillText(label, x + 10, y + Math.floor(h * 0.65));
  },

  drawBack(y = 218, selected = false) {
    this.drawButton(18, y, 220, 14, "BACK", selected);
  },

  drawVisualizer(x, y, w, h, analysis) {
    this.ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 12; i += 1) {
      const value = analysis.amplitude * 0.35 + (i % 3 === 0 ? analysis.bass : i % 2 === 0 ? analysis.mids : analysis.treble);
      const barHeight = Math.max(2, value * h);
      this.ctx.fillStyle = state.hiddenMode ? "#d77975" : "#a1bf5f";
      this.ctx.fillRect(x + i * 11, y + h - barHeight, 8, barHeight);
    }
    this.ctx.strokeStyle = "rgba(255,255,255,0.12)";
    this.ctx.strokeRect(x, y, w, h);
  },

  drawControlHint() {
    if (!state.uiVisible) {
      return;
    }
    this.ctx.fillStyle = "rgba(210, 229, 164, 0.16)";
    this.ctx.fillRect(18, 42, 154, 14);
    this.ctx.fillStyle = "#d6e5b4";
    this.ctx.font = "10px monospace";
    this.ctx.fillText("R STICK / A SELECT / B BACK", 22, 52);
    this.ctx.font = "16px monospace";
  }
});
