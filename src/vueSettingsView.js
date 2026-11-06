import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

const VueSettingsView = defineComponent({
  name: "FxSettingsView",
  props: { settingsManager: { type: Object, required: true } },
  setup(props) {
    const visible = ref(false);
    const settingsContent = ref(null);
    const settingsActions = ref(null);
    const settingsTabs = ref([]);
    const activeSettingsTab = ref("");
    const isGerman = ref(false);
    const labels = computed(() => isGerman.value ? {
      title: "Einstellungen", close: "Schlie\u00dfen", sections: "Einstellungsbereiche",
      footer: { "Reset Settings": "Einstellungen zur\u00fccksetzen", "Save Settings": "Einstellungen speichern", Import: "Importieren", Export: "Exportieren", Reset: "Zur\u00fccksetzen", Save: "Speichern" },
    } : {
      title: "Settings", close: "Close", sections: "Settings sections",
      footer: { "Einstellungen zur\u00fccksetzen": "Reset Settings", "Einstellungen speichern": "Save Settings", Importieren: "Import", Exportieren: "Export", Zur\u00fccksetzen: "Reset", Speichern: "Save" },
    });
    const sectionTranslations = {
      general: ["General", "Allgemein"], allgemein: ["General", "Allgemein"],
      "in-gamedisplay": ["In-game display", "Spielanzeige"], spielanzeige: ["In-game display", "Spielanzeige"],
      density: ["Density", "Dichte"], dichte: ["Density", "Dichte"],
      attackestimate: ["Attack estimate", "Angriffssch\u00e4tzung"], angriffsschaetzung: ["Attack estimate", "Angriffssch\u00e4tzung"],
      ownterritory: ["Own territory", "Eigenes Gebiet"], eigenesgebiet: ["Own territory", "Eigenes Gebiet"],
      names: ["Names", "Namen"], namen: ["Names", "Namen"], controls: ["Controls", "Steuerung"], steuerung: ["Controls", "Steuerung"],
      home: ["Home", "Startseite"], startseite: ["Home", "Startseite"], lobby: ["Lobby", "Lobby"],
      replays: ["Replays", "Wiederholungen"], wiederholungen: ["Replays", "Wiederholungen"], about: ["About", "\u00dcber"], uber: ["About", "\u00dcber"],
    };
    const updateLanguage = () => {
      isGerman.value = String(window.__fx?.getGameLanguage?.() || "en").toLowerCase().startsWith("de");
    };
    const handleGameLanguageChange = () => {
      updateLanguage();
      if (!visible.value) return;
      props.settingsManager.refreshTranslations?.();
      props.settingsManager.syncFields();
      updateFooterLabels();
    };
    const translateSection = label => {
      const key = String(label).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
      const pair = sectionTranslations[key];
      return pair ? pair[isGerman.value ? 1 : 0] : label;
    };
    const updateFooterLabels = () => {
      for (const button of settingsActions.value?.querySelectorAll("button") || []) {
        const original = button.dataset.fxSettingsOriginalLabel || button.textContent.trim();
        button.dataset.fxSettingsOriginalLabel = original;
        button.textContent = labels.value.footer[original] || original;
      }
    };

    const close = () => { visible.value = false; };
    const selectSettingsTab = tab => {
      activeSettingsTab.value = tab.id;
      for (const item of settingsTabs.value) item.panel.hidden = item.id !== tab.id;
    };
    const open = () => {
      updateLanguage();
      props.settingsManager.refreshTranslations?.();
      props.settingsManager.syncFields();
      updateFooterLabels();
      visible.value = true;
    };
    const onKeyDown = event => {
      if (visible.value && event.key === "Escape") close();
    };

    onMounted(() => {
      updateLanguage();
      const nativeSettings = document.querySelector(".window.settings");
      const content = nativeSettings?.querySelector(".scrollable");
      const actions = nativeSettings?.querySelector("footer");
      if (content) {
        const groups = [];
        let currentGroup = null;
        for (const node of Array.from(content.childNodes)) {
          const heading = node.nodeType === Node.ELEMENT_NODE
            ? node.querySelector?.(".settings-section-title")
            : null;
          if (heading) {
            currentGroup = { id: `settings-section-${groups.length}`, label: heading.textContent.trim(), nodes: [] };
            groups.push(currentGroup);
          } else if (currentGroup) currentGroup.nodes.push(node);
        }
        for (const group of groups) {
          const panel = document.createElement("div");
          panel.className = "fx-settings-section-panel";
          panel.hidden = group !== groups[0];
          panel.append(...group.nodes);
          group.panel = panel;
        }
        content.replaceChildren(...groups.map(group => group.panel));
        settingsTabs.value = groups;
        activeSettingsTab.value = groups[0]?.id || "";
        settingsContent.value.append(content);
      }
      if (actions) settingsActions.value.append(actions);
      if (nativeSettings) nativeSettings.style.display = "none";
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("fx-game-language-change", handleGameLanguageChange);
      window.__fx.openVueSettings = open;
      window.__fx.closeVueSettings = close;
    });

    onBeforeUnmount(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("fx-game-language-change", handleGameLanguageChange);
      if (window.__fx?.openVueSettings === open) delete window.__fx.openVueSettings;
      if (window.__fx?.closeVueSettings === close) delete window.__fx.closeVueSettings;
    });

    return { visible, settingsContent, settingsActions, settingsTabs, activeSettingsTab, selectSettingsTab, translateSection, labels, close };
  },
  template: `
    <div v-show="visible" class="fx-settings-overlay" @pointerdown.self="close">
      <section class="fx-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-settings-title">
        <header class="fx-settings-header">
          <div><small>ZFX CLIENT</small><h1 id="fx-settings-title">{{ labels.title }}</h1></div>
          <button type="button" class="fx-settings-close" :aria-label="labels.close" @click="close">×</button>
        </header>
        <div class="fx-settings-body">
          <nav class="fx-settings-tabs" role="tablist" :aria-label="labels.sections">
            <button v-for="tab in settingsTabs" :key="tab.id" type="button" role="tab" :aria-selected="activeSettingsTab === tab.id" :class="{ 'is-active': activeSettingsTab === tab.id }" @click="selectSettingsTab(tab)">{{ translateSection(tab.label) }}</button>
          </nav>
          <div ref="settingsContent" class="fx-settings-content"></div>
        </div>
        <div class="fx-settings-actions"><div ref="settingsActions" class="fx-settings-native-actions"></div><button type="button" class="fx-settings-close-bottom" @click="close">{{ labels.close }}</button></div>
      </section>
    </div>`,
});

export function createVueSettingsView(settingsManager) {
  const host = document.createElement("div");
  host.id = "fx-settings-view-root";
  document.body.appendChild(host);
  const app = createApp(VueSettingsView, { settingsManager });
  app.mount(host);
  return () => {
    app.unmount();
    host.remove();
  };
}
