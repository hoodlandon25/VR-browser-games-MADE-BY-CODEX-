import { AUDIO_ANALYSIS } from "../config.js";
import { loadSongLibrary } from "./library-loader.js";
import { publish, state } from "../state.js";

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.gainNode = null;
    this.audioEl = null;
    this.data = null;
    this.lastBeatAt = 0;
    this.pendingUploadUrl = null;
  }

  async init() {
    if (this.ctx) {
      return;
    }

    this.audioEl = new Audio();
    this.audioEl.crossOrigin = "anonymous";
    this.audioEl.loop = false;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = AUDIO_ANALYSIS.fftSize;
    this.analyser.smoothingTimeConstant = AUDIO_ANALYSIS.smoothing;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.9;

    const source = this.ctx.createMediaElementSource(this.audioEl);
    source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.audioEl.addEventListener("play", () => {
      state.isPlaying = true;
      publish("audio:play");
    });

    this.audioEl.addEventListener("pause", () => {
      state.isPlaying = false;
      publish("audio:pause");
    });

    this.audioEl.addEventListener("ended", () => {
      state.isPlaying = false;
      publish("audio:ended");
    });

    if (!state.songs.length) {
      try {
        state.songs = await loadSongLibrary();
      } catch {
        state.songs = [];
      }
      publish("playlist:changed", { index: state.currentSongIndex, song: state.songs[0] || null });
    }
  }

  async ensureResumed() {
    await this.init();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  async playSong(index) {
    await this.ensureResumed();
    state.currentSongIndex = Math.max(0, Math.min(index, state.songs.length - 1));
    const song = state.songs[state.currentSongIndex];
    if (!song) {
      return;
    }
    this.audioEl.src = song.src;
    this.audioEl.dataset.title = song.title;
    await this.audioEl.play();
    publish("playlist:changed", { index: state.currentSongIndex, song });
  }

  async togglePlayback() {
    await this.ensureResumed();
    if (!this.audioEl.src && state.songs.length) {
      return this.playSong(state.currentSongIndex);
    }
    if (this.audioEl.paused) {
      await this.audioEl.play();
    } else {
      this.audioEl.pause();
    }
  }

  nextSong() {
    if (!state.songs.length) {
      return;
    }
    const nextIndex = (state.currentSongIndex + 1) % state.songs.length;
    this.playSong(nextIndex);
  }

  addUploadedSong(file) {
    if (!file) {
      return;
    }
    if (this.pendingUploadUrl) {
      URL.revokeObjectURL(this.pendingUploadUrl);
    }
    this.pendingUploadUrl = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, "");
    state.songs.push({ title, album: "Uploads", src: this.pendingUploadUrl, uploaded: true });
    publish("playlist:changed", { index: state.songs.length - 1, song: state.songs.at(-1) });
  }

  updateAnalysis() {
    if (!this.analyser || !state.isPlaying) {
      state.analysis = {
        amplitude: 0,
        bass: 0,
        mids: 0,
        treble: 0,
        beat: false
      };
      publish("audio:analysis", state.analysis);
      return state.analysis;
    }

    this.analyser.getByteFrequencyData(this.data);
    const bassRange = this.averageRange(0, 10);
    const midsRange = this.averageRange(10, 36);
    const trebRange = this.averageRange(36, this.data.length);
    const amplitude = (bassRange + midsRange + trebRange) / 3;
    const now = performance.now();
    const beat = amplitude > AUDIO_ANALYSIS.beatThreshold && now - this.lastBeatAt > AUDIO_ANALYSIS.beatHoldMs;

    if (beat) {
      this.lastBeatAt = now;
    }

    state.analysis = {
      amplitude,
      bass: bassRange,
      mids: midsRange,
      treble: trebRange,
      beat
    };
    publish("audio:analysis", state.analysis);
    return state.analysis;
  }

  averageRange(start, end) {
    let total = 0;
    const sliceEnd = Math.max(start + 1, end);
    for (let i = start; i < sliceEnd; i += 1) {
      total += this.data[i] / 255;
    }
    return total / (sliceEnd - start);
  }
}
