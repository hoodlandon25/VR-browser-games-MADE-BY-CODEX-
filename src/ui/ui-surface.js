import { COLORS } from "../config.js";
import { publish, state, subscribe } from "../state.js";

function routeKey() {
  return state.uiRoute.join("/");
}

AFRAME.registerComponent("ui-surface", {
  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;

    this.screen = document.createElement("a-plane");
    this.screen.setAttribute("width", "0.28");
    this.screen.setAttribute("height", "0.28");
    this.screen.setAttribute("position", "0 0.03 0.038");
    this.screen.setAttribute("class", "ui-hit");
    this.screen.setAttribute("material", "shader: flat; transparent: false");
    this.screen.object3D.visible = false;
    this.el.appendChild(this.screen);

    this.screen.addEventListener("loaded", () => {
      this.screen.getObject3D("mesh").material.map = this.texture;
      this.screen.getObject3D("mesh").material.needsUpdate = true;
    });

    this.handlePointer = this.handlePointer.bind(this);
    subscribe("ui:pointer", this.handlePointer);
    subscribe("playlist:changed", () => this.draw());
    subscribe("audio:analysis", () => this.draw());

    this.draw();
  },

  setVisible(visible) {
    this.screen.object3D.visible = visible;
    state.uiVisible = visible;
    this.draw();
  },

  handlePointer({ intersection, hand }) {
    if (!state.uiVisible || state.handStates[hand] !== "point") {
      return;
    }

    const uv = intersection.uv;
    if (!uv) {
      return;
    }
    const x = uv.x * this.canvas.width;
    const y = (1 - uv.y) * this.canvas.height;
    this.activateAt(x, y);
  },

  activateAt(x, y) {
    const currentRoute = routeKey();
    if (currentRoute === "menu") {
      if (y > 62 && y < 100) {
        state.uiRoute = ["songs"];
      } else if (y > 104 && y < 142) {
        state.uiRoute = ["files"];
      }
    } else if (currentRoute === "songs") {
      const listStart = 70;
      const rowHeight = 28;
      const index = Math.floor((y - listStart) / rowHeight);
      if (index >= 0 && index < state.songs.length) {
        publish("ui:play-song", { index });
      } else if (y > 218) {
        state.uiRoute = ["menu"];
      }
    } else if (currentRoute === "files") {
      if (y > 90 && y < 128) {
        publish("ui:trigger-upload");
      } else if (y > 140 && y < 178) {
        state.uiRoute = ["files", "advanced"];
      } else if (y > 218) {
        state.uiRoute = ["menu"];
      }
    } else if (currentRoute === "files/advanced") {
      if (y > 126 && y < 164) {
        state.uiRoute = ["files", "advanced", "unknown"];
      } else if (y > 218) {
        state.uiRoute = ["menu"];
      }
    } else if (currentRoute === "files/advanced/unknown") {
      if (y > 168 && y < 206) {
        state.hiddenMode = !state.hiddenMode;
        publish("hidden-mode:toggled", state.hiddenMode);
      } else if (y > 218) {
        state.uiRoute = ["menu"];
      }
    }
    this.draw();
  },

  draw() {
    const ctx = this.ctx;
    const analysis = state.analysis;
    ctx.fillStyle = COLORS.uiBg;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = state.hiddenMode ? "rgba(140,20,18,0.18)" : "rgba(190,197,140,0.06)";
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 2, 256);
    }

    ctx.strokeStyle = state.hiddenMode ? COLORS.uiDanger : COLORS.uiAccent;
    ctx.strokeRect(6, 6, 244, 244);
    ctx.font = "16px monospace";
    ctx.fillStyle = COLORS.uiText;
    ctx.fillText("MZ-01 WALKMAN", 18, 28);

    if (state.hiddenMode && Math.random() < 0.12) {
      ctx.fillStyle = COLORS.uiDanger;
      ctx.fillText("[]", 210, 28);
    } else if (state.hiddenMode) {
      ctx.fillStyle = COLORS.uiDanger;
      ctx.fillText("H", 220, 28);
    }

    const route = routeKey();
    if (route === "menu") {
      this.drawButton(18, 62, 220, 32, "SONGS");
      this.drawButton(18, 104, 220, 32, "FILES / SYSTEM");
    }

    if (route === "songs") {
      ctx.fillText("PLAYLIST", 18, 52);
      state.songs.forEach((song, index) => {
        const y = 80 + index * 28;
        const active = index === state.currentSongIndex;
        ctx.fillStyle = active ? "rgba(161,191,95,0.22)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(18, y - 14, 220, 22);
        ctx.fillStyle = active ? COLORS.uiAccent : COLORS.uiText;
        ctx.fillText(song.title.slice(0, 24), 24, y);
      });
      this.drawBack();
    }

    if (route === "files") {
      ctx.fillText("FILES / SYSTEM", 18, 52);
      this.drawButton(18, 90, 220, 32, "UPLOAD SONG");
      this.drawButton(18, 140, 220, 32, "ADVANCED");
      this.drawBack();
    }

    if (route === "files/advanced") {
      ctx.fillText("ADVANCED", 18, 52);
      this.drawButton(18, 126, 220, 32, "UNKNOWN");
      this.drawBack();
    }

    if (route === "files/advanced/unknown") {
      ctx.fillStyle = "#c4c1a6";
      ctx.fillText("UNKNOWN", 18, 52);
      this.drawButton(
        18,
        168,
        220,
        32,
        `VISUALIZER MODE: ${state.hiddenMode ? "HUMAN" : "OFF"}`
      );
      this.drawBack();
    }

    this.drawVisualizer(22, 198, 140, 34, analysis);
    ctx.fillStyle = COLORS.uiText;
    ctx.fillText(state.isPlaying ? "PLAYING" : "IDLE", 172, 214);
    this.texture.needsUpdate = true;
  },

  drawButton(x, y, w, h, label) {
    this.ctx.fillStyle = "rgba(236, 230, 188, 0.06)";
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = "rgba(161,191,95,0.55)";
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = COLORS.uiText;
    this.ctx.fillText(label, x + 10, y + 22);
  },

  drawBack() {
    this.drawButton(18, 218, 220, 24, "BACK");
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
  }
});
