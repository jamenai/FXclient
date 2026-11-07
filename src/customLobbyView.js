import {
  computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch,
} from "vue/dist/vue.esm-bundler.js";
import { createApp, h } from "vue/dist/vue.esm-bundler.js";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { createLobbyDataAdapter } from "./lobbyDataAdapter.js";
import { calculateLobbyRating } from "./lobbyRating.js";
import { ClanOverview, LobbyProgress, MapHeader, PlayerList } from "./lobbyComponents.js";

const APP_ID = "fx-app-mount";
const LOBBY_VIEW_MIGRATION_KEY = "fx_custom_lobby_view_enabled_v1";
const lastDiagnostic = new Map();

function logLobbyDiagnostic(stage, signature, details) {
  if (lastDiagnostic.get(stage) === signature) return;
  lastDiagnostic.set(stage, signature);
  console.log(`[ZFX Client LobbyView] ${stage}`, details);
}

function migrateLobbyViewPreference() {
  try {
    if (localStorage.getItem(LOBBY_VIEW_MIGRATION_KEY) === "done") return;
    const settings = window.__fx?.settings;
    if (!settings) return;
    // The Vue lobby view replaces the former preview. Enable it once for existing
    // installs that persisted the old default-off value; users can still turn it off.
    settings.customLobbyView = true;
    localStorage.setItem("fx_settings", JSON.stringify(settings));
    localStorage.setItem(LOBBY_VIEW_MIGRATION_KEY, "done");
    console.log("[ZFX Client LobbyView] Migrated saved preference to enabled.");
  } catch { /* Keep startup resilient when storage is unavailable. */ }
}

function cleanText(element) {
  return element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function resolveLobbyChatMentions(text) {
  return String(text ?? "").replace(/@([a-zA-Z0-9_-]{5})(?=$|[\s:!.?,)])/g, (token, shortId) => {
    const playerName = window.__fx?.resolveLobbyChatMention?.(shortId);
    return playerName ? `@${playerName}` : token;
  });
}

function resolveLobbyChatSegments(text) {
  const source = String(text ?? "");
  const segments = [];
  const mentionPattern = /@([a-zA-Z0-9_-]{5})(?=$|[\s:!.?,)])/g;
  let previousEnd = 0;
  let match;
  while ((match = mentionPattern.exec(source))) {
    if (match.index > previousEnd) segments.push({ text: source.slice(previousEnd, match.index) });
    const playerName = window.__fx?.resolveLobbyChatMention?.(match[1]);
    if (playerName) {
      segments.push({
        text: `@${playerName}`,
        color: window.__fx?.resolveLobbyChatMentionColor?.(match[1]) || "",
      });
    } else segments.push({ text: match[0] });
    previousEnd = match.index + match[0].length;
  }
  if (previousEnd < source.length || segments.length === 0) segments.push({ text: source.slice(previousEnd) });
  return segments;
}

function getLobbyList(scope) {
  return Array.from(scope.querySelectorAll("div"))
    .map(element => ({
      element,
      rows: Array.from(element.children).filter(child => child instanceof HTMLSpanElement
        && (child.dataset.fxLobbyPlayer === "true"
          || Boolean(child.dataset.fxAccountName)
          || /^[🟢⚪]\s*/u.test(cleanText(child)))),
    }))
    .filter(candidate => candidate.rows.length > 0)
    .sort((a, b) => b.rows.length - a.rows.length)[0] ?? null;
}

function getLobbyRoot(list) {
  let root = list.parentElement;
  for (let depth = 0; root?.parentElement && depth < 2; depth++) root = root.parentElement;
  return root;
}

function findLobbyRoot(scope) {
  const modeTab = scope.querySelector(".fx-lobby-mode-tab");
  for (let candidate = modeTab; candidate && candidate !== scope; candidate = candidate.parentElement) {
    if (candidate.children.length === 7 && candidate.children[1]?.contains(modeTab) && candidate.children[6]) return candidate;
  }
  return null;
}

function findBotProtectionPrompt() {
  const promptPattern = /bot\s*protection|captcha|verif(?:y|ication)|human\s+check|security\s+check|are\s+you\s+(?:a\s+)?human|prove\s+you(?:'re|\s+are)\s+human|confirm\s+you(?:'re|\s+are)\s+human|robot\s+check|unusual\s+activity/i;
  const candidates = document.querySelectorAll(
    'iframe, [role="dialog"], dialog, [class*="captcha" i], [id*="captcha" i], '
    + '[class*="challenge" i], [id*="challenge" i], [class*="verify" i], [id*="verify" i], div, section, p, span',
  );
  for (const element of candidates) {
    if (element.closest(`#${APP_ID}, #fx-sidebar`)) continue;
    const explicitPromptElement = element.matches(
      'iframe, [role="dialog"], dialog, [class*="captcha" i], [id*="captcha" i], '
      + '[class*="challenge" i], [id*="challenge" i], [class*="verify" i], [id*="verify" i]',
    );
    if (element.tagName === "IFRAME") {
      const frameText = `${element.title} ${element.src}`;
      if (!promptPattern.test(frameText)) continue;
    } else {
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 1000 || !promptPattern.test(text)
        || (element.children.length > 8 && !explicitPromptElement)) continue;
    }

    const hiddenByLobby = element.closest("[data-fx-custom-lobby-hidden]");
    const ownStyle = getComputedStyle(element);
    if (ownStyle.display === "none" || (!hiddenByLobby && ownStyle.visibility === "hidden")
      || Number(ownStyle.opacity) === 0) continue;
    const rect = element.getBoundingClientRect();
    if (!hiddenByLobby && (rect.width < 80 || rect.height < 30)) continue;
    return element;
  }
  return null;
}

function observeBotProtection(mount) {
  let timer = 0;
  let active = false;
  const update = () => {
    timer = 0;
    const prompt = findBotProtectionPrompt();
    if (Boolean(prompt) === active) return;
    active = Boolean(prompt);
    if (active) document.body.dataset.fxBotProtection = "active";
    else delete document.body.dataset.fxBotProtection;
    window.dispatchEvent(new CustomEvent("fx-bot-protection-state", {
      detail: { active, prompt: prompt?.tagName ?? null },
    }));
    if (active) {
      console.info("[ZFX Client LobbyView] Bot-protection check detected; revealing native game UI.");
    } else {
      console.info("[ZFX Client LobbyView] Bot-protection check cleared; restoring custom lobby view.");
    }
  };
  const schedule = records => {
    if (records.every(record => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      return target?.closest(`#${APP_ID}, #fx-sidebar`);
    })) return;
    if (!timer) timer = window.setTimeout(update, 120);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden", "title", "src"],
  });
  update();
  return () => {
    observer.disconnect();
    if (timer) window.clearTimeout(timer);
    delete document.body.dataset.fxBotProtection;
    mount.style.removeProperty("display");
  };
}

function getPlayerClan(name) {
  return typeof name === "string"
    ? name.match(/\[([^\]]{1,16})\]/)?.[1]?.trim().toLocaleUpperCase() ?? null
    : null;
}

function getClanChartColor(tag) {
  let hash = 0;
  for (const character of String(tag)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return "hsl(" + (hash % 360) + " 78% 62%)";
}

function getModeLabel(button) {
  const title = button.querySelector(":scope > .fx-lobby-mode-tab-title");
  if (title) return cleanText(title);
  return Array.from(button.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
    .map(node => node.textContent.trim()).join(" ");
}

function findMapNames(root) {
  const gameNames = window.__fx?.getGameMapNames?.();
  if (!Array.isArray(gameNames)) return [];
  const names = gameNames.filter(name => typeof name === "string" && name.trim()).map(name => name.trim());
  const found = [];
  for (const button of root.querySelectorAll("button")) {
    if (button.classList.contains("fx-lobby-mode-tab")
      || button.matches(".fx-lobby-chat-player-tab, .fx-lobby-filter-action")) continue;
    const text = cleanText(button).toLocaleLowerCase();
    const match = names.find(name => text.includes(name.toLocaleLowerCase()));
    if (match && !found.includes(match)) found.push(match);
  }
  return found;
}

function findMapImage(root) {
  // The native lobby paints its map artwork on the current-map row (child 2).
  const mapRow = root.children[2];
  const rowNodes = mapRow ? [mapRow, ...mapRow.querySelectorAll("*")] : [];
  const previewNodes = [...new Set([...rowNodes, root, ...root.querySelectorAll("*")])];
  const image = Array.from(previewNodes).find(node => node instanceof HTMLImageElement);
  const candidate = image?.currentSrc || image?.src;
  if (candidate && isSafeMapImageUrl(candidate)) return candidate;

  for (const node of previewNodes) {
    const backgroundImage = getComputedStyle(node).backgroundImage;
    const backgroundUrl = backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (backgroundUrl && isSafeMapImageUrl(backgroundUrl)) return backgroundUrl;
  }

  for (const node of previewNodes) {
    for (const pseudo of ["::before", "::after"]) {
      const backgroundImage = getComputedStyle(node, pseudo).backgroundImage;
      const backgroundUrl = backgroundImage.match(/url\(["']?(.*?)\)["']?\)/)?.[1];
      if (backgroundUrl && isSafeMapImageUrl(backgroundUrl)) return backgroundUrl;
    }
  }

  const canvas = rowNodes.find(node => node instanceof HTMLCanvasElement);
  if (canvas) {
    try {
      const dataUrl = canvas.toDataURL("image/png");
      if (isSafeMapImageUrl(dataUrl)) return dataUrl;
    } catch {
      // Cross-origin canvases cannot be exported; use the CSS fallback.
    }
  }

  // Map previews are rendered by the game's viewport canvas, which lives
  // outside the lobby DOM subtree. Crop the pixels underneath the native map row.
  const rowRect = mapRow?.getBoundingClientRect();
  if (rowRect?.width > 0 && rowRect?.height > 0) {
    const centerX = rowRect.left + rowRect.width / 2;
    const centerY = rowRect.top + rowRect.height / 2;
    const viewportCanvases = Array.from(document.querySelectorAll("canvas"))
      .map(source => ({ source, rect: source.getBoundingClientRect() }))
      .filter(({ source, rect }) => source.width > 0 && source.height > 0
        && rect.width > 0 && rect.height > 0
        && centerX >= rect.left && centerX <= rect.right
        && centerY >= rect.top && centerY <= rect.bottom)
      .sort((left, right) => right.source.width * right.source.height - left.source.width * left.source.height);

    for (const { source, rect } of viewportCanvases) {
      // Use the complete game-canvas scene as the map artwork. The lobby's map
      // is painted into this canvas, not represented by a DOM background.
      try {
        const fullCanvasImage = source.toDataURL("image/png");
        if (isSafeMapImageUrl(fullCanvasImage)) return fullCanvasImage;
      } catch {
        // A tainted source may still allow a region copy for the preview.
      }

      const scaleX = source.width / rect.width;
      const scaleY = source.height / rect.height;
      const sx = Math.max(0, Math.floor((rowRect.left - rect.left) * scaleX));
      const sy = Math.max(0, Math.floor((rowRect.top - rect.top) * scaleY));
      const sw = Math.min(source.width - sx, Math.ceil(rowRect.width * scaleX));
      const sh = Math.min(source.height - sy, Math.ceil(rowRect.height * scaleY));
      if (sw <= 0 || sh <= 0) continue;

      const preview = document.createElement("canvas");
      const outputScale = Math.min(1, 1200 / sw);
      preview.width = Math.max(1, Math.round(sw * outputScale));
      preview.height = Math.max(1, Math.round(sh * outputScale));
      try {
        preview.getContext("2d")?.drawImage(source, sx, sy, sw, sh, 0, 0, preview.width, preview.height);
        const dataUrl = preview.toDataURL("image/png");
        if (isSafeMapImageUrl(dataUrl)) return dataUrl;
      } catch {
        // Try another overlapping game canvas if this one is tainted.
      }
    }
  }
  return "";
}

function isSafeMapImageUrl(value) {
  return /^(https?:|blob:|data:image\/)/i.test(value);
}

const getLobbyLabels = () => {
  const selectedLanguage = window.__fx?.getGameLanguage?.() || navigator.language || "en";
  const german = selectedLanguage.toLowerCase().startsWith("de");
  return german ? {
    title: "Lobby-Übersicht", currentMap: "Aktuelle Karte", nextMap: "Nächstes Spiel", modes: "Spielmodi", clans: "Clans",
    lobbyRating: "Lobby-Rating", lobbyRatingUnavailable: "Warte auf bereite Spieler mit Rang",
    teams: "Teams", readyPlayers: "Bereite Spieler", quickFilters: "Schnellfilter", lobbyInfo: "Lobby-Info", lobbyViews: "Lobby-Bereiche",
    overview: "Übersicht", topReadyPlayers: "Top 3 bereite Spieler", noReadyPlayers: "Keine bereiten Spieler",
    topReadyClan: "Top-Clan (bereit)",
    overviewLeadersNote: "Beste Weltränge unter den bereiten Spielern",
    progress: "Lobby-Fortschritt", players: "Spieler", team: "Team", search: "Spieler suchen …",
    etaUnavailable: "Warte auf steigenden Prozentwert …",
    readyClansByClan: "Bereite Spieler nach Clan", noReadyClanPlayers: "Keine bereiten Clan-Spieler", others: "Andere",
    all: "Alle", ready: "Bereit", notReady: "Nicht bereit", clan: "Clan", followed: "Following", noClans: "Keine Clans in der Lobby",
    onlyReadyClans: "Nur Clans mit Bereiten", noReadyClans: "Keine Clans mit bereiten Spielern",
    readinessFilters: "Bereitschaftsfilter", affiliationFilters: "Zugehörigkeitsfilter", resetFilters: "Filter zurücksetzen",
    rank: "Rang", status: "Status", online: "Online", noPlayers: "Keine Spieler gefunden",
    sort: "Sortierung", sortRankDesc: "Rang absteigend", sortRankAsc: "Rang aufsteigend", sortName: "Name (A–Z)",
    clanTitle: "Clan-Übersicht", chat: "Chat", calls: "Calls", joinCont: "Join Cont", join: "Join", joinNext: "Join {map} {count} teams", nextGame: "nächstes Spiel", chatPlaceholder: "Nachricht an die Lobby …", clear: "Leeren",
    teamMessagePlaceholder: "Nachricht ans Team schreiben …", send: "Senden", messageSent: "Clan-Nachricht gesendet", messageSendFailed: "Clan-Nachricht konnte nicht gesendet werden",
    spawnCallHint: "Wähle einen Kartenbereich. Dein Clan erhält den Call im Lobby-Chat.", spawnDirections: "Spawn-Bereich auswählen",
    topLeft: "Oben links", top: "Oben", topRight: "Oben rechts", left: "Links", center: "Mitte", right: "Rechts", bottomLeft: "Unten links", bottom: "Unten", bottomRight: "Unten rechts",
    send: "Senden", readyAction: "Bereit",
    chatEmpty: "Noch keine Nachrichten", mention: "Erwähnen",
    playersCount: "Spieler", noClan: "Kein eigener Clan erkannt", lobbyUnavailable: "Lobby wird geladen …",
    chatUnavailable: "Lobby-Chat konnte nicht geöffnet werden",
  } : {
    title: "Lobby overview", currentMap: "Current map", nextMap: "Next game", modes: "Game modes", clans: "Clans",
    lobbyRating: "Lobby rating", lobbyRatingUnavailable: "Waiting for ready players with rank data",
    teams: "Teams", readyPlayers: "Ready players", quickFilters: "Quick filters", lobbyInfo: "Lobby info", lobbyViews: "Lobby views",
    overview: "Overview", topReadyPlayers: "Top 3 ready players", noReadyPlayers: "No ready players",
    topReadyClan: "Top ready clan",
    overviewLeadersNote: "Highest global ranks among ready players",
    progress: "Lobby progress", players: "Players", team: "Team", search: "Search players …",
    etaUnavailable: "Waiting for the percentage to increase …",
    readyClansByClan: "Ready players by clan", noReadyClanPlayers: "No ready clan players", others: "Others",
    all: "All", ready: "Ready", notReady: "Not ready", clan: "Clan", followed: "Following", noClans: "No clans in this lobby",
    onlyReadyClans: "Only clans with ready players", noReadyClans: "No clans with ready players",
    readinessFilters: "Readiness filters", affiliationFilters: "Affiliation filters", resetFilters: "Reset filters",
    rank: "Rank", status: "Status", online: "Online", noPlayers: "No players found",
    sort: "Sort", sortRankDesc: "Rank descending", sortRankAsc: "Rank ascending", sortName: "Name (A–Z)",
    clanTitle: "Clan overview", chat: "Chat", calls: "Calls", joinCont: "Join Cont", join: "Join", joinNext: "Join {map} {count} teams", nextGame: "next game", chatPlaceholder: "Message the lobby …", clear: "Clear",
    teamMessagePlaceholder: "Write a message to your team …", send: "Send", messageSent: "Clan message sent", messageSendFailed: "Could not send clan message",
    spawnCallHint: "Choose an area of the map. Your clan will receive the call in lobby chat.", spawnDirections: "Choose spawn area",
    topLeft: "Top left", top: "Top", topRight: "Top right", left: "Left", center: "Center", right: "Right", bottomLeft: "Bottom left", bottom: "Bottom", bottomRight: "Bottom right",
    send: "Send", readyAction: "Ready",
    chatEmpty: "No messages yet", mention: "Mention",
    playersCount: "Players", noClan: "No own clan detected", lobbyUnavailable: "Loading lobby …",
    chatUnavailable: "Could not open lobby chat",
  };
};

const LobbyView = defineComponent({
  name: "LobbyView",
  components: { MapHeader, LobbyProgress, PlayerList, ClanOverview },
  setup() {
    const shell = document.getElementById("fx-game-shell");
    const labels = getLobbyLabels();
    const adapter = createLobbyDataAdapter();
    const snapshot = shallowRef(adapter.getSnapshot());
    const lobbyRating = shallowRef(null);
    const query = ref("");
    const sortBy = ref("rank-asc");
    const readyFilter = ref("all");
    const affiliationFilter = ref("all");
    const chatStatus = ref("");
    const lobbyNotifications = ref([]);
    const notificationIndex = ref(-1);
    const notificationPanelOpen = ref(false);
    const currentLobbyNotification = computed(() => lobbyNotifications.value[notificationIndex.value] ?? null);
    const activeTab = ref("overview");
    const playerContextMenu = ref(null);
    const playerListComponent = ref(null);
    const selfReadiness = ref("not-ready");
    let optimisticReadinessUntil = 0;
    const active = ref(false);
    let nativeNotificationObserver = null;
    const hiddenNativeNotifications = new Map();
    const hideNativeNotificationOverlays = () => {
      for (const element of document.body.children) {
        const style = element.style;
        const isNativeOverlay = element.tagName === "DIV"
          && style.position === "absolute"
          && style.right === "0px"
          && style.top === "0px"
          && style.zIndex === "3"
          && (element.children.length === 5 || (element.children.length === 0 && /^\\d+$/.test(element.textContent.trim())));
        if (isNativeOverlay && !hiddenNativeNotifications.has(element)) {
          hiddenNativeNotifications.set(element, element.style.display);
          element.style.display = "none";
        }
      }
    };
    const scale = computed(() => Math.max(.75, Math.min(3,
      Number(window.__fx?.settings?.lobbyFontScale ?? 100) / 100)));
    watch(active, isActive => {
      if (isActive) {
        Object.assign(labels, getLobbyLabels());
        requestAnimationFrame(() => {
          hideNativeNotificationOverlays();
          nativeNotificationObserver = new MutationObserver(hideNativeNotificationOverlays);
          nativeNotificationObserver.observe(document.body, { childList: true });
        });
      } else {
        nativeNotificationObserver?.disconnect();
        nativeNotificationObserver = null;
        for (const [element, display] of hiddenNativeNotifications) element.style.display = display;
        hiddenNativeNotifications.clear();
      }
    });
    const filteredPlayers = computed(() => {
      const needle = query.value.trim().toLocaleLowerCase();
      const players = snapshot.value.players.filter(player => {
        if (needle && !player.name.toLocaleLowerCase().includes(needle)) return false;
        if (readyFilter.value === "ready" && player.readiness !== "ready") return false;
        if (readyFilter.value === "not-ready" && player.readiness !== "not-ready") return false;
        if (activeTab.value !== "team" && affiliationFilter.value === "clan" && !player.clan) return false;
        if (activeTab.value !== "team" && affiliationFilter.value === "followed" && !player.followed) return false;
        return true;
      });
      if (sortBy.value === "name") {
        players.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
      } else if (sortBy.value === "rank-asc") {
        players.sort((left, right) => (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY)
          || left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
      } else if (sortBy.value === "rank-desc") {
        players.sort((left, right) => (right.rank ?? Number.NEGATIVE_INFINITY) - (left.rank ?? Number.NEGATIVE_INFINITY)
          || left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
      }
      return players;
    });
    const clanGroups = computed(() => {
      const groups = new Map();
      for (const player of snapshot.value.players) {
        if (!player.clan) continue;
        const group = groups.get(player.clan) ?? { tag: player.clan, players: [], readyCount: 0 };
        group.players.push(player);
        if (player.readiness === "ready") group.readyCount++;
        groups.set(player.clan, group);
      }
      return [...groups.values()].sort((a, b) => b.readyCount - a.readyCount
        || b.players.length - a.players.length
        || a.tag.localeCompare(b.tag));
    });
    const topReadyClan = computed(() => clanGroups.value.find(clan => clan.readyCount > 0) ?? null);
    const readyClanTotal = computed(() => snapshot.value.players
      .filter(player => player.readiness === "ready").length);
    const readyClanSlices = computed(() => {
      const counts = new Map();
      const othersSliceId = "__fx_others__";
      let untaggedCount = 0;
      for (const player of snapshot.value.players) {
        if (player.readiness !== "ready") continue;
        if (!player.clan) {
          untaggedCount++;
          continue;
        }
        counts.set(player.clan, (counts.get(player.clan) ?? 0) + 1);
      }
      const sortedClanCounts = [...counts.entries()].sort(([tagA, countA], [tagB, countB]) =>
        countB - countA || tagA.localeCompare(tagB));
      const visibleClanCounts = sortedClanCounts.slice(0, 8);
      const otherCount = untaggedCount
        + sortedClanCounts.slice(8).reduce((sum, [, count]) => sum + count, 0);
      const chartCounts = otherCount > 0
        ? [...visibleClanCounts, [othersSliceId, otherCount]]
        : visibleClanCounts;
      const total = chartCounts.reduce((sum, [, count]) => sum + count, 0);
      const circumference = 2 * Math.PI * 16;
      let offset = 0;
      return chartCounts.map(([tag, count]) => {
        const isOthers = tag === othersSliceId;
        const segmentLength = circumference * count / total;
        const slice = {
          tag,
          isOthers,
          count,
          color: isOthers ? "#91a0b2" : getClanChartColor(tag),
          dashArray: `${segmentLength} ${circumference - segmentLength}`,
          dashOffset: String(-offset),
        };
        offset += segmentLength;
        return slice;
      });
    });
    const clanCount = computed(() => `${clanGroups.value.filter(clan => clan.readyCount > 0).length}/${clanGroups.value.length}`);
    const onlyReadyClans = ref(false);
    const visibleClanGroups = computed(() => onlyReadyClans.value
      ? clanGroups.value.filter(clan => clan.readyCount > 0)
      : clanGroups.value);
    const playerCountLabel = computed(() => `${snapshot.value.readyCount}/${snapshot.value.playerCount}`);
    const ownClan = computed(() => {
      const self = snapshot.value.players.find(player => player.self);
      const names = window.__fx?.getGameVar?.("rawPlayerNames");
      const playerId = window.__fx?.getGameVar?.("playerId");
      return self?.clan ?? getPlayerClan(self?.name ?? names?.[playerId] ?? "");
    });
    const activeMode = computed(() => snapshot.value.modes.find(mode => mode.active));
    const isTeamMode = ref(false);
    watch(activeMode, mode => {
      if (mode) isTeamMode.value = /team/i.test(String(mode.label ?? ""));
    }, { immediate: true });
    const clanPlayers = computed(() => ownClan.value
      ? snapshot.value.players.filter(player => player.clan === ownClan.value)
      : []);
    const teamCount = computed(() => `${clanPlayers.value.filter(player => player.readiness === "ready").length}/${clanPlayers.value.length}`);
    const filteredTeamPlayers = computed(() => filteredPlayers.value
      .filter(player => ownClan.value && player.clan === ownClan.value));
    watch(isTeamMode, isTeam => {
      if (!isTeam && ["team", "calls"].includes(activeTab.value)) activeTab.value = "players";
    });
    const clanReadyCount = computed(() => clanPlayers.value.filter(player => player.readiness === "ready").length);

    let nativeRoot = null;
    let savedStyles = null;
    let observer = null;
    let frame = 0;
    let unsubscribe = () => {};
    let unsubscribeLobbyChat = () => {};
    let missingLobbyTimer = 0;
    let readinessRefreshTimer = 0;
    let ratingRefreshTimer = 0;
    let optimisticMode = null;
    let optimisticModeUntil = 0;

    function refreshLobbyRating(players = snapshot.value.players) {
      const sidebarRating = window.__fx?.vueSidebarApi?.getLobbyRating?.();
      const visibleRatingCard = document.querySelector("#fx-sidebar .fx-vue-sidebar-rating");
      const visibleValue = visibleRatingCard?.querySelector("strong")?.textContent?.match(/[0-9]+(?:[.,][0-9]+)?/)?.[0];
      const visibleMeta = visibleRatingCard?.querySelector("span")?.textContent?.trim();
      const visibleSidebarRating = visibleValue ? {
        value: visibleValue,
        image: visibleRatingCard.querySelector("img")?.src ?? "",
        meta: visibleMeta ?? "",
        title: visibleRatingCard.title ?? "",
      } : null;
      lobbyRating.value = sidebarRating ?? visibleSidebarRating ?? calculateLobbyRating(
        players.filter(player => player.readiness === "ready").map(player => player.rank),
        key => labels[key] ?? key,
      );
    }

    function restoreNativeRoot() {
      if (!nativeRoot || !savedStyles) return;
      for (const [property, value, priority] of savedStyles) {
        if (value) nativeRoot.style.setProperty(property, value, priority);
        else nativeRoot.style.removeProperty(property);
      }
      delete nativeRoot.dataset.fxCustomLobbyHidden;
      nativeRoot = null;
      savedStyles = null;
    }

    function readLobby() {
      if (!shell) return;
      const found = getLobbyList(shell);
      if (!found) {
        const spans = Array.from(shell.querySelectorAll("span"));
        const markedRows = spans.filter(row => row.dataset.fxLobbyPlayer === "true").length;
        const statusRows = spans.filter(row => /^[🟢⚪]\s*/u.test(cleanText(row))).length;
        logLobbyDiagnostic("lobby-list-missing", `${markedRows}:${statusRows}:${spans.length}`, {
          markedPlayerSpans: markedRows,
          statusLikeSpans: statusRows,
          totalSpans: spans.length,
          settingsEnabled: window.__fx?.settings?.customLobbyView,
          gameState: window.__fx?.getGameVar?.("gameState"),
        });
        // Some native builds only render the selected Chat or roster panel.
        if (!nativeRoot?.isConnected) {
          const root = findLobbyRoot(shell);
          if (root) {
            nativeRoot = root;
            savedStyles = ["visibility", "pointer-events"].map(property => [
              property, root.style.getPropertyValue(property), root.style.getPropertyPriority(property),
            ]);
            root.style.setProperty("visibility", "hidden", "important");
            root.style.setProperty("pointer-events", "none", "important");
            root.dataset.fxCustomLobbyHidden = "true";
            active.value = true;
            activeTab.value = "chat";
            const current = adapter.getSnapshot();
            adapter.publish(readNativeSummary(root, {
              ...current,
              chatMessages: current.chatMessages,
            }), "native-lobby-bridge");
            return;
          }
        }
        // Keep the native panel selected by the user; do not simulate tab cycles.
        // Keep the custom view and last roster snapshot alive across that tab change.
        if (nativeRoot?.isConnected) {
          const current = adapter.getSnapshot();
          adapter.publish(readNativeSummary(nativeRoot, {
            ...current,
            chatMessages: current.chatMessages,
          }), current.source);
          active.value = true;
          return;
        }
        if (!missingLobbyTimer) {
          missingLobbyTimer = window.setTimeout(() => {
            missingLobbyTimer = 0;
            if (nativeRoot && !nativeRoot.isConnected) {
              restoreNativeRoot();
              active.value = false;
              adapter.clear();
            }
          }, 1400);
        }
        return;
      }
      if (missingLobbyTimer) {
        window.clearTimeout(missingLobbyTimer);
        missingLobbyTimer = 0;
      }
      const root = getLobbyRoot(found.element);
      if (!root || !root.children[6]) {
        logLobbyDiagnostic("lobby-root-invalid", `${Boolean(root)}:${root?.children?.length ?? 0}`, {
          rootFound: Boolean(root),
          rootChildren: root?.children?.length ?? 0,
          playerRows: found.rows.length,
        });
        return;
      }
      if (nativeRoot !== root) {
        if (nativeRoot) adapter.clearChatHistory();
        restoreNativeRoot();
        nativeRoot = root;
        savedStyles = ["visibility", "pointer-events"].map(property => [
          property, root.style.getPropertyValue(property), root.style.getPropertyPriority(property),
        ]);
        root.style.setProperty("visibility", "hidden", "important");
        root.style.setProperty("pointer-events", "none", "important");
        root.dataset.fxCustomLobbyHidden = "true";
      }

      const ownPlayerId = window.__fx?.getGameVar?.("playerId");
      const ownPlayerName = window.__fx?.getGameVar?.("rawPlayerNames")?.[ownPlayerId];
      const players = found.rows.map((row, index) => {
        const rawText = cleanText(row);
        const name = row.dataset.fxAccountName || rawText.replace(/^[🟢⚪]\s*/u, "");
        if (!row.dataset.fxLobbyPlayer) row.dataset.fxLobbyPlayer = "true";
        if (!row.dataset.fxAccountName) row.dataset.fxAccountName = name;
        if (!row.dataset.fxLobbyReady) {
          row.dataset.fxLobbyReady = /^[🟢]/u.test(rawText) ? "ready"
            : /^[⚪]/u.test(rawText) ? "not-ready" : "unknown";
        }
        return {
          id: row.dataset.fxPlayerId || `${name}-${index}`,
          senderId: window.__fx?.getLobbyChatSenderIdByName?.(name) ?? null,
          name,
          clan: getPlayerClan(name),
          readiness: row.dataset.fxLobbyReady || "unknown",
          rank: Number(row.dataset.fxRank) || null,
          rankText: row.dataset.fxRankText || "",
          followed: row.dataset.fxFollowed === "true" || row.classList.contains("fx-followed-player"),
          self: row.dataset.fxSelf === "true"
            || (typeof ownPlayerName === "string"
              && ownPlayerName.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()),
          color: row.style.color,
          title: row.title,
          nativeElement: row,
        };
      });
      active.value = true;
      const nextSnapshot = adapter.publish(readNativeSummary(root, {
        players,
        chatMessages: adapter.getSnapshot().chatMessages,
      }), "native-lobby-bridge");
      const readinessSignature = nextSnapshot.players.map(player => `${player.id}:${player.readiness}`).join("|");
      logLobbyDiagnostic("lobby-data-found", `${nextSnapshot.playerCount}:${readinessSignature}:${nextSnapshot.modes.length}:${nextSnapshot.currentMap}:${nextSnapshot.nextMap}:${nextSnapshot.chatMessages.length}`, {
        playerCount: nextSnapshot.playerCount,
        modeCount: nextSnapshot.modes.length,
        currentMap: nextSnapshot.currentMap || "unresolved",
        nextMap: nextSnapshot.nextMap || "unresolved",
        readyCount: nextSnapshot.readyCount,
        chatMessageCount: nextSnapshot.chatMessages.length,
      });
    }

    function readNativeSummary(root, snapshot) {
      const enhancedModes = Array.from(root.querySelectorAll(".fx-lobby-mode-tab"));
      const modeButtons = enhancedModes.length ? enhancedModes
        : Array.from(root.children[1]?.querySelectorAll("button") ?? []);
      const modes = modeButtons.map((button, index) => {
        const clock = cleanText(button.querySelector('[data-fx-tab-meta="clock"]'));
        const count = cleanText(button.querySelector('[data-fx-tab-meta="count"]'));
        const map = cleanText(button.querySelector('[data-fx-tab-meta="map"]'));
        const label = getModeLabel(button);
        const contestText = [label, cleanText(button), button.title, button.getAttribute("aria-label")].filter(Boolean).join(" ");
        // Read current mode metadata from its own tab, never from map rows.
        const teamCountLabel = /^team$/i.test(label.trim())
          ? getTeamCountLabel([cleanText(button), count, map].filter(Boolean)) : "";
        return {
        id: String(index), label,
        clock,
        count,
        map,
        teamCountLabel,
        isContest: button.textContent.includes("🏆")
          || button.querySelector('[aria-label*="contest" i], [title*="contest" i]') !== null
          || /🏆|contest/i.test(contestText),
        active: button.dataset.fxLobbyModeActive === "true"
          || button.getAttribute("aria-pressed") === "true"
          || button.classList.contains("active") || button.classList.contains("selected")
          || (Date.now() < optimisticModeUntil && String(index) === optimisticMode),
        nativeElement: button,
      }; });
      const selectedMode = modes.find(mode => mode.active);
      const mapNames = findMapNames(root);
      const room = window.__fx?.lobbyReminders?.getSelectedGame?.();
      const rawNames = window.__fx?.getGameVar?.("rawPlayerNames");
      const roomChatMessages = Array.isArray(room?.chatLog)
        ? room.chatLog.filter(message => message?.id === 0 && typeof message.s === "string")
          .flatMap((message, index) => {
            const playerName = window.__fx?.getLobbyChatSenderName?.(message.uY);
            if (!playerName) return [];
            const segments = resolveLobbyChatSegments(message.s);
            return [{
            id: `room:${room.selectedIndex ?? 0}:${index}`,
            senderId: Number.isInteger(Number(message.uY)) ? Number(message.uY) : null,
            senderName: playerName,
            senderColor: window.__fx?.getLobbyChatSenderColor?.(message.uY) || "",
            text: segments.map(segment => segment.text).join(""),
            segments,
            }];
          }).slice(-60)
        : snapshot?.chatMessages ?? [];
      logLobbyDiagnostic("room-chat-log", `${room?.selectedIndex ?? "none"}:${Array.isArray(room?.chatLog)}:${room?.chatLog?.length ?? -1}:${roomChatMessages.length}`, {
        selectedRoomIndex: room?.selectedIndex ?? null,
        hasLogArray: Array.isArray(room?.chatLog),
        roomLogLength: room?.chatLog?.length ?? null,
        sampleIds: Array.isArray(room?.chatLog) ? room.chatLog.slice(-5).map(message => message?.id ?? null) : [],
        displayedMessageCount: roomChatMessages.length,
      });
      const roomMap = Number(room?.map);
      const roomMode = Number(room?.mode);
      const roomNextMap = Number(room?.nextMap);
      const roomNextMode = Number(room?.nextMode);
      const currentMap = Number.isInteger(roomMap) ? window.__fx?.getGameMapNames?.()?.[roomMap] || "" : mapNames[0] || snapshot?.currentMap || "";
      const currentTeamCountLabel = Number.isInteger(roomMode) && roomMode >= 0 && roomMode <= 6 ? `${roomMode + 2} Teams` : "";
      const nextMap = Number.isInteger(roomNextMap) ? window.__fx?.getGameMapNames?.()?.[roomNextMap] || "" : mapNames[1] || snapshot?.nextMap || "";
      const nextTeamCountLabel = Number.isInteger(roomNextMode) && roomNextMode >= 0 && roomNextMode <= 6 ? `${roomNextMode + 2} Teams` : "";
      const isContest = selectedMode?.isContest === true || room?.isContest === true;
      const nextIsContest = room?.nextIsContest === true;
      const noFullsend = roomMode === 10;
      const nextNoFullsend = roomNextMode === 10;
      const currentMapImage = snapshot?.currentMap === currentMap && snapshot?.currentMapImage
        ? snapshot.currentMapImage : findMapImage(root) || snapshot?.currentMapImage || "";
      const progressText = cleanText(root.children[5]);
      const progressMatch = progressText.match(/(\d+(?:[.,]\d+)?)\s*%/);
      const readinessTexts = [progressText,
        ...Array.from(root.children[6]?.querySelectorAll("button, [role='button']") ?? [])
          .flatMap(button => [cleanText(button), button.getAttribute("aria-label"), button.title])
          .filter(Boolean),
      ];
      const readinessMatch = readinessTexts.map(text => text.match(/(\d+)\s*\/\s*(\d+)/)).find(Boolean);
      const readyCount = readinessMatch ? Number(readinessMatch[1]) : snapshot?.readyCount;
      const playerCount = readinessMatch ? Number(readinessMatch[2]) : snapshot?.playerCount;
      return {
        ...snapshot,
        modes: modes.length ? modes : snapshot?.modes ?? [],
        chatChannel: selectedMode?.id ?? snapshot?.chatChannel ?? "default",
        currentMap,
        currentMapImage,
        nextMap,
        chatMessages: roomChatMessages,
        isContest,
        nextIsContest,
        noFullsend,
        nextNoFullsend,
        modes: modes.map(mode => ({ ...mode, teamCountLabel: /team/i.test(mode.label) ? currentTeamCountLabel : "" })),
        nextTeamCountLabel,
        readyCount,
        playerCount,
        progressPercent: progressMatch ? Number(progressMatch[1].replace(",", ".")) : snapshot?.progressPercent ?? null,
      };
    }

    function getTeamCountLabel(texts) {
      for (const text of texts) {
        const match = text.match(/\b(\d+)\s*teams?\b|\bteams?\s*[:x-]?\s*(\d+)\b/i);
        if (!match) continue;
        const count = Number(match[1] ?? match[2]);
        if (!Number.isInteger(count) || count < 2 || count > 8) continue;
        return `${count} Teams`;
      }
      return "";
    }

    function getTeamCountForMap(mapName, mapElement) {
      const mapInfo = window.__fx?.getGameMapInfo?.();
      const metadataCount = mapInfo?.find(info => info.name === mapName)?.teamCount;
      if (Number.isInteger(metadataCount) && metadataCount >= 2 && metadataCount <= 8) {
        return `${metadataCount} Teams`;
      }
      // Fallback for game builds that do not expose team metadata.
      const texts = [cleanText(mapElement), ...Array.from(mapElement?.querySelectorAll("button") ?? []).map(cleanText)].filter(Boolean);
      return getTeamCountLabel(texts);
    }

    function scheduleRead() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        readLobby();
      });
    }

    function nativeReadyButton() {
      const footer = nativeRoot?.children[6];
      return Array.from(footer?.querySelectorAll("button, [role='button']") ?? [])
        .find(button => cleanText(button).toLocaleLowerCase().includes(labels.readyAction.toLocaleLowerCase()));
    }

    function findNativeChatTab(root) {
      return Array.from(root?.querySelectorAll("button, [role='button'], [role='tab']") ?? [])
        .find(button => [cleanText(button), button.getAttribute("aria-label"), button.title]
          .some(value => /^chat\b/i.test(value ?? "")));
    }

    function findNativePlayerTab(root) {
      return Array.from(root?.querySelectorAll(".fx-lobby-chat-player-tab, button, [role='button'], [role='tab']") ?? [])
        .find(button => {
          const iconLabel = cleanText(button.querySelector("[data-fx-lobby-tab-icon='true']"));
          return [iconLabel, cleanText(button), button.getAttribute("aria-label"), button.title]
            .some(value => /^(spieler|players)\b/i.test(value ?? ""));
        });
    }

    function selectLobbyTab(tab) {
      const previousTab = activeTab.value;
      activeTab.value = tab;
      // Keep the native roster mounted for live player/readiness data. FX chat
      // receives messages from the socket feed and does not switch native tabs.
      if (["chat", "calls"].includes(previousTab) && !["chat", "calls"].includes(tab)) {
        window.__fx?.setNativeLobbyChatMode?.(1);
      }
      if (tab !== "chat") findNativePlayerTab(nativeRoot)?.click();
      [80, 220].forEach(delay => window.setTimeout(scheduleRead, delay));
    }

    function openPlayerContextMenu(player, event) {
      event?.preventDefault();
      event?.stopPropagation();
      if (!player?.name) return;
      playerContextMenu.value = {
        senderId: player.senderId,
        senderName: player.name,
        x: Math.max(8, Math.min(event?.clientX ?? 8, window.innerWidth - 176)),
        y: Math.max(8, Math.min(event?.clientY ?? 8, window.innerHeight - 54)),
      };
    }

    async function mentionPlayerFromContextMenu() {
      const player = playerContextMenu.value;
      if (!player) return;
      playerContextMenu.value = null;
      selectLobbyTab("chat");
      await nextTick();
      await nextTick();

      let token = "";
      try {
        const accountId = Number(player.senderId
          ?? window.__fx?.getLobbyChatSenderIdByName?.(player.senderName));
        if (Number.isInteger(accountId)) token = String(window.__fx?.getLobbyChatMentionToken?.(accountId) ?? "").trim();
      } catch (error) {
        console.warn("[ZFX Client LobbyView] Could not resolve account mention ID:", error);
      }
      if (!token) {
        console.warn("[ZFX Client LobbyView] Account mention ID is not available for this player.", player);
        return;
      }
      playerListComponent.value?.insertMentionToken?.(token);
    }

    function handleBotProtectionState(event) {
      if (event.detail?.active) restoreNativeRoot();
      else scheduleRead();
    }

    function handleNativeLobbyReturn() {
      active.value = true;
      scheduleRead();
    }

    function handleLobbyNotification(event) {
      const text = resolveLobbyChatMentions(event.detail?.text).trim();
      if (!text) return;
      const sourceIndex = Number.isInteger(event.detail?.index) ? event.detail.index : null;
      const id = sourceIndex === null ? `${Date.now()}:${Math.random().toString(36).slice(2)}` : `native:${sourceIndex}`;
      const existingIndex = lobbyNotifications.value.findIndex(item => item.id === id);
      if (existingIndex >= 0) {
        lobbyNotifications.value[existingIndex] = { ...lobbyNotifications.value[existingIndex], text };
        notificationIndex.value = existingIndex;
        notificationPanelOpen.value = true;
        return;
      }
      const nextNotifications = [...lobbyNotifications.value, {
        id,
        text,
        category: Number(event.detail?.id) === 7 ? "Lobby" : "Hinweis",
      }];
      while (nextNotifications.length > 100) nextNotifications.shift();
      lobbyNotifications.value = nextNotifications;
      notificationIndex.value = nextNotifications.length - 1;
      notificationPanelOpen.value = true;
    }

    function previousLobbyNotification() {
      notificationIndex.value = Math.max(0, notificationIndex.value - 1);
    }

    function nextLobbyNotification() {
      notificationIndex.value = Math.min(lobbyNotifications.value.length - 1, notificationIndex.value + 1);
    }

    function selectMode(mode) {
      mode.nativeElement?.click();
      optimisticMode = String(mode.id);
      optimisticModeUntil = Date.now() + 1200;
      adapter.switchChatChannel(optimisticMode);
      const refresh = () => {
        if (!nativeRoot?.isConnected) return;
        const current = adapter.getSnapshot();
        adapter.publish({
          ...readNativeSummary(nativeRoot, current),
          chatMessages: current.chatMessages,
        }, current.source);
      };
      window.setTimeout(refresh, 180);
      window.setTimeout(refresh, 420);
    }

    function readNativeChatMessages(root) {
      const candidates = Array.from(root.querySelectorAll("div, ul, ol"))
        .filter(element => !element.querySelector("[data-fx-lobby-player='true']")
          && !element.querySelector("textarea, input, button"));
      const scored = candidates.map(element => {
        const entries = Array.from(element.children)
          .map(child => cleanText(child))
          .filter(text => text.length > 1 && text.length < 1200);
        if (entries.length < 2) return null;
        const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
        const chatHint = /chat|message|message-list|conversation/.test(className) ? 20 : 0;
        const scrollHint = element.scrollHeight > element.clientHeight + 8 ? 3 : 0;
        return { entries, score: entries.length + chatHint + scrollHint };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      const entries = scored[0]?.entries ?? [];
      return entries.slice(-60).map((text, index) => ({ id: `${index}:${text}`, text }));
    }

    function appendChatNotice(text) {
      const current = adapter.getSnapshot();
      adapter.publish({
        ...current,
        chatMessages: [...current.chatMessages, {
          id: `diagnostic:${Date.now()}:${Math.random().toString(36).slice(2)}`,
          text: `[Diagnose] ${text}`,
        }].slice(-60),
      }, current.source);
    }

    function runChatCommand(message) {
      const command = message.trim().toLowerCase();
      if (command === "/help") {
        appendChatNotice("Verfügbar: /diag zeigt Socketpakete, Chatdecoder, Feed und Lobbyadapter.");
        return true;
      }
      if (command !== "/diag" && command !== "/diagnose") return false;

      const activateChat = window.__fx?.setNativeLobbyChatMode;
      if (activeTab.value === "chat" && typeof activateChat === "function"
        && window.__fx?.lobbyChatActivationStatus !== "sent:0") activateChat(0);
      const diagnostics = window.__fx?.lobbyChatFeed?.getDiagnostics?.();
      const room = window.__fx?.lobbyReminders?.getSelectedGame?.();
      const rooms = window.__fx?.lobbyReminders?.getRoomChatSummary?.() ?? [];
      if (!diagnostics) {
        appendChatNotice("Socketdiagnose ist nicht verfügbar. Prüfe, ob der aktuelle Build geladen wurde.");
        return true;
      }
      const packets = Object.entries(diagnostics.packetCounts ?? {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([type, count]) => `${type}:${count}`).join(", ") || "keine";
      appendChatNotice([
        `Socketpakete: ${packets}`,
        `Aktivierungs-Bridge: ${typeof activateChat === "function" ? "verfügbar" : "fehlt"}; Status: ${window.__fx?.lobbyChatActivationStatus ?? "kein Aufruf"}`,
        `Chatmodus-Befehle: ${diagnostics.chatModeCommandCount} (letzter Modus: ${diagnostics.lastChatModeCommand ?? "keiner"})`,
        `Raumchat-Einträge dekodiert: ${diagnostics.decodedEntryCount}`,
        `Nachrichten im Feed: ${diagnostics.publishedMessageCount} (gepuffert: ${diagnostics.bufferedMessageCount})`,
        `Ansicht-Abonnenten: ${diagnostics.subscriberCount}; Adapter-Nachrichten: ${adapter.getSnapshot().chatMessages.length}`,
        `Ausgewähltes Raumlog: ${Array.isArray(room?.chatLog) ? room.chatLog.length : "nicht verfügbar"}; Räume: ${rooms.map(item => `${item.index}${item.selected ? "*" : ""}=${item.chatLogLength ?? "?"}`).join(", ") || "nicht verfügbar"}`,
      ].join(" | "));
      return true;
    }

    function sendMessage(message, callback) {
      if (runChatCommand(message)) {
        chatStatus.value = "";
        callback(true);
        return;
      }
      const sendLobbyMessage = window.__fx?.sendLobbyMessage;
      if (typeof sendLobbyMessage !== "function") {
        chatStatus.value = labels.chatUnavailable;
        callback(false);
        return;
      }
      try {
        const sent = sendLobbyMessage(message);
        chatStatus.value = sent ? "" : labels.chatUnavailable;
        callback(sent);
      } catch (error) {
        console.warn("[ZFX Client LobbyView] Native chat send failed:", error);
        chatStatus.value = labels.chatUnavailable;
        callback(false);
      }
    }

    function sendSpawnCall(direction) {
      if (!isTeamMode.value || !ownClan.value || !snapshot.value.currentMap) return;
      const sendClanMessage = window.__fx?.sendClanMessage;
      if (typeof sendClanMessage !== "function") {
        console.warn("[ZFX Client LobbyView] Clan message bridge is unavailable.");
        return;
      }
      sendClanMessage(ownClan.value, `spawn call: ${direction}`);
    }

    function sendJoinCall(kind) {
      if (!isTeamMode.value || !ownClan.value) return;
      const sendClanMessage = window.__fx?.sendClanMessage;
      if (typeof sendClanMessage !== "function") {
        console.warn("[ZFX Client LobbyView] Clan message bridge is unavailable.");
        return;
      }
      if (kind === "current") return sendClanMessage(ownClan.value, "join");
      if (kind === "cont") return sendClanMessage(ownClan.value, "join cont");
      const nextMap = String(snapshot.value.nextMap || "").trim();
      const teamCount = String(snapshot.value.nextTeamCountLabel || "").match(/\d+/)?.[0] || "";
      if (kind === "next" && nextMap && teamCount) {
        sendClanMessage(ownClan.value, `join ${nextMap} ${teamCount} teams`);
      }
    }

    function sendTeamMessage(message, callback) {
      const sendClanMessage = window.__fx?.sendClanMessage;
      if (!isTeamMode.value || !ownClan.value || typeof sendClanMessage !== "function") {
        callback(false);
        return;
      }
      try { callback(sendClanMessage(ownClan.value, message) === true); }
      catch (error) {
        console.warn("[ZFX Client LobbyView] Clan message send failed:", error);
        callback(false);
      }
    }

    onMounted(() => {
      console.log("[ZFX Client LobbyView] Vue route mounted; waiting for native lobby data.");
      window.addEventListener("fx-lobby-notification", handleLobbyNotification);
      const nativeHistory = window.__fx?.getLobbyNotificationHistory?.() ?? [];
      lobbyNotifications.value = nativeHistory.filter(item => item && item.id !== 6 && item.text)
        .slice(-100)
        .map(item => ({
          id: `native:${item.index}`,
          text: resolveLobbyChatMentions(item.text),
          category: Number(item.id) === 7 ? "Lobby" : "Hinweis",
        }));
      notificationIndex.value = lobbyNotifications.value.length - 1;
      notificationPanelOpen.value = lobbyNotifications.value.length > 0;
      unsubscribe = adapter.subscribe(value => {
        snapshot.value = value;
        refreshLobbyRating(value.players);
        const self = value.players.find(player => player.self);
        if (self && ["ready", "not-ready"].includes(self.readiness)
          && Date.now() >= optimisticReadinessUntil) selfReadiness.value = self.readiness;
      });
      unsubscribeLobbyChat = window.__fx?.lobbyChatFeed?.subscribe?.(message => {
        const current = adapter.getSnapshot();
        const socketPlayerName = window.__fx?.getLobbyChatSenderName?.(message.senderId);
        const playerName = socketPlayerName;
        if (!playerName) return;
        const segments = resolveLobbyChatSegments(message.text);
        adapter.publish({
          ...current,
          chatMessages: [...current.chatMessages, {
            ...message,
            senderName: playerName,
            senderColor: window.__fx?.getLobbyChatSenderColor?.(message.senderId) || "",
            text: segments.map(segment => segment.text).join(""),
            segments,
          }].slice(-60),
        }, current.source === "none" ? "lobby-socket" : current.source);
      }) ?? (() => {});
      console.info("[ZFX Client LobbyChat] view subscribed", window.__fx?.lobbyChatFeed?.getDiagnostics?.());
      if (!shell) return;
      window.addEventListener("fx-bot-protection-state", handleBotProtectionState);
      window.addEventListener("fx-native-lobby-return", handleNativeLobbyReturn);
      observer = new MutationObserver(records => {
        if (records.some(record => {
          const target = record.target instanceof Element ? record.target : record.target.parentElement;
          return !target?.closest(`#${APP_ID}`);
        })) scheduleRead();
      });
      observer.observe(shell, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ["data-fx-account-name", "data-fx-lobby-ready", "data-fx-rank", "data-fx-rank-text", "data-fx-followed", "data-fx-lobby-mode-active"],
      });
      readinessRefreshTimer = window.setInterval(() => {
        if (active.value && activeTab.value === "chat" && nativeRoot?.isConnected) scheduleRead();
      }, 1000);
      ratingRefreshTimer = window.setInterval(() => refreshLobbyRating(), 1000);
      refreshLobbyRating();
      readLobby();
    });

    onBeforeUnmount(() => {
      observer?.disconnect();
      if (readinessRefreshTimer) window.clearInterval(readinessRefreshTimer);
      if (ratingRefreshTimer) window.clearInterval(ratingRefreshTimer);
      if (frame) cancelAnimationFrame(frame);
      if (missingLobbyTimer) window.clearTimeout(missingLobbyTimer);
      window.removeEventListener("fx-bot-protection-state", handleBotProtectionState);
      window.removeEventListener("fx-native-lobby-return", handleNativeLobbyReturn);
      window.removeEventListener("fx-lobby-notification", handleLobbyNotification);
      unsubscribe();
      unsubscribeLobbyChat();
      restoreNativeRoot();
      adapter.clear();
    });

    return {
      active, labels, snapshot, lobbyRating, scale, query, sortBy, readyFilter, affiliationFilter, filteredPlayers, filteredTeamPlayers, clanGroups, topReadyClan, readyClanSlices, readyClanTotal, activeTab,
      lobbyNotifications, notificationIndex, notificationPanelOpen, currentLobbyNotification,
      previousLobbyNotification, nextLobbyNotification,
      ownClan, clanPlayers, clanReadyCount, teamCount, clanCount, playerCountLabel, onlyReadyClans, visibleClanGroups, chatStatus, activeMode, isTeamMode,
      playerContextMenu, playerListComponent, mentionPlayerFromContextMenu,
      selfReadiness,
      selectMode,
      selectPlayer: openPlayerContextMenu,
      setSort: value => { sortBy.value = ["rank-desc", "rank-asc", "name"].includes(value) ? value : "rank-asc"; },
      setReadyFilter: value => { readyFilter.value = readyFilter.value === value ? "all" : value; },
      setAffiliationFilter: value => { affiliationFilter.value = affiliationFilter.value === value ? "all" : value; },
      resetFilterGroups: () => { readyFilter.value = "all"; affiliationFilter.value = "all"; },
      resetFilters: () => { query.value = ""; readyFilter.value = "all"; affiliationFilter.value = "all"; },
      sendChat: (message, callback) => sendMessage(message, callback),
      sendCall: sendSpawnCall,
      sendJoin: sendJoinCall,
      sendTeamMessage,
      selectLobbyTab,
      setReady: () => {
        const button = nativeReadyButton();
        if (!button) return;
        const nextReadiness = selfReadiness.value === "ready" ? "not-ready" : "ready";
        optimisticReadinessUntil = Date.now() + 1400;
        selfReadiness.value = nextReadiness;
        button.click();
      },
    };
  },
  template: `
    <section v-if="active" id="fx-custom-lobby-view" class="fx-custom-lobby" :style="{ '--fx-custom-lobby-scale': scale }" :aria-label="labels.title">
      <Teleport to="body">
      <aside v-if="notificationPanelOpen && currentLobbyNotification" class="fx-lobby-notifications" aria-live="polite" aria-label="Lobby-Benachrichtigungen">
        <div class="fx-lobby-notification-controls">
          <button type="button" :disabled="notificationIndex <= 0" aria-label="Vorherige Meldung" @click="previousLobbyNotification">◀</button>
          <strong>{{ notificationIndex + 1 }} / {{ lobbyNotifications.length }}</strong>
          <button type="button" :disabled="notificationIndex >= lobbyNotifications.length - 1" aria-label="Nächste Meldung" @click="nextLobbyNotification">▶</button>
          <button type="button" aria-label="Meldung schließen" @click="notificationPanelOpen = false">×</button>
        </div>
        <article class="fx-lobby-notification">
          <span class="fx-lobby-notification-category">{{ currentLobbyNotification.category }}</span>
          <p>{{ currentLobbyNotification.text }}</p>
        </article>
      </aside>
      <div v-if="playerContextMenu" class="fx-custom-lobby-chat-menu-backdrop" @click="playerContextMenu = null" @keydown.esc="playerContextMenu = null">
        <div class="fx-custom-lobby-chat-context-menu" role="menu" :style="{ left: playerContextMenu.x + 'px', top: playerContextMenu.y + 'px' }" @click.stop>
          <strong>{{ playerContextMenu.senderName }}</strong>
          <button type="button" role="menuitem" @click="mentionPlayerFromContextMenu">@ {{ labels.mention }}</button>
        </div>
      </div>
      </Teleport>
      <MapHeader :map="snapshot.currentMap" :map-image="snapshot.currentMapImage" :next-map="snapshot.nextMap" :next-team-count-label="snapshot.nextTeamCountLabel" :is-contest="snapshot.isContest" :next-is-contest="snapshot.nextIsContest" :no-fullsend="snapshot.noFullsend" :next-no-fullsend="snapshot.nextNoFullsend" :labels="labels" :modes="snapshot.modes" :ready-count="snapshot.readyCount" :ready-clans="readyClanSlices" :ready-clan-total="readyClanTotal" :team-count="activeMode?.teamCountLabel || ''" :lobby-rating="lobbyRating" :ready-state="selfReadiness" :ready-disabled="!snapshot.playerCount" @select-mode="selectMode" @ready="setReady" />
      <LobbyProgress :snapshot="snapshot" :labels="labels" />
      <main class="fx-custom-lobby-content">
        <PlayerList ref="playerListComponent" :players="filteredPlayers" :all-players="snapshot.players" :clans="visibleClanGroups" :labels="labels" :count="snapshot.playerCount" :player-count-label="playerCountLabel" :query="query" :sort-by="sortBy" :ready-filter="readyFilter" :affiliation-filter="affiliationFilter" :active-tab="activeTab" :chat-messages="snapshot.chatMessages" :chat-status="chatStatus" :team-mode="isTeamMode" :team-players="filteredTeamPlayers" :team-clan="ownClan" :team-count="teamCount" :clan-count="clanCount" :top-ready-clan="topReadyClan" :only-ready-clans="onlyReadyClans" :current-map="snapshot.currentMap" :next-map="snapshot.nextMap" :next-team-count="snapshot.nextTeamCountLabel" @update:query="query = $event" @update:sort="setSort" @update:ready-filter="setReadyFilter" @update:affiliation-filter="setAffiliationFilter" @reset-filter-groups="resetFilterGroups" @reset-filters="resetFilters" @filter-ready-clans="onlyReadyClans = $event" @select-player="selectPlayer" @select-tab="selectLobbyTab" @send-chat="sendChat" @send-call="sendCall" @send-join="sendJoin" @send-team-message="sendTeamMessage" />
        <ClanOverview :clan="ownClan" :ready-count="clanReadyCount" :member-count="clanPlayers.length" :members="clanPlayers.slice(0, 8)" :labels="labels" />
      </main>
    </section>`,
});

const InGameView = defineComponent({ name: "InGameView", render: () => null });
const ClassicView = defineComponent({ name: "ClassicView", render: () => null });

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/lobby", name: "lobby", component: LobbyView },
    { path: "/game", name: "game", component: InGameView },
    { path: "/classic", name: "classic", component: ClassicView },
    { path: "/:pathMatch(.*)*", redirect: "/classic" },
  ],
});

let classicSessionDisabled = false;
let previousGameState = null;
let nativeLobbySuppressionRoot = null;
let nativeLobbySuppressionSawDeparture = false;
let nativeLobbySuppressionReturnState = null;
let observedNativeMenu = null;
let nativeLobbyReturnPending = false;
let nativeLobbyReturnUntil = 0;
let customLobbyReturnLatched = false;

export function initializeCustomLobbyView() {
  migrateLobbyViewPreference();
  const shell = document.getElementById("fx-game-shell");
  if (!shell || document.getElementById(APP_ID)) return () => {};
  const mount = document.createElement("div");
  mount.id = APP_ID;
  document.body.appendChild(mount);
  const app = createApp({ render: () => h(RouterView) });
  app.config.errorHandler = (error, _instance, info) => {
    console.error("[ZFX Client LobbyView] Vue runtime error:", info, error);
  };
  app.config.warnHandler = (message, _instance, info) => {
    console.warn("[ZFX Client LobbyView] Vue warning:", info, message);
  };
  app.use(router);
  app.mount(mount);
  const stopBotProtectionObserver = observeBotProtection(mount);
  let disposed = false;
  let routeTimer = 0;
  const getTargetRoute = () => {
    const gameState = window.__fx?.getGameVar?.("gameState");
    const inGame = gameState === 1;
    const currentLobbyRoot = findLobbyRoot(shell);
    const returnedToLobby = nativeLobbySuppressionRoot
      && (!nativeLobbySuppressionRoot.isConnected
        || (currentLobbyRoot && currentLobbyRoot !== nativeLobbySuppressionRoot));
    if (nativeLobbyReturnPending) {
      // The native end-of-game callback fires before the game state and menu
      // finish transitioning. Keep honoring that explicit signal throughout
      // the transition so a late native menu update cannot select /classic.
      previousGameState = gameState;
      if (inGame || Date.now() < nativeLobbyReturnUntil) return "/lobby";
      nativeLobbyReturnPending = false;
    }
    if (inGame || (previousGameState === 1 && !inGame) || returnedToLobby) {
      if (classicSessionDisabled) console.info("[ZFX Client LobbyView] Re-enabling custom lobby", {
        reason: inGame ? "game-state" : returnedToLobby ? "native-lobby-replaced" : "game-ended",
      });
      classicSessionDisabled = false;
      nativeLobbySuppressionRoot = null;
    }
    previousGameState = gameState;
    if (customLobbyReturnLatched && window.__fx?.settings?.customLobbyView !== false) {
      if (!inGame) {
        classicSessionDisabled = false;
        return "/lobby";
      }
      return "/game";
    }
    return inGame ? "/game"
      : classicSessionDisabled || window.__fx?.settings?.customLobbyView === false ? "/classic" : "/lobby";
  };
  const syncRoute = () => {
    const target = getTargetRoute();
    if (router.currentRoute.value.path !== target) {
      console.log("[ZFX Client LobbyView] Route change requested", {
        from: router.currentRoute.value.path,
        to: target,
        enabled: window.__fx?.settings?.customLobbyView,
        gameState: window.__fx?.getGameVar?.("gameState"),
      });
      router.replace(target).catch(error => console.error("[ZFX Client] View route update failed:", error));
    }
  };
  window.__fx.navigateFxView = path => router.push(path);
  window.__fx.isCustomLobbyViewVisible = () => window.__fx?.settings?.customLobbyView === true
    && router.currentRoute.value.path === "/lobby"
    && Boolean(mount.querySelector("#fx-custom-lobby-view"));
  window.__fx.hideCustomLobbyView = () => {
    if (!window.__fx.isCustomLobbyViewVisible()) return false;
    customLobbyReturnLatched = false;
    classicSessionDisabled = true;
    nativeLobbySuppressionRoot = findLobbyRoot(shell);
    nativeLobbySuppressionSawDeparture = false;
    nativeLobbySuppressionReturnState = observedNativeMenu
      ? observedNativeMenu.manager[observedNativeMenu.stateField]
      : null;
    router.replace("/classic").catch(error => console.error("[ZFX Client] Lobby hide failed:", error));
    return true;
  };
  window.__fx.showCustomLobbyView = () => {
    customLobbyReturnLatched = false;
    classicSessionDisabled = false;
    nativeLobbySuppressionRoot = null;
    nativeLobbySuppressionSawDeparture = false;
    nativeLobbySuppressionReturnState = null;
    router.replace("/lobby").catch(error => console.error("[ZFX Client] Lobby show failed:", error));
  };
  window.__fx.onGameReturnedToLobby = () => {
    classicSessionDisabled = false;
    customLobbyReturnLatched = true;
    nativeLobbyReturnPending = true;
    nativeLobbyReturnUntil = Date.now() + 6000;
    nativeLobbySuppressionRoot = null;
    nativeLobbySuppressionSawDeparture = false;
    nativeLobbySuppressionReturnState = null;
    if (window.__fx?.settings?.customLobbyView === false) {
      customLobbyReturnLatched = false;
      nativeLobbyReturnPending = false;
      nativeLobbyReturnUntil = 0;
      return;
    }
    let attempts = 0;
    const restoreLobby = () => {
      if (window.__fx?.settings?.customLobbyView === false || attempts++ >= 24) {
        nativeLobbyReturnPending = false;
        return;
      }
      if (router.currentRoute.value.path !== "/lobby") {
        router.replace("/lobby").catch(error => console.error("[ZFX Client] Lobby return navigation failed:", error));
      }
      window.dispatchEvent(new Event("fx-native-lobby-return"));
      window.setTimeout(restoreLobby, 250);
    };
    restoreLobby();
  };
  window.__fx.installNativeLobbyRouteObserver = (menuManager, setStateKey, stateField) => {
    if (!menuManager || !setStateKey || !stateField
      || typeof menuManager[setStateKey] !== "function"
      || !(stateField in menuManager)) return false;
    observedNativeMenu = { manager: menuManager, stateField, setStateKey };
    window.__fx.setNativeMenuState = state => {
      if (!observedNativeMenu || typeof observedNativeMenu.manager[observedNativeMenu.setStateKey] !== "function") return false;
      observedNativeMenu.manager[observedNativeMenu.setStateKey](state);
      return true;
    };
    window.__fx.nativeMenuState = menuManager[stateField];
    if (menuManager.__fxLobbyRouteObserver) return true;
    const originalSetState = menuManager[setStateKey];
    menuManager[setStateKey] = function (...args) {
      const previousState = menuManager[stateField];
      const result = originalSetState.apply(this, args);
      const nextState = menuManager[stateField];
      window.__fx.onNativeMenuStateChange?.(previousState, nextState);
      return result;
    };
    menuManager.__fxLobbyRouteObserver = true;
    console.info("[ZFX Client LobbyView] Native menu route observer installed", { setStateKey, stateField });
    return true;
  };
  window.__fx.onNativeMenuStateChange = (previousState, nextState) => {
    window.__fx.nativeMenuState = nextState;
    window.dispatchEvent(new CustomEvent("fx-native-menu-state-change", { detail: { previousState, nextState } }));
    // Returning from a match can reach the native lobby through a different
    // menu path than the patched game-end handler. State 0 is the game's
    // original lobby; use that transition as a second, native return signal.
    if (nextState === 0 && previousState !== 0 && !nativeLobbyReturnPending) {
      window.__fx.onGameReturnedToLobby?.();
    }
    if (!classicSessionDisabled) return;
    const returnedToOriginalLobbyState = nativeLobbySuppressionReturnState !== null
      && nextState === nativeLobbySuppressionReturnState;
    if (nextState !== 0 && !returnedToOriginalLobbyState) {
      nativeLobbySuppressionSawDeparture = true;
      return;
    }
    if (!nativeLobbySuppressionSawDeparture || previousState === nextState) return;
    classicSessionDisabled = false;
    nativeLobbySuppressionRoot = null;
    nativeLobbySuppressionSawDeparture = false;
    nativeLobbySuppressionReturnState = null;
    router.replace("/lobby").catch(error => console.error("[ZFX Client] Lobby menu return navigation failed:", error));
  };
  router.onError(error => console.error("[ZFX Client] View navigation failed:", error));
  console.log("[ZFX Client LobbyView] Vue app mounted", {
    enabled: window.__fx?.settings?.customLobbyView,
    gameState: window.__fx?.getGameVar?.("gameState"),
    shellFound: Boolean(shell),
    routerPath: router.currentRoute.value.path,
  });
  syncRoute();
  routeTimer = window.setInterval(() => {
    if (!disposed) syncRoute();
  }, 250);

  return () => {
    disposed = true;
    window.clearInterval(routeTimer);
    stopBotProtectionObserver();
    if (app._instance) app.unmount();
    mount.remove();
    if (window.__fx?.navigateFxView) delete window.__fx.navigateFxView;
    if (window.__fx?.isCustomLobbyViewVisible) delete window.__fx.isCustomLobbyViewVisible;
    if (window.__fx?.hideCustomLobbyView) delete window.__fx.hideCustomLobbyView;
    if (window.__fx?.showCustomLobbyView) delete window.__fx.showCustomLobbyView;
    if (window.__fx?.onGameReturnedToLobby) delete window.__fx.onGameReturnedToLobby;
    if (window.__fx?.installNativeLobbyRouteObserver) delete window.__fx.installNativeLobbyRouteObserver;
    if (window.__fx?.setNativeMenuState) delete window.__fx.setNativeMenuState;
    if (window.__fx?.onNativeMenuStateChange) delete window.__fx.onNativeMenuStateChange;
    classicSessionDisabled = false;
    nativeLobbySuppressionRoot = null;
    nativeLobbySuppressionReturnState = null;
    nativeLobbyReturnPending = false;
    nativeLobbyReturnUntil = 0;
    customLobbyReturnLatched = false;
    previousGameState = null;
  };
}
