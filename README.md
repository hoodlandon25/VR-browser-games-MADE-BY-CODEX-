# Human Visualizer Hall

VR-only WebXR horror prototype for Quest Browser and similar headsets. The scene uses A-Frame with custom components for strict hand-state interaction, a retro MP3 UI, and an audio-reactive NPC.

## Run locally

```bash
cd /home/hoodlandon25/VR-browser-games-MADE-BY-CODEX-
python3 -m http.server 8080
```

Open `http://<your-machine>:8080` in Quest Browser, then use the on-page `Enter VR` button.

## Controls

- Left joystick: move through the hallway
- Open hand: idle only
- Grip only: pointing mode for UI
- Grip + Trigger: closed fist for grabbing

Strict rules enforced in code:

- MP3 can only be grabbed while the hand state is `fist`
- UI reacts only to `point` interactions
- No desktop or mobile gameplay controls are provided

## File structure

- `index.html`: scene shell and VR boot overlay
- `styles.css`: retro boot screen styles
- `src/app.js`: app orchestration and MP3 interaction logic
- `src/audio/audio-manager.js`: Web Audio playlist and lightweight analysis
- `src/input/*`: VR controller setup and strict hand-state rules
- `src/npc/npc-controller.js`: idle and creepy audio-reactive behavior
- `src/ui/ui-surface.js`: pixel-style MP3 screen and hidden menu path
- `src/world/world-builder.js`: hallway generation and lighting

## Hidden mode path

`Menu -> Files/System -> Advanced -> Unknown -> Visualizer Mode: Human`

## Push helper

To resume pushing the repo and print a simple `1%` to `100%` progress readout:

```bash
cd /home/hoodlandon25/VR-browser-games-MADE-BY-CODEX-
chmod +x scripts/push_and_enable_pages.sh
GITHUB_TOKEN=YOUR_TOKEN ./scripts/push_and_enable_pages.sh
```

If `GITHUB_TOKEN` is set, the script also attempts to enable GitHub Pages with the GitHub Actions build type.
