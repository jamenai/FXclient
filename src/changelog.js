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
        <div class="fx-changelog-mark" aria-hidden="true">Z</div>
        <div class="fx-changelog-content">
          <span class="fx-changelog-eyebrow">ZFX CLIENT · RELEASE NOTES</span>
          <h2 id="fx-changelog-title">What's new in {{ version }}</h2>
          <p class="fx-changelog-date">{{ lastUpdated }}</p>
          <ul><li v-for="(change, index) in changes" :key="index">{{ change }}</li></ul>
          <div class="fx-changelog-actions"><button type="button" @click="dismiss">Close</button></div>
        </div>
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
