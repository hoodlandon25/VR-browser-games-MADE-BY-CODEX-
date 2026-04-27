export const SONGS = [
  { title: "corridor_lullaby", src: "./assets/audio/corridor_lullaby.mp3" },
  { title: "glassy_echo", src: "./assets/audio/glassy_echo.mp3" }
];

export const COLORS = {
  fog: "#39402a",
  wall: "#7d775a",
  trim: "#4d4b34",
  floor: "#2c2b24",
  uiBg: "#10130f",
  uiText: "#dad3ae",
  uiAccent: "#a1bf5f",
  uiDanger: "#d77d76"
};

export const AUDIO_ANALYSIS = {
  fftSize: 256,
  smoothing: 0.78,
  beatThreshold: 0.18,
  beatHoldMs: 180
};

export const PLAYER_RULES = {
  point: "grip",
  grab: "grip+trigger"
};
