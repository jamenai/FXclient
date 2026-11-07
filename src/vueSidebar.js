import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import versionData from "../version.json";

const STORAGE_KEY = "fx_sidebar_collapsed";
const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 260;
const RANK_TIERS = [
  { minimumRating: 9.5, key: "sidebarRankObsidian", icon: "obsidian.svg" },
  { minimumRating: 9, key: "sidebarRankDiamond", icon: "diamond.svg" },
  { minimumRating: 8, key: "sidebarRankPlatinum", icon: "platinum.svg" },
  { minimumRating: 6, key: "sidebarRankGold", icon: "gold.svg" },
  { minimumRating: 4, key: "sidebarRankSilver", icon: "silver.svg" },
  { minimumRating: -Infinity, key: "sidebarRankBronze", icon: "bronze.svg" },
];
const RANK_ANCHORS = [{ rank: 1, rating: 10 }, { rank: 150, rating: 9 }, { rank: 500, rating: 8 },
  { rank: 2000, rating: 6 }, { rank: 10000, rating: 4 }, { rank: 50000, rating: 1 }];
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
function rankToRating(rank) {
  if (rank <= RANK_ANCHORS[0].rank) return RANK_ANCHORS[0].rating;
  for (let index = 1; index < RANK_ANCHORS.length; index += 1) {
    const upper = RANK_ANCHORS[index];
    if (rank <= upper.rank) {
      const lower = RANK_ANCHORS[index - 1];
      const progress = (Math.log10(rank) - Math.log10(lower.rank)) / (Math.log10(upper.rank) - Math.log10(lower.rank));
      return lower.rating + progress * (upper.rating - lower.rating);
    }
  }
  return RANK_ANCHORS.at(-1).rating;
}

const VueSidebar = defineComponent({
  name: "FxVueSidebar",
  setup() {
    const mode = ref(localStorage.getItem(STORAGE_KEY) || (window.innerWidth < 900 ? "collapsed" : "expanded"));
    const enabled = ref(window.__fx?.settings?.showSidebar !== false);
    const languageVersion = ref(0);
    const profileVersion = ref(0);
    const accountId = ref("");
    const gameState = ref(0);
    const lobbyRating = ref(null);
    const root = ref(null);
    const clockSlot = ref(null);
    let timer = 0;
    const width = computed(() => !enabled.value || mode.value === "hidden" ? 0
      : mode.value === "expanded" ? Math.min(EXPANDED_WIDTH, Math.max(160, window.innerWidth * .32)) : COLLAPSED_WIDTH);
    const t = key => {
      languageVersion.value;
      return window.__fx?.translateFX?.(key) ?? key;
    };
    const playerName = computed(() => {
      profileVersion.value;
      const nativeName = window.__fx?.getNativeHomeNameInput?.()?.value;
      if (typeof nativeName === "string" && nativeName.trim()) return nativeName;
      const names = window.__fx?.getGameVar?.("rawPlayerNames");
      const playerId = window.__fx?.getGameVar?.("playerId");
      return Array.isArray(names) && Number.isInteger(playerId) ? names[playerId] || "" : "";
    });
    const clanName = computed(() => {
      const parseClan = window.__fx?.leaderboardFilter?.parseClanFromPlayerName;
      if (typeof parseClan !== "function" || !playerName.value) return "";
      try { return parseClan(playerName.value) || ""; } catch { return ""; }
    });
    const openNativeAction = action => () => {
      if (window.__fx?.isCustomLobbyViewVisible?.()) window.__fx.hideCustomLobbyView?.();
      window.requestAnimationFrame(() => action());
    };
    const openPlayerNameView = () => window.__fx?.openPlayerNameView?.();
    const sections = computed(() => [
      { title: t("sidebarGeneralGroup"), items: [
        { icon: "⌂", label: t("sidebarHome"), action: openNativeAction(() => window.__fx?.openHome?.()) },
        { icon: "⚔", label: t("sidebarMultiplayer"), action: openNativeAction(() => window.__fx?.startMultiplayer?.()) },
        { icon: "🏆", label: t("sidebarLeaderboard"), action: () => window.__fx?.openVueLeaderboards?.() },
        { icon: "▶", label: t("sidebarReplays"), action: () => window.__fx?.openVueReplays?.() },
        { icon: "▤", label: t("sidebarLogs"), action: () => window.__fx?.openVueLogs?.() },
      ] },
      { title: t("sidebarAccountGroup"), items: [
        { icon: "⚙", label: t("sidebarGameSettings"), action: () => window.__fx?.openVueGameSettings?.() },
        { icon: "⚙", label: t("sidebarSettings"), action: () => window.__fx?.openVueSettings?.() },
        { icon: "account", label: t("sidebarAccount"), action: () => window.__fx?.openVueMyAccount?.() },
        { icon: "◆", label: t("sidebarGoldTransfer"), action: openNativeAction(() => window.__fx?.openGameMenuAction?.("goldTransfer")) },
      ] },
    ]);
    const isCollapsed = computed(() => mode.value !== "expanded" || window.innerWidth < 700);

    function refresh() {
      languageVersion.value += 1;
      profileVersion.value += 1;
      accountId.value = String(window.__fx?.getNativeAccountId?.() || "").trim();
      gameState.value = Number(window.__fx?.getGameVar?.("gameState") || 0);
      const rows = [...document.querySelectorAll('[data-fx-lobby-player="true"]')];
      if (rows.length) {
        const ranks = rows.filter(row => row.dataset.fxLobbyReady === "ready")
          .map(row => Number(row.dataset.fxRank)).filter(rank => Number.isFinite(rank) && rank > 0);
        if (ranks.length) {
          const medianRank = Math.round(median(ranks));
          const playerRatings = ranks.map(rankToRating);
          const strongestRatings = [...playerRatings].sort((a, b) => b - a).slice(0, Math.max(1, Math.ceil(playerRatings.length * .25)));
          const top10 = ranks.filter(rank => rank <= 10).length;
          const top100 = ranks.filter(rank => rank <= 100).length;
          const minimumRating = top10 >= 2 ? 8 : top100 >= 2 ? 6 : top10 >= 1 ? 4 : 1;
          const bonus = Math.min(1.5, ranks.reduce((sum, rank) => sum + (rank <= 10 ? .15 : rank <= 100 ? .12 : rank <= 250 ? .08 : rank <= 500 ? .04 : 0), 0));
          const value = Math.min(10, Math.max(median(playerRatings) * .4
            + strongestRatings.reduce((sum, rating) => sum + rating, 0) / strongestRatings.length * .6, minimumRating) + bonus);
          const tier = RANK_TIERS.find(item => value >= item.minimumRating);
          const format = number => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number);
          const formattedRating = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
          const tierName = t(tier.key);
          lobbyRating.value = {
            value: formattedRating,
            image: new URL(`rank-badges/${tier.icon}`, document.querySelector('link[rel="stylesheet"][href*="main.css"]')?.href ?? window.location.href).href,
            meta: t("sidebarReadySkillMeta").replace("{tier}", tierName).replace("{rank}", new Intl.NumberFormat().format(medianRank)),
            title: t("sidebarReadySkillTitle").replace("{count}", String(ranks.length)).replace("{tier}", tierName)
              .replace("{rating}", formattedRating).replace("{rank}", new Intl.NumberFormat().format(medianRank)),
          };
        } else lobbyRating.value = null;
      } else {
        lobbyRating.value = null;
      }
    }
    function setMode(next) {
      mode.value = next;
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep state for this page. */ }
      document.documentElement.style.setProperty("--fx-sidebar-width", `${width.value}px`);
      document.documentElement.dataset.fxSidebarHidden = String(!enabled.value || next === "hidden");
    }
    onMounted(() => {
      setMode(mode.value);
      refresh();
      timer = window.setInterval(refresh, 1000);
    });
    onBeforeUnmount(() => { if (timer) window.clearInterval(timer); });

    const api = {
      getWidth: () => width.value,
      toGameX(input, event = input) {
        const canvas = document.getElementById("canvasA");
        const target = event?.target ?? input?.target;
        return Number.isFinite(input?.clientX) && target === canvas ? input.clientX - width.value : input?.clientX;
      },
      getClockSlot: () => clockSlot.value,
      setEnabled(value) { enabled.value = value !== false; setMode(mode.value); },
      isEnabled: () => enabled.value,
      requestResize() {},
      setResizeHandler() {},
      isCollapsed: () => isCollapsed.value,
      refreshTranslations: refresh,
      getLobbyRating: () => lobbyRating.value,
    };
    window.__fx.vueSidebarApi = api;

    return { root, clockSlot, mode, enabled, width, playerName, clanName, accountId, sections, gameState, isCollapsed, t, setMode, refresh, openPlayerNameView,
      customLobbyView: window.__fx?.settings?.customLobbyView === true };
  },
  template: `
    <aside id="fx-sidebar" ref="root" class="fx-vue-sidebar" :class="{'is-collapsed': isCollapsed, 'is-expanded': mode === 'expanded'}"
      :hidden="!enabled || mode === 'hidden'" :style="{width: width + 'px'}" :aria-label="t('sidebarSettings')">
      <header class="fx-vue-sidebar-brand"><span class="fx-vue-sidebar-crown">♛</span><div><strong>ZULUS ZFX</strong><small>Territorial.io Enhanced</small></div></header>
      <div ref="clockSlot" class="fx-sidebar-clock"></div>
      <button type="button" class="fx-vue-sidebar-profile" :title="t('sidebarEditPlayerName')" :aria-label="t('sidebarEditPlayerName')" @click="openPlayerNameView">
        <div class="fx-vue-sidebar-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg></div>
        <div class="fx-vue-sidebar-profile-copy"><strong :title="playerName">{{ playerName || 'ZULUS' }}</strong><span><i></i>{{ gameState === 1 ? t('sidebarInGame') : t('sidebarLobbyLabel') }}</span><small v-if="accountId" class="fx-vue-sidebar-account-id">{{ t('sidebarAccountId') }}: {{ accountId }}</small></div>
        <small v-if="clanName && !/^\s*\[[^\]]+\]/.test(playerName)" class="fx-vue-sidebar-clan">[{{ clanName }}]</small>
      </button>
      <nav class="fx-vue-sidebar-navigation" :hidden="gameState === 1" :aria-hidden="gameState === 1">
        <section v-for="(section, sectionIndex) in sections" :key="section.title" class="fx-vue-sidebar-section">
          <h2>{{ section.title }}</h2>
          <button v-for="item in section.items" :key="item.label" type="button" class="fx-sidebar-button fx-sidebar-action"
            :class="{'is-current': item.label === t('sidebarLobbyLabel') && customLobbyView}"
            :title="item.label" :aria-label="item.label" @click="item.action">
            <span class="fx-sidebar-icon" aria-hidden="true"><svg v-if="item.icon === 'account'" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg><template v-else>{{ item.icon }}</template></span><span class="fx-sidebar-label">{{ item.label }}</span>
          </button>
        </section>
      </nav>
      <footer class="fx-vue-sidebar-footer"><span>●</span> v{{ version }}</footer>
      <div class="fx-sidebar-mode-actions">
        <button type="button" class="fx-sidebar-button fx-sidebar-mode-action" @click="setMode(mode === 'expanded' ? 'collapsed' : 'expanded')">{{ mode === 'expanded' ? '‹' : '›' }} <span>{{ t(mode === 'expanded' ? 'sidebarModeCompact' : 'sidebarModeExpanded') }}</span></button>
        <button type="button" class="fx-sidebar-button fx-sidebar-mode-action" @click="setMode('hidden')">× <span>{{ t('sidebarModeHidden') }}</span></button>
      </div>
    </aside>
    <button v-if="enabled && mode === 'hidden'" id="fx-sidebar-restore" class="fx-vue-sidebar-restore" type="button" :aria-label="t('sidebarShow')" :title="t('sidebarShow')" @click="setMode('expanded')"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m4-10 3 2-3 2"/></svg><span>{{ t('sidebarShow') }}</span></button>` ,
  data() { return { version: versionData.version }; },
});

export function createVueSidebar() {
  const shell = document.getElementById("fx-game-shell");
  const host = document.createElement("div");
  host.style.display = "contents";
  const nativeAppendChild = document.body.appendChild.bind(document.body);
  nativeAppendChild(host);
  const app = createApp(VueSidebar);
  const instance = app.mount(host);
  const nativeRemoveChild = document.body.removeChild.bind(document.body);
  document.body.appendChild = node => node === host || node === shell
    ? nativeAppendChild(node)
    : shell ? shell.appendChild(node) : nativeAppendChild(node);
  document.body.removeChild = node => node.parentNode === shell
    ? shell.removeChild(node)
    : nativeRemoveChild(node);
  const api = window.__fx.vueSidebarApi;
  return api || {
    getWidth: () => 0, toGameX: input => input?.clientX, getClockSlot: () => null,
    setEnabled() {}, isEnabled: () => false, requestResize() {}, setResizeHandler() {}, isCollapsed: () => true,
  };
}
