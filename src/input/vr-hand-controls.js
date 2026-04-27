AFRAME.registerComponent("vr-hand-controls", {
  schema: {
    hand: { type: "string" }
  },

  init() {
    this.el.setAttribute("laser-controls", `hand: ${this.data.hand}`);
    this.el.setAttribute("tracked-controls", `hand: ${this.data.hand}; emitControllerEvents: true`);
    this.el.setAttribute("visible", "true");
  }
});
