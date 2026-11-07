import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

const CATEGORIES = [
  { id: 5, icon: "⚖", en: "Admin elections", de: "Admin-Wahlen" },
  { id: 6, icon: "⛓", en: "Blockchain", de: "Blockchain" },
  { id: 7, icon: "♛", en: "Clan leader elections", de: "Clanführer-Wahlen" },
  { id: 12, icon: "◷", en: "Audit log", de: "Prüfprotokoll" },
];

const LogsView = defineComponent({
  name: "FxLogsView",
  setup() {
    const visible = ref(false);
    const language = ref("en");
    const selectedCategory = ref(CATEGORIES[0]);
    const tables = ref({});
    const loading = ref(false);
    const error = ref("");
    const start = ref(0);
    const rangeStart = ref(0);
    const rangeEnd = ref(10);
    const nameQuery = ref("");
    const nameQuantity = ref(10);
    const accountQuery = ref("");
    const accountQuantity = ref(5);
    const pageSize = 10;
    let languageTimer = 0;
    let requestPending = false;
    let nativeTableOpen = false;
    const isGerman = computed(() => language.value.startsWith("de"));
    const labels = computed(() => isGerman.value ? {
      title: "Spielprotokolle", subtitle: "Aktuelle Protokolle direkt aus dem Spiel.", close: "Schließen",
      loading: "Protokoll wird geladen …", empty: "Keine Einträge für diese Seite.", choose: "Wähle eine Protokollkategorie.",
      source: "Live-Daten aus dem Spiel", previous: "Zurück", next: "Weiter", rows: "Einträge", unavailable: "Die Protokoll-Verbindung ist noch nicht bereit.",
      range: "Indexbereich", from: "Startindex", to: "Endindex", loadRange: "Laden", username: "Username-Suche", account: "Accountname-Suche", quantity: "Anzahl", search: "Suchen", usernamePlaceholder: "Username eingeben", accountPlaceholder: "Accountname eingeben", reset: "Filter zurücksetzen",
    } : {
      title: "Logs", subtitle: "Live game records in a dedicated view.", close: "Close",
      loading: "Loading log …", empty: "No entries on this page.", choose: "Choose a log category.",
      source: "Live data from the game", previous: "Previous", next: "Next", rows: "entries", unavailable: "The log connection is not ready yet.",
      range: "Index range", from: "Start index", to: "End index", loadRange: "Load", username: "Username search", account: "Account name search", quantity: "Quantity", search: "Search", usernamePlaceholder: "Enter username", accountPlaceholder: "Enter account name", reset: "Reset filters",
    });
    const currentTable = computed(() => tables.value[selectedCategory.value.id] || null);
    const categoryName = computed(() => isGerman.value ? selectedCategory.value.de : selectedCategory.value.en);

    function refreshLanguage() {
      const gameLanguage = window.__fx?.getGameLanguage?.();
      if (gameLanguage) language.value = String(gameLanguage).toLowerCase();
    }
    function requestPage(offset = start.value, adapterAttempts = 0) {
      const adapter = window.__fx?.logsAdapter;
      if (typeof adapter?.requestCategory !== "function") {
        if (visible.value && adapterAttempts < 40) {
          window.setTimeout(() => requestPage(offset, adapterAttempts + 1), 100);
          return;
        }
        error.value = labels.value.unavailable;
        return;
      }
      if (nativeTableOpen) {
        adapter.closeNative?.(1);
        nativeTableOpen = false;
      }
      error.value = "";
      start.value = Math.max(0, Math.floor(Number(offset) || 0));
      loading.value = true;
      requestPending = true;
      adapter.requestCategory(selectedCategory.value.id, start.value, start.value + pageSize);
    }
    function requestFiltered(action, values, adapterAttempts = 0) {
      const adapter = window.__fx?.logsAdapter;
      if (typeof adapter?.[action] !== "function") {
        if (visible.value && adapterAttempts < 40) {
          window.setTimeout(() => requestFiltered(action, values, adapterAttempts + 1), 100);
          return;
        }
        error.value = labels.value.unavailable;
        return;
      }
      if (nativeTableOpen) {
        adapter.closeNative?.(1);
        nativeTableOpen = false;
      }
      error.value = "";
      loading.value = true;
      requestPending = true;
      adapter[action](selectedCategory.value.id, ...values);
    }
    function loadRange() {
      const from = Math.max(0, Math.floor(Number(rangeStart.value) || 0));
      const to = Math.max(from + 1, Math.floor(Number(rangeEnd.value) || from + pageSize));
      rangeStart.value = start.value = from;
      rangeEnd.value = to;
      requestFiltered("requestRange", [from, to]);
    }
    function searchUsername() {
      const query = String(nameQuery.value || "").trim();
      if (!query) { error.value = labels.value.usernamePlaceholder; return; }
      start.value = 0;
      requestFiltered("searchName", [query, nameQuantity.value]);
    }
    function searchAccount() {
      const query = String(accountQuery.value || "").trim();
      if (!query) { error.value = labels.value.accountPlaceholder; return; }
      start.value = 0;
      requestFiltered("searchId", [query, accountQuantity.value]);
    }
    function resetFilters() {
      rangeStart.value = start.value = 0;
      rangeEnd.value = 10;
      nameQuery.value = "";
      nameQuantity.value = 10;
      accountQuery.value = "";
      accountQuantity.value = 5;
      requestPage(0);
    }
    function receiveTable(table) {
      if (!table || !Number.isInteger(table.category) || !Array.isArray(table.rows)) return;
      tables.value = { ...tables.value, [table.category]: table };
      if (table.category === selectedCategory.value.id) loading.value = false;
      requestPending = false;
      nativeTableOpen = true;
    }
    function selectCategory(category) {
      if (selectedCategory.value.id === category.id && currentTable.value) return;
      selectedCategory.value = category;
      start.value = 0;
      requestPage(0);
    }
    function close() {
      if (requestPending) {
        error.value = isGerman.value ? "Schließe nach der aktuellen Antwort …" : "Closing after the current response …";
        window.setTimeout(() => leaveView(nativeTableOpen ? 3 : 2), 1500);
        return;
      }
      leaveView(nativeTableOpen ? 3 : 2);
    }
    function leaveView(returnDepth) {
      window.__fx?.logsAdapter?.closeNative?.(returnDepth);
      requestPending = false;
      nativeTableOpen = false;
      loading.value = false;
      visible.value = false;
      window.__fx.logsViewActive = false;
    }
    function open() {
      refreshLanguage();
      visible.value = true;
      error.value = "";
      window.__fx.logsViewActive = true;
      window.__fx.openGameMenuAction?.("logs");
      requestPage(0);
    }
    function page(delta) {
      const from = Math.max(0, start.value + delta * pageSize);
      rangeStart.value = from;
      rangeEnd.value = from + pageSize;
      start.value = from;
      requestFiltered("requestRange", [from, from + pageSize]);
    }
    function onTable(event) { receiveTable(event.detail); }
    function onKeyDown(event) { if (visible.value && event.key === "Escape") close(); }
    onMounted(() => {
      refreshLanguage();
      languageTimer = window.setInterval(refreshLanguage, 500);
      window.addEventListener("fx-logs-table", onTable);
      window.addEventListener("keydown", onKeyDown);
      window.__fx.openVueLogs = open;
      const adapter = window.__fx.logsAdapter ||= {};
      adapter.receiveTable = receiveTable;
    });
    onBeforeUnmount(() => {
      window.clearInterval(languageTimer);
      window.removeEventListener("fx-logs-table", onTable);
      window.removeEventListener("keydown", onKeyDown);
      if (window.__fx?.openVueLogs === open) delete window.__fx.openVueLogs;
      if (window.__fx?.logsAdapter?.receiveTable === receiveTable) delete window.__fx.logsAdapter.receiveTable;
      window.__fx.logsViewActive = false;
    });
    return { visible, CATEGORIES, selectedCategory, categoryName, currentTable, labels, isGerman, loading, error, start, pageSize,
      rangeStart, rangeEnd, nameQuery, nameQuantity, accountQuery, accountQuantity,
      selectCategory, loadRange, searchUsername, searchAccount, resetFilters, page, close };
  },
  template: `
    <div v-show="visible" class="fx-logs-overlay" @pointerdown.self="close">
      <main class="fx-logs-dashboard" role="dialog" aria-modal="true" aria-labelledby="fx-logs-title">
        <header class="fx-logs-header">
          <div class="fx-logs-brand-mark" aria-hidden="true">📜</div>
          <div><small>ZFX CLIENT · LIVE DATA</small><h1 id="fx-logs-title">{{ labels.title }}</h1><p>{{ labels.subtitle }}</p></div>
          <button type="button" class="fx-logs-close" :aria-label="labels.close" @click="close">×</button>
        </header>
        <div class="fx-logs-layout">
          <nav class="fx-logs-nav" :aria-label="labels.title">
            <button v-for="item in CATEGORIES" :key="item.id" type="button" class="fx-logs-nav-item" :class="{ 'is-active': selectedCategory.id === item.id }" @click="selectCategory(item)">
              <span aria-hidden="true">{{ item.icon }}</span><strong>{{ isGerman ? item.de : item.en }}</strong><i>›</i>
            </button>
          </nav>
          <section class="fx-logs-main">
            <div class="fx-logs-heading"><div><span class="fx-logs-eyebrow">{{ labels.title }}</span><h2>{{ categoryName }}</h2></div><span class="fx-logs-count">{{ currentTable?.rows?.length || 0 }} {{ labels.rows }}</span></div>
            <div class="fx-logs-filters">
              <form class="fx-logs-filter-card is-range" @submit.prevent="loadRange">
                <strong>{{ labels.range }}</strong><div class="fx-logs-filter-fields"><label><span>{{ labels.from }}</span><input v-model.number="rangeStart" type="number" min="0"></label><label><span>{{ labels.to }}</span><input v-model.number="rangeEnd" type="number" min="1"></label><button type="submit">{{ labels.loadRange }}</button></div>
              </form>
              <form class="fx-logs-filter-card" @submit.prevent="searchUsername">
                <strong>{{ labels.username }}</strong><div class="fx-logs-filter-fields"><label class="is-grow"><span>{{ labels.username }}</span><input v-model="nameQuery" type="search" :placeholder="labels.usernamePlaceholder" maxlength="20"></label><label class="is-quantity"><span>{{ labels.quantity }}</span><input v-model.number="nameQuantity" type="number" min="1" max="100"></label><button type="submit">{{ labels.search }}</button></div>
              </form>
              <form class="fx-logs-filter-card" @submit.prevent="searchAccount">
                <strong>{{ labels.account }}</strong><div class="fx-logs-filter-fields"><label class="is-grow"><span>{{ labels.account }}</span><input v-model="accountQuery" type="search" :placeholder="labels.accountPlaceholder" maxlength="20"></label><label class="is-quantity"><span>{{ labels.quantity }}</span><input v-model.number="accountQuantity" type="number" min="1" max="100"></label><button type="submit">{{ labels.search }}</button></div>
              </form>
            </div>
            <section class="fx-logs-table-card">
              <div v-if="loading" class="fx-logs-state"><span class="fx-logs-spinner"></span>{{ labels.loading }}</div>
              <div v-else-if="error" class="fx-logs-state is-error" role="status">{{ error }}</div>
              <div v-else-if="!currentTable" class="fx-logs-state">{{ labels.choose }}</div>
              <div v-else-if="!currentTable.rows.length" class="fx-logs-state">{{ labels.empty }}</div>
              <div v-else class="fx-logs-table-scroll"><table><thead><tr><th v-for="(header, index) in currentTable.headers" :key="index" :style="{ width: (currentTable.widths?.[index] || (100 / currentTable.headers.length)) + '%' }">{{ header.replace(' ↗', '') }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in currentTable.rows" :key="rowIndex"><td v-for="(cell, cellIndex) in row" :key="cellIndex" :class="{ 'is-link': cell.interactive }">{{ cell.text.replace(/<[^>]*>/g, '') }}</td></tr></tbody></table></div>
              <footer v-if="currentTable?.rows?.length" class="fx-logs-pagination"><button type="button" :disabled="start <= 0 || loading" @click="page(-1)">‹ {{ labels.previous }}</button><span>{{ start + 1 }}–{{ start + currentTable.rows.length }}</span><button type="button" :disabled="loading || currentTable.rows.length < pageSize" @click="page(1)">{{ labels.next }} ›</button></footer>
            </section>
            <footer class="fx-logs-footer"><span><i></i>{{ labels.source }}</span><button type="button" @click="resetFilters">{{ labels.reset }}</button></footer>
          </section>
        </div>
      </main>
    </div>`,
});

export function createVueLogsView() {
  if (document.getElementById("fx-logs-view-root")) return () => {};
  const host = document.createElement("div");
  host.id = "fx-logs-view-root";
  document.body.appendChild(host);
  const app = createApp(LogsView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client LogsView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
