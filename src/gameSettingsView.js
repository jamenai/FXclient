import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

const GameSettingsView = defineComponent({
  name: "FxGameSettingsView",
  setup() {
    const visible = ref(false);
    const language = ref("en");
    const snapshot = ref(null);
    const selectedSection = ref("general");
    const keyCaptureIndex = ref(-1);
    let refreshTimer = 0;
    const isGerman = computed(() => language.value.startsWith("de"));
    const sections = computed(() => isGerman.value ? [
      { id: "general", label: "Allgemein", icon: "◉" },
      { id: "display", label: "Anzeige", icon: "▣" },
      { id: "controls", label: "Steuerung", icon: "⌨" },
      { id: "connection", label: "Verbindung", icon: "⌁" },
    ] : [
      { id: "general", label: "General", icon: "◉" },
      { id: "display", label: "Display", icon: "▣" },
      { id: "controls", label: "Controls", icon: "⌨" },
      { id: "connection", label: "Connection", icon: "⌁" },
    ]);
    const labels = computed(() => {
      const native = snapshot.value?.labels || {};
      return isGerman.value ? {
        title: "Spieleinstellungen", subtitle: "Spieloptionen in der ZFX-Ansicht.", close: "Schließen",
        language: "Sprache", display: "Anzeige", select: "Auswählen", fontPlaceholder: "Schriftart eingeben",
        messageKeepClosed: native.keepClosed || "Geschlossen halten", messageMuted: native.muted || "Stummgeschaltet",
        keyHint: "Taste anklicken und neue Tastenkombination drücken", resetKeys: "Tastenkürzel zurücksetzen",
        resetAll: native.reset || "Einstellungen zurücksetzen", confirmReset: "Alle Spieleinstellungen auf Standard zurücksetzen?",
        intensity: native.intensity || "Intensität", live: "Änderungen werden direkt im Spiel übernommen.",
      } : {
        title: "Game Settings", subtitle: "Game options in the ZFX interface.", close: "Close",
        language: "Language", display: "Display", select: "Select", fontPlaceholder: "Enter font name",
        messageKeepClosed: native.keepClosed || "Keep Closed", messageMuted: native.muted || "Is Muted",
        keyHint: "Click a key field and press a new key", resetKeys: "Reset shortcuts",
        resetAll: native.reset || "Reset settings", confirmReset: "Reset all game settings to their defaults?",
        intensity: native.intensity || "Intensity", live: "Changes are applied to the game immediately.",
      };
    });
    const nativeLabels = computed(() => snapshot.value?.labels || {});
    const gameOptions = computed(() => snapshot.value?.options || {});
    const keyGroups = computed(() => snapshot.value?.shortcutGroups || []);

    function refresh() {
      const selectedLanguage = window.__fx?.getGameLanguage?.();
      if (selectedLanguage) language.value = String(selectedLanguage).toLowerCase();
      const adapter = window.__fx?.gameSettingsAdapter;
      if (typeof adapter?.getSnapshot === "function") snapshot.value = adapter.getSnapshot();
    }
    function setField(id, value) {
      if ([2, 7, 8, 13, 14, 15].includes(id)) value = value ? 1 : 0;
      window.__fx?.gameSettingsAdapter?.setField?.(id, value);
      refresh();
    }
    function setConnection(event) {
      window.__fx?.gameSettingsAdapter?.setConnection?.(event.target.value);
      refresh();
    }
    function captureKey(event, index) {
      event.preventDefault();
      event.stopPropagation();
      const code = event.code || event.key;
      if (!code || code === "Escape") { keyCaptureIndex.value = -1; return; }
      window.__fx?.gameSettingsAdapter?.setShortcut?.(index, code);
      keyCaptureIndex.value = -1;
      refresh();
    }
    function resetShortcuts() {
      window.__fx?.gameSettingsAdapter?.resetShortcuts?.();
      refresh();
    }
    function resetAll() {
      if (!window.confirm(labels.value.confirmReset)) return;
      window.__fx?.gameSettingsAdapter?.reset?.();
      refresh();
    }
    function open() {
      refresh();
      selectedSection.value = "general";
      visible.value = true;
    }
    function close() { keyCaptureIndex.value = -1; visible.value = false; }
    function onKeyDown(event) {
      if (visible.value && event.key === "Escape" && keyCaptureIndex.value < 0) close();
    }
    onMounted(() => {
      refresh();
      refreshTimer = window.setInterval(refresh, 700);
      window.addEventListener("keydown", onKeyDown);
      window.__fx.openVueGameSettings = open;
      window.__fx.closeVueGameSettings = close;
    });
    onBeforeUnmount(() => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("keydown", onKeyDown);
      if (window.__fx?.openVueGameSettings === open) delete window.__fx.openVueGameSettings;
      if (window.__fx?.closeVueGameSettings === close) delete window.__fx.closeVueGameSettings;
    });
    return { visible, sections, selectedSection, snapshot, labels, nativeLabels, gameOptions, keyGroups, keyCaptureIndex,
      isGerman, setField, setConnection, captureKey, resetShortcuts, resetAll, close };
  },
  template: `
    <div v-show="visible" class="fx-game-settings-overlay" @pointerdown.self="close">
      <main class="fx-game-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-game-settings-title">
        <header class="fx-game-settings-header">
          <div class="fx-game-settings-mark" aria-hidden="true">⚙</div>
          <div><small>ZFX CLIENT · GAME</small><h1 id="fx-game-settings-title">{{ labels.title }}</h1><p>{{ labels.subtitle }}</p></div>
          <button type="button" class="fx-game-settings-close" :aria-label="labels.close" @click="close">×</button>
        </header>
        <div v-if="snapshot" class="fx-game-settings-layout">
          <nav class="fx-game-settings-nav" :aria-label="labels.title">
            <button v-for="section in sections" :key="section.id" type="button" class="fx-game-settings-nav-item" :class="{ 'is-active': selectedSection === section.id }" @click="selectedSection = section.id">
              <span aria-hidden="true">{{ section.icon }}</span><strong>{{ section.label }}</strong><i>›</i>
            </button>
            <button type="button" class="fx-game-settings-reset" @click="resetAll">{{ labels.resetAll }}</button>
          </nav>
          <section class="fx-game-settings-content">
            <div v-if="selectedSection === 'general'" class="fx-game-settings-section">
              <div class="fx-game-settings-section-heading"><span>{{ nativeLabels.information }}</span><h2>{{ sections[0].label }}</h2><p>{{ nativeLabels.informationNote }}</p></div>
              <article class="fx-game-setting-card">
                <div class="fx-game-setting-copy"><strong>{{ labels.language }}</strong><small>{{ isGerman ? 'Verwendet die im Spiel gewählte Sprache.' : 'Uses the language selected in the game.' }}</small></div>
                <select :value="snapshot.values[12]" @change="setField(12, $event.target.value)"><option v-for="option in gameOptions.language" :key="option.value" :value="option.value">{{ option.label }}</option></select>
              </article>
              <article class="fx-game-setting-card">
                <div class="fx-game-setting-copy"><strong>{{ nativeLabels.messageBox }}</strong><small>{{ isGerman ? 'Legt das Verhalten des Nachrichtenfensters fest.' : 'Configure the in-game message box.' }}</small></div>
                <div class="fx-game-setting-toggles"><label><input type="checkbox" :checked="snapshot.values[13]" @change="setField(13, $event.target.checked)"><span>{{ labels.messageKeepClosed }}</span></label><label><input type="checkbox" :checked="snapshot.values[14]" @change="setField(14, $event.target.checked)"><span>{{ labels.messageMuted }}</span></label></div>
              </article>
            </div>
            <div v-else-if="selectedSection === 'display'" class="fx-game-settings-section">
              <div class="fx-game-settings-section-heading"><span>{{ nativeLabels.information }}</span><h2>{{ sections[1].label }}</h2><p>{{ nativeLabels.informationNote }}</p></div>
              <article class="fx-game-setting-card"><div class="fx-game-setting-copy"><strong>{{ nativeLabels.resolution }}</strong></div><select :value="snapshot.values[1]" @change="setField(1, Number($event.target.value))"><option v-for="(option, index) in gameOptions.resolution" :key="index" :value="index">{{ option }}</option></select></article>
              <article class="fx-game-setting-card"><div class="fx-game-setting-copy"><strong>{{ nativeLabels.minimumFont }}</strong></div><select :value="snapshot.values[9]" @change="setField(9, Number($event.target.value))"><option v-for="(option, index) in gameOptions.minimumFont" :key="index" :value="index">{{ option }}</option></select></article>
              <article class="fx-game-setting-card"><div class="fx-game-setting-copy"><strong>{{ nativeLabels.textSpeed }}</strong></div><select :value="snapshot.values[11]" @change="setField(11, Number($event.target.value))"><option v-for="(option, index) in gameOptions.textSpeed" :key="index" :value="index">{{ option }}</option></select></article>
              <article class="fx-game-setting-card"><div class="fx-game-setting-copy"><strong>{{ nativeLabels.font }}</strong><small>{{ isGerman ? 'Schriftart für die Spieloberfläche.' : 'Font used by the game interface.' }}</small></div><input class="fx-game-setting-text" type="text" maxlength="80" :value="snapshot.values[5]" :placeholder="labels.fontPlaceholder" @change="setField(5, $event.target.value)"></article>
              <article class="fx-game-setting-card"><div class="fx-game-setting-copy"><strong>{{ nativeLabels.highlighting }}</strong><small>{{ labels.intensity }}: {{ snapshot.values[16] }}</small></div><label class="fx-game-setting-toggle"><input type="checkbox" :checked="snapshot.values[15]" @change="setField(15, $event.target.checked)"><span></span></label><input class="fx-game-setting-range" type="range" min="0" max="16" :value="snapshot.values[16]" @input="setField(16, Number($event.target.value))"></article>
              <article class="fx-game-setting-card is-checks">
                <label><input type="checkbox" :checked="snapshot.values[2]" @change="setField(2, $event.target.checked)"><span>{{ nativeLabels.largeUi }}</span></label>
                <label><input type="checkbox" :checked="snapshot.values[7]" @change="setField(7, $event.target.checked)"><span>{{ nativeLabels.placeBalance }}</span></label>
                <label><input type="checkbox" :checked="snapshot.values[8]" @change="setField(8, $event.target.checked)"><span>{{ nativeLabels.hideZoom }}</span></label>
              </article>
            </div>
            <div v-else-if="selectedSection === 'controls'" class="fx-game-settings-section">
              <div class="fx-game-settings-section-heading"><span>{{ nativeLabels.shortcuts }}</span><h2>{{ sections[2].label }}</h2><p>{{ labels.keyHint }}</p></div>
              <article v-for="group in keyGroups" :key="group.label" class="fx-game-key-card"><strong>{{ group.label }}</strong><div><button v-for="key in group.keys" :key="key.index" type="button" :class="{ 'is-capturing': keyCaptureIndex === key.index }" @focus="keyCaptureIndex = key.index" @blur="keyCaptureIndex === key.index && (keyCaptureIndex = -1)" @keydown="captureKey($event, key.index)">{{ keyCaptureIndex === key.index ? (isGerman ? 'Taste drücken…' : 'Press a key…') : key.value }}</button></div></article>
              <button type="button" class="fx-game-settings-reset-keys" @click="resetShortcuts">{{ labels.resetKeys }}</button>
            </div>
            <div v-else class="fx-game-settings-section">
              <div class="fx-game-settings-section-heading"><span>{{ nativeLabels.connection }}</span><h2>{{ sections[3].label }}</h2></div>
              <article class="fx-game-setting-card"><div class="fx-game-setting-copy"><strong>{{ nativeLabels.connection }}</strong><small>{{ isGerman ? 'Wähle, wie die Verbindung zum Spielserver hergestellt wird.' : 'Choose how the game connects to its server.' }}</small></div><select :value="snapshot.connection" @change="setConnection"><option v-for="(option, index) in gameOptions.connection" :key="index" :value="index">{{ option }}</option></select></article>
            </div>
          </section>
        </div>
        <footer class="fx-game-settings-footer"><span><i></i>{{ labels.live }}</span><button type="button" @click="close">{{ labels.close }}</button></footer>
      </main>
    </div>`,
});

export function createVueGameSettingsView() {
  if (document.getElementById("fx-game-settings-view-root")) return () => {};
  const host = document.createElement("div");
  host.id = "fx-game-settings-view-root";
  document.body.appendChild(host);
  const app = createApp(GameSettingsView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client GameSettingsView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
