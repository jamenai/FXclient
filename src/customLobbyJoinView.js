import { computed, createApp, defineComponent, onBeforeUnmount, ref } from "vue/dist/vue.esm-bundler.js";

const CustomLobbyJoinView = defineComponent({
  name: "FxCustomLobbyJoinView",
  setup() {
    const visible = ref(false);
    const unavailable = ref(false);
    const code = ref("");
    const region = ref("default");
    const language = ref("en");
    const isGerman = computed(() => language.value.startsWith("de"));
    const labels = computed(() => isGerman.value ? {
      title: "Custom-Lobby", eyebrow: "ZFX CLIENT · LOBBY", description: "Tritt einer Lobby mit einem Code bei oder erstelle eine neue Lobby.",
      code: "Lobby-Code", placeholder: "5-stelligen Code eingeben", join: "Lobby beitreten", or: "ODER", create: "Neue Lobby erstellen",
      region: "Region", automatic: "Automatisch (nächstgelegene)", cancel: "Abbrechen", close: "Schließen",
      unavailable: "Custom-Lobbys sind in dieser Version nicht verfügbar.", codeError: "Der Lobby-Code muss 5 Zeichen lang sein.",
      regions: { wnam: "Westliches Nordamerika", enam: "Östliches Nordamerika", weur: "Westeuropa", eeur: "Osteuropa", apac: "Asien-Pazifik", oc: "Ozeanien" },
    } : {
      title: "Custom Lobby", eyebrow: "ZFX CLIENT · LOBBY", description: "Join a lobby with a code or create a new one.",
      code: "Lobby code", placeholder: "Enter 5-character code", join: "Join lobby", or: "OR", create: "Create new lobby",
      region: "Region", automatic: "Automatic (closest to you)", cancel: "Cancel", close: "Close",
      unavailable: "Custom lobbies are unavailable in this version.", codeError: "The lobby code must be 5 characters.",
      regions: { wnam: "Western North America", enam: "Eastern North America", weur: "Western Europe", eeur: "Eastern Europe", apac: "Asia-Pacific", oc: "Oceania" },
    });

    function dismiss() {
      visible.value = false;
      code.value = "";
    }
    function open(event) {
      language.value = String(window.__fx?.getGameLanguage?.() || navigator.language || "en").toLowerCase();
      unavailable.value = event.detail?.unavailable === true;
      code.value = "";
      region.value = "default";
      visible.value = true;
    }
    function join() {
      if (code.value.trim().length !== 5 || unavailable.value) return;
      if (window.__fx?.customLobby?.joinWithCode?.(code.value)) dismiss();
    }
    function createLobby() {
      if (unavailable.value) return;
      window.__fx?.customLobby?.createLobby?.(region.value);
      dismiss();
    }
    function onKeyDown(event) {
      if (visible.value && event.key === "Escape") dismiss();
    }

    window.addEventListener("fx-show-custom-lobby-join", open);
    window.addEventListener("keydown", onKeyDown);
    onBeforeUnmount(() => {
      window.removeEventListener("fx-show-custom-lobby-join", open);
      window.removeEventListener("keydown", onKeyDown);
    });
    return { visible, unavailable, code, region, labels, dismiss, join, createLobby };
  },
  template: `
    <Teleport to="body">
      <div v-if="visible" class="fx-custom-lobby-join-overlay" @pointerdown.self="dismiss">
        <section class="fx-custom-lobby-join-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-custom-lobby-join-title">
          <header class="fx-custom-lobby-join-header">
            <div><small>{{ labels.eyebrow }}</small><h2 id="fx-custom-lobby-join-title">{{ labels.title }}</h2><p>{{ labels.description }}</p></div>
            <button type="button" :aria-label="labels.close" @click="dismiss">×</button>
          </header>
          <p v-if="unavailable" class="fx-custom-lobby-join-unavailable" role="status">{{ labels.unavailable }}</p>
          <template v-else>
            <form class="fx-custom-lobby-join-form" @submit.prevent="join">
              <label for="fx-custom-lobby-code">{{ labels.code }}</label>
              <div class="fx-custom-lobby-code-row">
                <input id="fx-custom-lobby-code" v-model.trim="code" type="text" maxlength="5" minlength="5" autocomplete="off" autocapitalize="characters" :placeholder="labels.placeholder">
                <button type="submit" :disabled="code.length !== 5">{{ labels.join }}</button>
              </div>
            </form>
            <div class="fx-custom-lobby-join-divider"><span>{{ labels.or }}</span></div>
            <div class="fx-custom-lobby-create-row">
              <label for="fx-custom-lobby-region">{{ labels.region }}</label>
              <select id="fx-custom-lobby-region" v-model="region">
                <option value="default">{{ labels.automatic }}</option>
                <option v-for="(name, key) in labels.regions" :key="key" :value="key">{{ name }}</option>
              </select>
            </div>
            <footer class="fx-custom-lobby-join-actions">
              <button type="button" class="is-quiet" @click="dismiss">{{ labels.cancel }}</button>
              <button type="button" class="is-primary" @click="createLobby">{{ labels.create }}</button>
            </footer>
          </template>
        </section>
      </div>
    </Teleport>`,
});

export function initializeCustomLobbyJoinView() {
  if (document.getElementById("fx-custom-lobby-join-root")) return () => {};
  const host = document.createElement("div");
  host.id = "fx-custom-lobby-join-root";
  document.body.appendChild(host);
  const app = createApp(CustomLobbyJoinView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client CustomLobbyJoinView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
