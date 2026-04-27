import { COLORS } from "../config.js";
import { publish, state, subscribe } from "../state.js";

function routeKey() {
  return state.uiRoute.join("/");
}

const VISIBLE_SONG_ROWS = 5;

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
    this.screen.setAttribute("position", "0 0.02 0.031");
    this.screen.setAttribute("class", "ui-hit");
    this.screen.setAttribute("material", "shader: flat; transparent: true; opacity: 0.42; side: double");
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
    state.uiVisible = visible;
    this.screen.setAttribute("material", `shader: flat; transparent: true; opacity: ${visible ? 1 : 0.42}; side: double`);
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
      if (y > 66 && y < 90) {
        state.songScrollOffset = Math.max(0, state.songScrollOffset - 1);
      } else if (y > 214 && y < 238) {
        state.songScrollOffset = Math.min(
          Math.max(0, state.songs.length - VISIBLE_SONG_ROWS),
          state.songScrollOffset + 1
        );
      } else {
        const listStart = 100;
        const rowHeight = 22;
        const localIndex = Math.floor((y - listStart) / rowHeight);
        const index = state.songScrollOffset + localIndex;
        if (localIndex >= 0 && localIndex < VISIBLE_SONG_ROWS && index < state.songs.length) {
          publish("ui:play-song", { index });
        } else if (y > 238) {
          state.uiRoute = ["menu"];
        }
      }
    } else if (currentRoute === "files") {
      if (y > 90 && y < 128) {
        publish("ui:trigger-upload");
      } else if (y > 140 && y < 178) {
        state.uiRoute = ["files", "advanced"];
      } else if (y > 238) {
        state.uiRoute = ["menu"];
      }
    } else if (currentRoute === "files/advanced") {
      if (y > 126 && y < 164) {
        state.uiRoute = ["files", "advanced", "unknown"];
      } else if (y > 238) {
        state.uiRoute = ["menu"];
      }
    } else if (currentRoute === "files/advanced/unknown") {
      if (y > 168 && y < 206) {
        state.hiddenMode = !state.hiddenMode;
        publish("hidden-mode:toggled", state.hiddenMode);
      } else if (y > 238) {
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
      this.drawButton(18, 66, 220, 20, "SCROLL UP");
      const visibleSongs = state.songs.slice(state.songScrollOffset, state.songScrollOffset + VISIBLE_SONG_ROWS);
      visibleSongs.forEach((song, localIndex) => {
        const index = state.songScrollOffset + localIndex;
        const y = 112 + localIndex * 22;
        const active = index === state.currentSongIndex;
        ctx.fillStyle = active ? "rgba(161,191,95,0.22)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(18, y - 14, 220, 18);
        ctx.fillStyle = active ? COLORS.uiAccent : COLORS.uiText;
        ctx.fillText(song.title.slice(0, 22), 24, y);
        ctx.fillStyle = "#8a8f72";
        ctx.font = "10px monospace";
        ctx.fillText((song.album || "Library").slice(0, 26), 24, y + 10);
        ctx.font = "16px monospace";
      });
      this.drawButton(18, 214, 220, 20, "SCROLL DOWN");
      this.drawBack(238);
    }

    if (route === "files") {
      ctx.fillText("FILES / SYSTEM", 18, 52);
      this.drawButton(18, 90, 220, 32, "UPLOAD SONG");
      this.drawButton(18, 140, 220, 32, "ADVANCED");
      this.drawBack(238);
    }

    if (route === "files/advanced") {
      ctx.fillText("ADVANCED", 18, 52);
      this.drawButton(18, 126, 220, 32, "UNKNOWN");
      this.drawBack(238);
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
      this.drawBack(238);
    }

    this.drawVisualizer(146, 194, 92, 38, analysis);
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "12px monospace";
    ctx.fillText(state.isPlaying ? "PLAYING" : "IDLE", 148, 188);
    if (!state.uiVisible) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(16, 98, 224, 54);
      ctx.strokeStyle = "rgba(161,191,95,0.38)";
      ctx.strokeRect(16, 98, 224, 54);
      ctx.fillStyle = COLORS.uiText;
      ctx.fillText("GRAB PLAYER", 68, 121);
      ctx.font = "12px monospace";
      ctx.fillText("FIST HAND TO USE", 60, 139);
    }
    ctx.font = "16px monospace";
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

  drawBack(y = 218) {
    this.drawButton(18, y, 220, 14, "BACK");
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
