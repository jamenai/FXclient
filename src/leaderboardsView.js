import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

const CATEGORIES = [
  { id: 1, key: "clans", icon: "♧", en: "Clans", de: "Clans" },
  { id: 2, key: "clanMembers", icon: "♙", en: "Clan Members", de: "Clanmitglieder" },
  { id: 3, key: "admins", icon: "✦", en: "Admins", de: "Admins" },
  { id: 0, key: "oneVsOne", icon: "⚔", en: "1v1 Players", de: "1v1-Spieler" },
  { id: 9, key: "battleRoyale", icon: "◈", en: "Battle Royale", de: "Battle Royale" },
  { id: 10, key: "richest", icon: "◆", en: "Richest Players", de: "Reichste Spieler" },
  { id: 11, key: "patreon", icon: "✺", en: "Patreon Members", de: "Patreon-Mitglieder" },
  { id: 13, key: "zombies", icon: "☠", en: "Zombie Players", de: "Zombie-Spieler" },
];

const LeaderboardsView = defineComponent({
  name: "FxLeaderboardsView",
  setup() {
    const visible = ref(false);
    const language = ref("");
    const selectedCategory = ref(CATEGORIES[0]);
    const tables = ref({});
    const loading = ref(false);
    const closing = ref(false);
    const error = ref("");
    const rangeStart = ref(0);
    const rangeEnd = ref(10);
    const nameQuery = ref("");
    const nameQuantity = ref(10);
    const idQuery = ref("");
    const idQuantity = ref(5);
    const ownPlayerName = ref("");
    const ownClanName = ref("");
    let languageTimer = 0;
    let closeTimer = 0;
    let requestPending = false;
    let nativeTableOpen = false;
    const isGerman = computed(() => language.value.startsWith("de"));
    const labels = computed(() => isGerman.value ? {
      title: "Bestenlisten", subtitle: "Alle Ranglisten und Suchfilter an einem Ort.",
      range: "Rangbereich", from: "Startindex", to: "Endindex", loadRange: "Bereich laden",
      clanSearch: "Clanname", accountSearch: "Spielername", idSearch: "Account-ID",
      quickFind: "Schnell finden", findMe: "Mich finden", findMyClan: "Meinen Clan finden",
      playerUnavailable: "Dein Spielername ist gerade nicht verfügbar.", clanUnavailable: "Für deinen Namen wurde kein Clan-Tag gefunden.",
      quantity: "Anzahl", search: "Suchen", reset: "Zurücksetzen", previous: "Vorherige 10", next: "Nächste 10",
      loading: "Lade Rangliste …", empty: "Keine Einträge für diese Abfrage.", noData: "Wähle eine Rangliste aus, um Daten zu laden.",
      close: "Schließen", loadedRows: "Einträge", source: "Live-Daten aus dem Spiel", category: "Rangliste",
      searchPlaceholder: "Name eingeben", idPlaceholder: "5-stellige ID", noAdapter: "Die Ranglisten-Verbindung ist noch nicht bereit.",
    } : {
      title: "Leaderboards", subtitle: "All rankings and search filters in one place.",
      range: "Rank range", from: "Start index", to: "End index", loadRange: "Load range",
      clanSearch: "Clan name", accountSearch: "Player name", idSearch: "Account ID",
      quickFind: "Quick find", findMe: "Find me", findMyClan: "Find my clan",
      playerUnavailable: "Your player name is not available right now.", clanUnavailable: "No clan tag was found in your player name.",
      quantity: "Quantity", search: "Search", reset: "Reset", previous: "Previous 10", next: "Next 10",
      loading: "Loading leaderboard …", empty: "No entries for this query.", noData: "Choose a listing to load its data.",
      close: "Close", loadedRows: "entries", source: "Live data from the game", category: "Listing",
      searchPlaceholder: "Enter a name", idPlaceholder: "5-character ID", noAdapter: "The leaderboard connection is not ready yet.",
    });
    const currentTable = computed(() => tables.value[selectedCategory.value.id] || null);
    const currentCategoryName = computed(() => isGerman.value ? selectedCategory.value.de : selectedCategory.value.en);
    const nameFilterLabel = computed(() => selectedCategory.value.id === 1 ? labels.value.clanSearch : labels.value.accountSearch);
    const canFindPlayer = computed(() => selectedCategory.value.id !== 1);

    function refreshLanguage() {
      const selected = window.__fx?.getGameLanguage?.();
      if (selected !== undefined && selected !== null && String(selected).trim()) language.value = String(selected).toLowerCase();
      else if (!language.value) language.value = (navigator.language || "en").toLowerCase();
    }
    function refreshOwnIdentity() {
      const fx = window.__fx;
      const names = fx?.getGameVar?.("rawPlayerNames");
      const playerId = fx?.getGameVar?.("playerId");
      const nativeName = fx?.getNativeHomeNameInput?.()?.value;
      const name = (typeof nativeName === "string" && nativeName.trim())
        ? nativeName.trim()
        : (typeof names?.[playerId] === "string" ? names[playerId].trim() : "");
      ownPlayerName.value = name;
      ownClanName.value = fx?.leaderboardFilter?.parseClanFromPlayerName?.(name)
        || name.match(/^\s*\[([^\]]{1,8})\]/)?.[1]?.trim()
        || "";
    }
    function ensureAdapter() {
      const fx = window.__fx;
      if (typeof fx?.leaderboardsAdapter?.requestCategory !== "function") {
        // Initialize the game's request closure under the Vue dashboard.
        fx?.openGameMenuAction?.("leaderboard");
      }
      return fx?.leaderboardsAdapter;
    }
    function request(action) {
      const adapter = ensureAdapter();
      if (typeof adapter?.[action] !== "function") { error.value = labels.value.noAdapter; return false; }
      error.value = "";
      loading.value = true;
      requestPending = true;
      window.clearTimeout(closeTimer);
      window.__fx.leaderboardsViewActive = true;
      return adapter;
    }
    function leaveDashboard(returnDepth) {
      window.clearTimeout(closeTimer);
      window.__fx?.leaderboardsAdapter?.closeNative?.(returnDepth);
      requestPending = false;
      closing.value = false;
      loading.value = false;
      visible.value = false;
      nativeTableOpen = false;
      window.__fx.leaderboardsViewActive = false;
    }
    function receiveTable(table) {
      if (!table || !Number.isInteger(table.category) || !Array.isArray(table.rows)) return;
      tables.value = { ...tables.value, [table.category]: table };
      if (table.category === selectedCategory.value.id) loading.value = false;
      requestPending = false;
      nativeTableOpen = true;
      if (closing.value) window.setTimeout(() => { if (closing.value) leaveDashboard(3); }, 0);
    }
    function fetchCategory(categoryId) {
      const adapter = request("requestCategory");
      if (!adapter) return;
      if (nativeTableOpen) { adapter.closeNative?.(1); nativeTableOpen = false; }
      adapter.requestCategory(categoryId);
    }
    function selectCategory(category) {
      if (selectedCategory.value.id === category.id && currentTable.value) return;
      selectedCategory.value = category;
      rangeStart.value = 0;
      rangeEnd.value = 10;
      nameQuery.value = "";
      idQuery.value = "";
      fetchCategory(category.id);
    }
    function loadRange() {
      const start = Math.max(0, Math.floor(Number(rangeStart.value) || 0));
      const end = Math.max(start + 1, Math.floor(Number(rangeEnd.value) || start + 10));
      rangeStart.value = start;
      rangeEnd.value = end;
      request("requestRange")?.requestRange?.(selectedCategory.value.id, start, end);
    }
    function searchName() {
      const value = String(nameQuery.value || "").trim();
      if (!value) { error.value = labels.value.searchPlaceholder; return; }
      request("searchName")?.searchName?.(selectedCategory.value.id, value, nameQuantity.value);
    }
    function searchId() {
      const value = String(idQuery.value || "").trim();
      if (!value) { error.value = labels.value.idPlaceholder; return; }
      request("searchId")?.searchId?.(selectedCategory.value.id, value, idQuantity.value);
    }
    function findMe() {
      refreshOwnIdentity();
      if (!ownPlayerName.value) { error.value = labels.value.playerUnavailable; return; }
      nameQuery.value = ownPlayerName.value;
      searchName();
    }
    function findMyClan() {
      refreshOwnIdentity();
      if (!ownClanName.value) { error.value = labels.value.clanUnavailable; return; }
      nameQuery.value = ownClanName.value;
      searchName();
    }
    function page(delta) {
      const size = Math.max(1, Math.min(100, Math.floor(Number(rangeEnd.value) - Number(rangeStart.value)) || 10));
      const start = Math.max(0, Number(rangeStart.value) + delta * size);
      rangeStart.value = start;
      rangeEnd.value = start + size;
      loadRange();
    }
    function resetFilters() {
      rangeStart.value = 0; rangeEnd.value = 10;
      nameQuery.value = ""; nameQuantity.value = 10;
      idQuery.value = ""; idQuantity.value = 5;
      fetchCategory(selectedCategory.value.id);
    }
    function open() {
      refreshLanguage();
      refreshOwnIdentity();
      visible.value = true;
      error.value = "";
      window.__fx.leaderboardsViewActive = true;
      if (typeof window.__fx?.leaderboardsAdapter?.requestCategory === "function") {
        window.__fx.openGameMenuAction?.("leaderboard");
        nativeTableOpen = false;
      }
      const adapter = ensureAdapter();
      if (typeof adapter?.requestCategory === "function") fetchCategory(selectedCategory.value.id);
    }
    function close() {
      if (requestPending) {
        closing.value = true;
        error.value = isGerman.value ? "Schließe nach der aktuellen Antwort …" : "Closing after the current response …";
        closeTimer = window.setTimeout(() => {
          if (closing.value) leaveDashboard(nativeTableOpen ? 3 : 2);
        }, 8000);
        return;
      }
      leaveDashboard(nativeTableOpen ? 3 : 2);
    }
    function onKeyDown(event) { if (visible.value && event.key === "Escape") close(); }
    function onTable(event) { receiveTable(event.detail); }
    onMounted(() => {
      refreshLanguage();
      refreshOwnIdentity();
      languageTimer = window.setInterval(refreshLanguage, 500);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("fx-leaderboard-table", onTable);
      window.__fx.openVueLeaderboards = open;
      window.__fx.closeVueLeaderboards = close;
      const adapter = window.__fx.leaderboardsAdapter ||= {};
      adapter.receiveTable = receiveTable;
    });
    onBeforeUnmount(() => {
      window.clearInterval(languageTimer); window.clearTimeout(closeTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("fx-leaderboard-table", onTable);
      if (window.__fx?.openVueLeaderboards === open) delete window.__fx.openVueLeaderboards;
      if (window.__fx?.closeVueLeaderboards === close) delete window.__fx.closeVueLeaderboards;
      if (window.__fx?.leaderboardsAdapter?.receiveTable === receiveTable) delete window.__fx.leaderboardsAdapter.receiveTable;
      window.__fx.leaderboardsViewActive = false;
    });
    return { visible, CATEGORIES, selectedCategory, currentTable, currentCategoryName, labels, nameFilterLabel, loading, closing, error,
      rangeStart, rangeEnd, nameQuery, nameQuantity, idQuery, idQuantity, ownPlayerName, ownClanName, canFindPlayer, isGerman, selectCategory, loadRange, searchName, searchId, findMe, findMyClan, page, resetFilters, close };
  },
  template: `
    <div v-show="visible" class="fx-leaderboards-overlay" @pointerdown.self="close">
      <main class="fx-leaderboards-dashboard" role="dialog" aria-modal="true" aria-labelledby="fx-leaderboards-title">
        <header class="fx-leaderboards-header">
          <div class="fx-leaderboards-brand-mark" aria-hidden="true">🏆</div>
          <div><small>ZFX CLIENT · {{ labels.category.toUpperCase() }}</small><h1 id="fx-leaderboards-title">{{ labels.title }}</h1><p>{{ labels.subtitle }}</p></div>
          <button type="button" class="fx-leaderboards-close" :aria-label="labels.close" @click="close">×</button>
        </header>
        <div class="fx-leaderboards-layout">
          <nav class="fx-leaderboards-nav" :aria-label="labels.title">
            <button v-for="item in CATEGORIES" :key="item.id" type="button" class="fx-leaderboards-nav-item" :class="{ 'is-active': selectedCategory.id === item.id }" @click="selectCategory(item)">
              <span aria-hidden="true">{{ item.icon }}</span><strong>{{ isGerman ? item.de : item.en }}</strong><i>›</i>
            </button>
          </nav>
          <section class="fx-leaderboards-main">
            <div class="fx-leaderboards-listing-heading"><div><span class="fx-leaderboards-eyebrow">{{ labels.category }}</span><h2>{{ currentCategoryName }}</h2></div><span class="fx-leaderboards-row-count">{{ currentTable?.rows?.length || 0 }} {{ labels.loadedRows }}</span></div>
            <div class="fx-leaderboards-quick-find" role="group" :aria-label="labels.quickFind"><span>{{ labels.quickFind }}</span><button v-if="canFindPlayer" type="button" :disabled="!ownPlayerName || loading" @click="findMe">⌕ {{ labels.findMe }}</button><button type="button" :disabled="!ownClanName || loading" @click="findMyClan">⌕ {{ labels.findMyClan }}<template v-if="ownClanName"> · [{{ ownClanName }}]</template></button></div>
            <div class="fx-leaderboards-filters">
              <form class="fx-leaderboards-filter-card is-range" @submit.prevent="loadRange">
                <strong>{{ labels.range }}</strong><div class="fx-leaderboards-filter-fields"><label><span>{{ labels.from }}</span><input v-model.number="rangeStart" type="number" min="0"></label><label><span>{{ labels.to }}</span><input v-model.number="rangeEnd" type="number" min="1"></label><button type="submit">{{ labels.loadRange }}</button></div>
              </form>
              <form class="fx-leaderboards-filter-card" @submit.prevent="searchName">
                <strong>{{ nameFilterLabel }}</strong><div class="fx-leaderboards-filter-fields"><label class="is-grow"><span>{{ nameFilterLabel }}</span><input v-model="nameQuery" type="search" :placeholder="labels.searchPlaceholder" maxlength="20"></label><label class="is-quantity"><span>{{ labels.quantity }}</span><input v-model.number="nameQuantity" type="number" min="1" max="100"></label><button type="submit">{{ labels.search }}</button></div>
              </form>
              <form class="fx-leaderboards-filter-card" @submit.prevent="searchId">
                <strong>{{ labels.idSearch }}</strong><div class="fx-leaderboards-filter-fields"><label class="is-grow"><span>{{ labels.idSearch }}</span><input v-model="idQuery" type="search" :placeholder="labels.idPlaceholder" maxlength="5"></label><label class="is-quantity"><span>{{ labels.quantity }}</span><input v-model.number="idQuantity" type="number" min="1" max="100"></label><button type="submit">{{ labels.search }}</button></div>
              </form>
            </div>
            <p v-if="error" class="fx-leaderboards-status" role="status">{{ error }}</p>
            <section class="fx-leaderboards-table-card">
              <div v-if="loading" class="fx-leaderboards-table-state"><span class="fx-leaderboards-spinner"></span>{{ labels.loading }}</div>
              <div v-else-if="!currentTable" class="fx-leaderboards-table-state">{{ labels.noData }}</div>
              <div v-else-if="!currentTable.rows.length" class="fx-leaderboards-table-state">{{ labels.empty }}</div>
              <div v-else class="fx-leaderboards-table-scroll"><table><thead><tr><th v-for="(header, index) in currentTable.headers" :key="index" :style="{ width: (currentTable.widths?.[index] || (100 / currentTable.headers.length)) + '%' }">{{ header.replace(' ↗', '') }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in currentTable.rows" :key="rowIndex"><td v-for="(cell, cellIndex) in row" :key="cellIndex" :class="{ 'is-link': cell.interactive }">{{ cell.text.replace(/<[^>]*>/g, '') }}</td></tr></tbody></table></div>
              <footer v-if="currentTable?.rows?.length" class="fx-leaderboards-table-footer"><button type="button" :disabled="rangeStart <= 0 || loading" @click="page(-1)">‹ {{ labels.previous }}</button><span>{{ rangeStart }}–{{ rangeEnd }}</span><button type="button" :disabled="loading" @click="page(1)">{{ labels.next }} ›</button></footer>
            </section>
            <footer class="fx-leaderboards-main-footer"><span><i></i>{{ labels.source }}</span><button type="button" class="fx-leaderboards-reset" @click="resetFilters">{{ labels.reset }}</button></footer>
          </section>
        </div>
      </main>
    </div>`,
});

export function createVueLeaderboardsView() {
  if (document.getElementById("fx-leaderboards-view-root")) return () => {};
  const host = document.createElement("div"); host.id = "fx-leaderboards-view-root"; document.body.appendChild(host);
  const app = createApp(LeaderboardsView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client LeaderboardsView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
