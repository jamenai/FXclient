import { createApp, computed, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

const FxHomeView = defineComponent({
  name: "FxHomeView",
  setup() {
    const visible = ref(false);
    const nameEditorOpen = ref(false);
    const nameDraft = ref("");
    const nameStatus = ref("");
    const nameHistory = ref([]);
    const accountId = ref("");
    const fullPlayerName = ref("");
    const profileName = ref("");
    const clan = ref("");
    const isGerman = computed(() => (window.__fx?.getGameLanguage?.() || navigator.language || "en").toLowerCase().startsWith("de"));
    const labels = computed(() => isGerman.value ? {
      accountId: "Account-ID",
      eyebrow: "DEIN SPIEL. DEIN CLIENT.", subtitle: "Dein Territorial.io-Spielbereich",
      multiplayer: "Mehrspieler", scenario: "Szenario", account: "Konto", menu: "Spielmenü",
      settings: "ZFX Client Einstellungen", customLobby: "Custom-Lobby beitreten oder erstellen",
      online: "Startklar", player: "Spielerprofil", changeName: "Namen ändern", nameTitle: "Spielername ändern",
      nameNote: "Bis zu 20 Zeichen. Clan-Tags wie [TAG] kannst du im Namen mit angeben.", save: "Speichern", cancel: "Zurück",
      nameReconnect: "Name gespeichert. Lobby wird neu verbunden …",
      nameHistory: "Zuletzt verwendete Namen", nameHistoryHint: "Ein Name in der Liste genügt zum direkten Wechsel.",
      nameMissing: "Das Namensfeld des Spiels ist gerade nicht verfügbar.", nameEmpty: "Bitte gib einen Namen ein.",
    } : {
      accountId: "Account ID",
      eyebrow: "YOUR GAME. YOUR CLIENT.", subtitle: "Your Territorial.io home",
      multiplayer: "Multiplayer", scenario: "Custom scenario", account: "My account", menu: "Game menu",
      settings: "ZFX Client settings", customLobby: "Join or create a custom lobby",
      online: "Ready to play", player: "Player profile", changeName: "Change name", nameTitle: "Change player name",
      nameNote: "Up to 20 characters. You can include clan tags like [TAG] in your name.", save: "Save name", cancel: "Back",
      nameReconnect: "Name saved. Reconnecting to the lobby …",
      nameHistory: "Recently used names", nameHistoryHint: "Select a name to switch back to it instantly.",
      nameMissing: "The game's name field is not available right now.", nameEmpty: "Enter a name first.",
    });
    let timer = 0;

    function refresh() {
      const game = window.__fx;
      const rawNames = game?.getGameVar?.("rawPlayerNames");
      const playerId = game?.getGameVar?.("playerId");
      const gameName = game?.getNativeHomeNameInput?.()?.value;
      const name = typeof gameName === "string" && gameName.trim()
        ? gameName
        : Array.isArray(rawNames) ? rawNames[playerId] : "";
      fullPlayerName.value = typeof name === "string" ? name : "";
      const tag = typeof name === "string" ? name.match(/^\s*\[([^\]]{1,8})\]\s*/) : null;
      profileName.value = typeof name === "string" ? name.replace(/^\s*\[[^\]]+\]\s*/, "").trim() : "";
      accountId.value = String(game?.getNativeAccountId?.() || "").trim();
      try { clan.value = game?.leaderboardFilter?.parseClanFromPlayerName?.(name) || tag?.[1]?.toUpperCase() || ""; }
      catch { clan.value = tag?.[1]?.toUpperCase() || ""; }
      const onHomeScreen = Number(game?.nativeMenuState) === 5 && Number(game?.getGameVar?.("gameState")) !== 1;
      visible.value = game?.settings?.customHomeView !== false && onHomeScreen;
    }

    function openNameEditor() {
      nameDraft.value = window.__fx?.getNativeHomeNameInput?.()?.value || fullPlayerName.value || profileName.value;
      nameStatus.value = "";
      loadNameHistory();
      rememberName(nameDraft.value);
      nameEditorOpen.value = true;
    }

    const NAME_HISTORY_KEY = "fx_player_name_history_v1";
    function loadNameHistory() {
      try {
        const saved = JSON.parse(localStorage.getItem(NAME_HISTORY_KEY) || "[]");
        nameHistory.value = Array.isArray(saved)
          ? [...new Set(saved.filter(name => typeof name === "string").map(name => name.trim().slice(0, 20)).filter(Boolean))].slice(0, 8)
          : [];
      } catch { nameHistory.value = []; }
    }

    function rememberName(name) {
      const normalized = String(name ?? "").trim().slice(0, 20);
      if (!normalized) return;
      nameHistory.value = [normalized, ...nameHistory.value.filter(entry => entry.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
      try { localStorage.setItem(NAME_HISTORY_KEY, JSON.stringify(nameHistory.value)); }
      catch { /* Keep the current session usable if local storage is unavailable. */ }
    }

    function saveName() {
      const value = nameDraft.value.trim().slice(0, 20);
      if (!value) { nameStatus.value = labels.value.nameEmpty; return; }
      const currentName = window.__fx?.getNativeHomeNameInput?.()?.value || fullPlayerName.value;
      if (value === currentName) { nameEditorOpen.value = false; return; }
      const reconnectNeeded = Number(window.__fx?.getGameVar?.("gameState")) !== 1
        && window.__fx?.isMultiplayerConnected?.() === true;
      const saved = window.__fx?.setNativeHomeName?.(value);
      if (!saved) { nameStatus.value = labels.value.nameMissing; return; }
      rememberName(value);
      if (reconnectNeeded && window.__fx?.reconnectMultiplayer?.()) {
        nameStatus.value = labels.value.nameReconnect;
        window.setTimeout(() => { nameEditorOpen.value = false; nameStatus.value = ""; }, 900);
      } else {
        nameEditorOpen.value = false;
        nameStatus.value = "";
      }
      window.setTimeout(refresh, 80);
    }

    const startMultiplayer = () => window.__fx?.startMultiplayer?.();
    const openScenario = () => window.__fx?.openCustomScenario?.();
    const openAccount = () => window.__fx?.openVueMyAccount?.();
    const openGameMenu = () => window.__fx?.openGameMenu?.();
    const openSettings = () => window.__fx?.openVueSettings?.();
    const openCustomLobby = () => window.__fx?.customLobby?.showJoinPrompt?.();

    onMounted(() => {
      refresh();
      timer = window.setInterval(refresh, 300);
      window.addEventListener("fx-native-menu-state-change", refresh);
      window.__fx.openPlayerNameView = openNameEditor;
    });
    onBeforeUnmount(() => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("fx-native-menu-state-change", refresh);
      if (window.__fx?.openPlayerNameView === openNameEditor) delete window.__fx.openPlayerNameView;
    });

    return {
      visible, nameEditorOpen, nameDraft, nameStatus, nameHistory, accountId, fullPlayerName, profileName, clan, labels,
      startMultiplayer, openScenario, openAccount, openGameMenu, openSettings, openCustomLobby,
      openNameEditor, saveName, selectHistoryName: name => { nameDraft.value = name; saveName(); },
      closeNameEditor: () => { nameEditorOpen.value = false; },
    };
  },
  template: `
    <main v-if="visible && !nameEditorOpen" id="fx-home-view" aria-label="ZFX Client home">
      <div class="fx-home-orb fx-home-orb-one"></div><div class="fx-home-orb fx-home-orb-two"></div>
      <section class="fx-home-shell">
        <header class="fx-home-header">
          <div class="fx-home-brand-mark" aria-hidden="true"><span>Z</span></div>
          <div class="fx-home-brand-copy"><small>ZFX CLIENT</small><h1>ZFX Client</h1><p>{{ labels.subtitle }}</p></div>
          <button type="button" class="fx-home-profile" :aria-label="labels.changeName" @click="openNameEditor">
            <span class="fx-home-profile-avatar">{{ (profileName || 'Z').slice(0, 1).toUpperCase() }}</span>
            <div><small>{{ labels.player }}</small><strong>{{ profileName || 'ZULUS' }}</strong><small v-if="accountId" class="fx-home-account-id">{{ labels.accountId }}: {{ accountId }}</small></div>
            <span v-if="clan" class="fx-home-clan">[{{ clan }}]</span>
            <span class="fx-home-profile-edit" aria-hidden="true">✎</span>
          </button>
        </header>
        <section class="fx-home-welcome">
          <div><span class="fx-home-eyebrow">{{ labels.eyebrow }}</span><h2>{{ isGerman ? 'Willkommen zurück' : 'Welcome back' }}</h2></div>
          <span class="fx-home-ready"><i></i>{{ labels.online }}</span>
        </section>
        <nav class="fx-home-actions" :aria-label="isGerman ? 'Hauptmenü' : 'Main menu'">
          <button type="button" class="fx-home-action is-primary" @click="startMultiplayer"><span class="fx-home-action-icon">⚔</span><span>{{ labels.multiplayer }}</span><b>›</b></button>
          <button type="button" class="fx-home-action is-scenario" @click="openScenario"><span class="fx-home-action-icon">✦</span><span>{{ labels.scenario }}</span><b>›</b></button>
          <button type="button" class="fx-home-action is-account" @click="openAccount"><span class="fx-home-action-icon">◉</span><span>{{ labels.account }}</span><b>›</b></button>
          <button type="button" class="fx-home-action is-menu" @click="openGameMenu"><span class="fx-home-action-icon">☰</span><span>{{ labels.menu }}</span><b>›</b></button>
        </nav>
        <footer class="fx-home-footer">
          <button type="button" class="fx-home-secondary" @click="openSettings"><span>⚙</span>{{ labels.settings }}</button>
          <button type="button" class="fx-home-secondary is-lobby" @click="openCustomLobby"><span>⌘</span>{{ labels.customLobby }}<b>›</b></button>
        </footer>
      </section>
    </main>
    <main v-else-if="nameEditorOpen" id="fx-home-view" class="is-name-view" aria-label="Change player name">
      <section class="fx-home-name-card">
        <button type="button" class="fx-home-back" @click="closeNameEditor">‹ {{ labels.cancel }}</button>
        <span class="fx-home-eyebrow">ZFX CLIENT · {{ labels.player.toUpperCase() }}</span>
        <h1>{{ labels.nameTitle }}</h1>
        <p>{{ labels.nameNote }}</p>
        <small v-if="accountId" class="fx-home-account-id">{{ labels.accountId }}: {{ accountId }}</small>
        <form class="fx-home-name-form" @submit.prevent="saveName">
          <label for="fx-home-name-input">{{ labels.player }}</label>
          <input id="fx-home-name-input" v-model="nameDraft" type="text" maxlength="20" autocomplete="off" spellcheck="false" autofocus>
          <small class="fx-home-name-length">{{ nameDraft.length }} / 20</small>
          <p v-if="nameStatus" class="fx-home-name-status" role="status">{{ nameStatus }}</p>
          <button type="submit" class="fx-home-name-save">{{ labels.save }}</button>
        </form>
        <section v-if="nameHistory.length" class="fx-home-name-history">
          <h2>{{ labels.nameHistory }}</h2>
          <p>{{ labels.nameHistoryHint }}</p>
          <div class="fx-home-name-history-list">
            <button v-for="name in nameHistory" :key="name" type="button" :disabled="name === (fullPlayerName || nameDraft)" @click="selectHistoryName(name)">{{ name }}</button>
          </div>
        </section>
      </section>
    </main>`,
});

export function createVueHomeView() {
  if (document.getElementById("fx-home-view-root")) return () => {};
  const host = document.createElement("div");
  host.id = "fx-home-view-root";
  document.body.appendChild(host);
  const app = createApp(FxHomeView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client HomeView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
