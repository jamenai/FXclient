import { createApp, defineComponent, nextTick, onBeforeUnmount, ref } from "vue/dist/vue.esm-bundler.js";
import versionData from "../version.json";

const ChangelogView = defineComponent({
  name: "FxChangelogView",
  setup() {
    const dialog = ref(null);

    function open() {
      nextTick(() => {
        const element = dialog.value;
        if (element && !element.open) element.showModal();
      });
    }

    function dismiss() {
      if (dialog.value?.open) dialog.value.close();
    }

    function handleShow(event) {
      event.preventDefault();
      open();
    }

    window.addEventListener("fx-show-changelog", handleShow);
    onBeforeUnmount(() => window.removeEventListener("fx-show-changelog", handleShow));

    return { dialog, dismiss, changes: versionData.changes ?? [], version: versionData.version, lastUpdated: versionData.lastUpdated };
  },
  template: `
    <Teleport to="body">
      <dialog ref="dialog" class="fx-changelog" aria-labelledby="fx-changelog-title" @cancel.prevent="dismiss">
        <h2 id="fx-changelog-title">What's new in ZFX Client {{ version }}</h2>
        <p>{{ lastUpdated }}</p>
        <ul><li v-for="(change, index) in changes" :key="index">{{ change }}</li></ul>
        <button type="button" @click="dismiss">Close</button>
      </dialog>
    </Teleport>`,
});

let app;

export function initializeChangelogView() {
  if (app) return;
  const host = document.createElement("div");
  host.id = "fx-changelog-view-root";
  document.body.appendChild(host);
  app = createApp(ChangelogView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client Changelog] Vue error:", info, error);
  app.mount(host);
}

export function displayChangelog() {
  window.dispatchEvent(new Event("fx-show-changelog"));
}
