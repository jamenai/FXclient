import { defineComponent, h } from "vue/dist/vue.esm-bundler.js";

export const ZfxLogoMark = defineComponent({
  name: "ZfxLogoMark",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => h("svg", {
      ...attrs,
      viewBox: "0 0 100 100",
      role: attrs.role || "img",
      "aria-label": attrs["aria-label"] || "ZFX Client",
    }, [
      h("rect", { width: 100, height: 100, rx: 18, fill: "#0b2637" }),
      h("path", { fill: "#15546d", d: "M0 0h44c-9 9 8 12-3 22-9 8 8 14 1 23-7 8 13 15 8 23-6 10-33 8-50 22z" }),
      h("path", { fill: "#16835f", d: "M44 0h56v49c-17 1-29 5-44 5 2-8-12-13-8-21 5-10-10-13-2-21 7-7-9-10-2-12z" }),
      h("path", { fill: "#147c78", d: "M0 75c16-11 42-8 50-18 16-7 30-8 50-9v52H0z" }),
      h("path", { d: "M44-3c-10 8 8 13-3 23-9 9 8 13 1 23-7 9 13 15 8 23M-4 77c17-12 43-9 52-20 16-7 31-8 56-10", fill: "none", stroke: "#f2f5ee", "stroke-width": 5.5, "stroke-linecap": "round", "stroke-linejoin": "round" }),
      h("path", { d: "M46 0c-6 7 7 12-2 19-7 9 6 13 1 21M0 73c17-9 37-7 47-17 14-6 30-7 53-9", fill: "none", stroke: "#fff", "stroke-opacity": .62, "stroke-width": 1.2, "stroke-linecap": "round" }),
    ]);
  },
});
