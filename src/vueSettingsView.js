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
      title: "Einstellungen", subtitle: "ZFX-Client-Optionen und Benutzeroberfläche.", close: "Schlie\u00dfen", sections: "Einstellungsbereiche", clientSettings: "ZFX-Einstellungen", gameSettings: "Spieleinstellungen",
      footer: { "Reset Settings": "Einstellungen zur\u00fccksetzen", "Save Settings": "Einstellungen speichern", Import: "Importieren", Export: "Exportieren", Reset: "Zur\u00fccksetzen", Save: "Speichern" },
    } : {
      title: "Settings", subtitle: "ZFX client options and interface preferences.", close: "Close", sections: "Settings sections", clientSettings: "ZFX Settings", gameSettings: "Game Settings",
      footer: { "Einstellungen zur\u00fccksetzen": "Reset Settings", "Einstellungen speichern": "Save Settings", Importieren: "Import", Exportieren: "Export", Zur\u00fccksetzen: "Reset", Speichern: "Save" },
    });
    const sectionTranslations = {
      general: ["General", "Allgemein"], allgemein: ["General", "Allgemein"],
      "in-gamedisplay": ["In-game display", "Spielanzeige"], ingamedisplay: ["In-game display", "Spielanzeige"], spielanzeige: ["In-game display", "Spielanzeige"],
      density: ["Density", "Dichte"], dichte: ["Density", "Dichte"],
      attackestimate: ["Attack estimate", "Angriffssch\u00e4tzung"], angriffsschaetzung: ["Attack estimate", "Angriffssch\u00e4tzung"],
      ownterritory: ["Own territory", "Eigenes Gebiet"], eigenesgebiet: ["Own territory", "Eigenes Gebiet"],
      names: ["Names", "Namen"], namen: ["Names", "Namen"], controls: ["Controls", "Steuerung"], steuerung: ["Controls", "Steuerung"],
      home: ["Home", "Startseite"], startseite: ["Home", "Startseite"], lobby: ["Lobby", "Lobby"],
      replays: ["Replays", "Wiederholungen"], wiederholungen: ["Replays", "Wiederholungen"], about: ["About", "\u00dcber"], uber: ["About", "\u00dcber"],
      notifications: ["Notifications", "Benachrichtigungen"], benachrichtigungen: ["Notifications", "Benachrichtigungen"],
      "in-game": ["In-game", "Im Spiel"], ingame: ["In-game", "Im Spiel"], imspiel: ["In-game", "Im Spiel"],
      interface: ["Interface", "Benutzeroberfläche"], benutzeroberfläche: ["Interface", "Benutzeroberfläche"],
      playback: ["Playback", "Wiedergabe"], wiedergabe: ["Playback", "Wiedergabe"],
      reminderrules: ["Reminder rules", "Erinnerungsregeln"], erinnerungsregeln: ["Reminder rules", "Erinnerungsregeln"],
      mutedlobbypings: ["Muted lobby pings", "Stumme Lobby-Erwähnungen"], stummelobbyerwähnungen: ["Muted lobby pings", "Stumme Lobby-Erwähnungen"],
      savedreplays: ["Saved Replays", "Gespeicherte Replays"], gespeichertereplays: ["Saved Replays", "Gespeicherte Replays"],
      popups: ["Popups", "Pop-ups"],
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
      for (const tab of settingsTabs.value) {
        for (const subsection of tab.subsections || []) {
          subsection.button.textContent = translateSection(subsection.label);
        }
      }
    };
    const translateSection = label => {
      const key = String(label).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
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
    const openGameSettings = () => {
      close();
      window.__fx?.openVueGameSettings?.();
    };
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
            ? node.querySelector?.(".settings-category-title")
            : null;
          if (heading) {
            currentGroup = { id: `settings-section-${groups.length}`, label: heading.textContent.trim(), nodes: [] };
            groups.push(currentGroup);
          } else if (currentGroup) currentGroup.nodes.push(node);
        }
        for (const group of groups) {
          const panel = document.createElement("div");
          panel.className = "fx-settings-category-panel";
          panel.hidden = group !== groups[0];
          const subsections = [];
          let currentSubsection = null;
          const ungroupedNodes = [];
          for (const node of group.nodes) {
            const heading = node.nodeType === Node.ELEMENT_NODE
              ? node.querySelector?.(".settings-subsection-title")
              : null;
            if (heading) {
              currentSubsection = {
                id: `${group.id}-subsection-${subsections.length}`,
                label: heading.dataset.settingsSubsectionLabel || heading.textContent.trim().replace(/\s*\(.*$/, ""),
                nodes: [node],
              };
              subsections.push(currentSubsection);
            } else if (currentSubsection) currentSubsection.nodes.push(node);
            else ungroupedNodes.push(node);
          }
          if (subsections.length) {
            panel.classList.add("has-subsections");
            if (ungroupedNodes.length) {
              const preamble = document.createElement("div");
              preamble.className = "fx-settings-category-preamble";
              preamble.append(...ungroupedNodes);
              panel.append(preamble);
            }
            const subsectionNav = document.createElement("nav");
            subsectionNav.className = "fx-settings-subtabs";
            subsectionNav.setAttribute("role", "tablist");
            subsectionNav.setAttribute("aria-label", labels.value.sections);
            const subsectionContent = document.createElement("div");
            subsectionContent.className = "fx-settings-subsection-panels";
            subsections.forEach((subsection, index) => {
              const button = document.createElement("button");
              button.type = "button";
              button.className = "fx-settings-subtab";
              button.setAttribute("role", "tab");
              button.setAttribute("aria-selected", index === 0 ? "true" : "false");
              button.textContent = translateSection(subsection.label);
              const subpanel = document.createElement("section");
              subpanel.className = "fx-settings-subsection-panel";
              subpanel.setAttribute("role", "tabpanel");
              subpanel.hidden = index !== 0;
              subpanel.append(...subsection.nodes);
              button.addEventListener("click", () => {
                subsections.forEach(item => {
                  item.button.classList.toggle("is-active", item === subsection);
                  item.button.setAttribute("aria-selected", item === subsection ? "true" : "false");
                  item.panel.hidden = item !== subsection;
                });
              });
              subsection.button = button;
              subsection.panel = subpanel;
              if (index === 0) button.classList.add("is-active");
              subsectionNav.append(button);
              subsectionContent.append(subpanel);
            });
            panel.append(subsectionNav, subsectionContent);
          } else panel.append(...group.nodes);
          group.subsections = subsections;
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

    return { visible, settingsContent, settingsActions, settingsTabs, activeSettingsTab, selectSettingsTab, translateSection, labels, close, openGameSettings };
  },
  template: `
    <div v-show="visible" class="fx-settings-overlay" @pointerdown.self="close">
      <section class="fx-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-settings-title">
        <header class="fx-settings-header">
          <div class="fx-settings-mark" aria-hidden="true">⚙</div>
          <div class="fx-settings-heading"><small>ZFX CLIENT · SETTINGS</small><h1 id="fx-settings-title">{{ labels.title }}</h1><p>{{ labels.subtitle }}</p></div>
          <nav class="fx-settings-kind-switch" :aria-label="labels.sections">
            <button type="button" class="is-active" aria-current="page">{{ labels.clientSettings }}</button>
            <button type="button" @click="openGameSettings">{{ labels.gameSettings }}</button>
          </nav>
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
