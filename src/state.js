const listeners = new Map();

export const state = {
  xrActive: false,
  handStates: {
    left: "open",
    right: "open"
  },
  songs: [],
  currentSongIndex: 0,
  uiRoute: ["menu"],
  uiVisible: false,
  hiddenMode: false,
  isPlaying: false,
  analysis: {
    amplitude: 0,
    bass: 0,
    mids: 0,
    treble: 0,
    beat: false
  }
};

export function subscribe(topic, callback) {
  if (!listeners.has(topic)) {
    listeners.set(topic, new Set());
  }
  listeners.get(topic).add(callback);
  return () => listeners.get(topic)?.delete(callback);
}

export function publish(topic, payload) {
  listeners.get(topic)?.forEach((callback) => callback(payload));
}
