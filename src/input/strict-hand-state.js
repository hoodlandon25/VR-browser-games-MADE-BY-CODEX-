import { publish, state } from "../state.js";

AFRAME.registerComponent("strict-hand-state", {
  schema: {
    hand: { type: "string" }
  },

  init() {
    this.gripDown = false;
    this.triggerDown = false;
    this.ray = document.createElement("a-entity");
    this.pointerCore = document.createElement("a-sphere");
    this.touchTip = document.createElement("a-sphere");
    this.grabber = document.createElement("a-sphere");
    this.label = document.createElement("a-text");

    this.el.setAttribute("gltf-model", "");

    this.pointerCore.setAttribute("radius", 0.02);
    this.pointerCore.setAttribute("segments-width", 4);
    this.pointerCore.setAttribute("segments-height", 4);
    this.pointerCore.setAttribute("color", "#d7d2b1");
    this.pointerCore.setAttribute("position", "0 0 0");
    this.el.appendChild(this.pointerCore);

    this.touchTip.setAttribute("radius", 0.012);
    this.touchTip.setAttribute("segments-width", 5);
    this.touchTip.setAttribute("segments-height", 5);
    this.touchTip.setAttribute("material", "color: #d8f0a8; emissive: #a3cf4a; emissiveIntensity: 0.45");
    this.touchTip.setAttribute("position", "0 0 -0.14");
    this.touchTip.setAttribute("visible", "false");
    this.el.appendChild(this.touchTip);

    this.grabber.setAttribute("radius", 0.055);
    this.grabber.setAttribute("segments-width", 6);
    this.grabber.setAttribute("segments-height", 6);
    this.grabber.setAttribute("material", "color: #a7ba68; opacity: 0.0; transparent: true");
    this.grabber.setAttribute("position", "0 0 -0.08");
    this.el.appendChild(this.grabber);

    this.ray.setAttribute("raycaster", "objects: .ui-hit; far: 0.8; showLine: false");
    this.ray.setAttribute("line", "color: #c4db6c; opacity: 0.75");
    this.ray.setAttribute("visible", "false");
    this.ray.setAttribute("position", "0 0 -0.02");
    this.el.appendChild(this.ray);

    this.label.setAttribute("value", "");
    this.label.setAttribute("align", "center");
    this.label.setAttribute("width", 0.5);
    this.label.setAttribute("position", "0 -0.09 0");
    this.label.setAttribute("color", "#cfd5a8");
    this.el.appendChild(this.label);

    this.onGripDown = () => {
      this.gripDown = true;
      this.syncState();
    };
    this.onGripUp = () => {
      this.gripDown = false;
      this.syncState();
    };
    this.onTriggerDown = () => {
      this.triggerDown = true;
      this.syncState();
    };
    this.onTriggerUp = () => {
      this.triggerDown = false;
      this.syncState();
    };

    ["gripdown", "abuttondown", "xbuttondown"].forEach((evt) => this.el.addEventListener(evt, this.onGripDown));
    ["gripup", "abuttonup", "xbuttonup"].forEach((evt) => this.el.addEventListener(evt, this.onGripUp));
    ["triggerdown"].forEach((evt) => this.el.addEventListener(evt, this.onTriggerDown));
    ["triggerup"].forEach((evt) => this.el.addEventListener(evt, this.onTriggerUp));

    this.syncState();
  },

  syncState() {
    const nextState = this.gripDown && this.triggerDown ? "fist" : this.gripDown ? "point" : "open";
    state.handStates[this.data.hand] = nextState;
    publish("hand:state", {
      hand: this.data.hand,
      state: nextState,
      grabber: this.grabber,
      ray: this.ray,
      touchTip: this.touchTip,
      entity: this.el
    });

    this.ray.setAttribute("visible", nextState === "point");
    this.ray.setAttribute("raycaster", "objects: .ui-hit; far: 0.8");
    this.grabber.setAttribute("material", `color: #a7ba68; opacity: ${nextState === "fist" ? 0.22 : 0.0}; transparent: true`);
    this.pointerCore.setAttribute("scale", nextState === "fist" ? "0.7 0.7 0.7" : nextState === "point" ? "0.5 0.5 2.2" : "1 1 1");
    this.pointerCore.setAttribute("position", nextState === "point" ? "0 0 -0.06" : "0 0 0");
    this.pointerCore.setAttribute("color", nextState === "fist" ? "#97b75c" : "#d7d2b1");
    this.touchTip.setAttribute("visible", nextState === "point");
    this.label.setAttribute("value", nextState === "point" ? "POINT" : nextState === "fist" ? "GRAB" : "");
  }
});
