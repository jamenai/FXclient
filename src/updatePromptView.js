import { createApp, defineComponent, nextTick, onBeforeUnmount, ref, shallowRef } from "vue/dist/vue.esm-bundler.js";

const UpdatePrompt = defineComponent({
  name: "UpdatePromptView",
  setup() {
    const dialog = ref(null);
    const worker = shallowRef(null);

    function openUpdatePrompt(nextWorker) {
      if (!nextWorker) return;
      worker.value = nextWorker;
      nextTick(() => {
        const element = dialog.value;
        if (!element) return;
        if (typeof element.showModal === "function") {
          if (!element.open) element.showModal();
        } else if (!element.open) element.setAttribute("open", "");
      });
    }

    function dismiss() {
      const element = dialog.value;
      if (element?.open) {
        if (typeof element.close === "function") element.close();
        else element.removeAttribute("open");
      }
      worker.value = null;
    }

    function applyUpdate() {
      worker.value?.postMessage({ update: true });
    }

    function handleUpdateAvailable(event) {
      window.__fxPendingUpdateWorker = null;
      openUpdatePrompt(event.detail?.worker);
    }

    window.addEventListener("fx-update-available", handleUpdateAvailable);
    onBeforeUnmount(() => window.removeEventListener("fx-update-available", handleUpdateAvailable));
    if (window.__fxPendingUpdateWorker) {
      openUpdatePrompt(window.__fxPendingUpdateWorker);
      window.__fxPendingUpdateWorker = null;
    }

    return { dialog, dismiss, applyUpdate };
  },
  template: `
    <Teleport to="body">
      <dialog ref="dialog" class="fx-update-prompt" aria-labelledby="fx-update-prompt-title" @cancel.prevent="dismiss">
        <div class="fx-update-prompt-mark" aria-hidden="true">↻</div>
        <div class="fx-update-prompt-content">
          <span class="fx-update-prompt-eyebrow">ZFX CLIENT · UPDATE</span>
          <h2 id="fx-update-prompt-title">A new version is ready</h2>
          <p>Update now to load the latest version of the client.</p>
          <div class="fx-update-prompt-actions">
            <button type="button" class="fx-update-prompt-dismiss" @click="dismiss">Dismiss</button>
            <button type="button" class="fx-update-prompt-apply" @click="applyUpdate">Update</button>
          </div>
        </div>
      </dialog>
    </Teleport>`,
});

export function initializeUpdatePromptView() {
  if (document.getElementById("fx-update-prompt-mount")) return () => {};
  const mount = document.createElement("div");
  mount.id = "fx-update-prompt-mount";
  document.body.appendChild(mount);
  const app = createApp(UpdatePrompt);
  app.config.errorHandler = (error, _instance, info) => {
    console.error("[ZFX Client UpdatePrompt] Vue error:", info, error);
  };
  app.mount(mount);
  return () => {
    app.unmount();
    mount.remove();
  };
}
