const COLLAPSED_STORAGE_KEY = "fx_sidebar_collapsed";
const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 56;
const MOBILE_BREAKPOINT = 700;
const LOBBY_RANK_TIERS = [
  { maximumRank: 100, key: "sidebarRankDiamond", icon: "💎" },
  { maximumRank: 1000, key: "sidebarRankPlatinum", icon: "🔷" },
  { maximumRank: 10000, key: "sidebarRankGold", icon: "🥇" },
  { maximumRank: 50000, key: "sidebarRankSilver", icon: "🥈" },
  { maximumRank: Infinity, key: "sidebarRankBronze", icon: "🥉" },
];

function makeButton(text, title, action, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fx-sidebar-button ${className}`.trim();
  button.title = title;
  button.setAttribute("aria-label", title);
  if (className === "fx-sidebar-action") {
    const icon = document.createElement("span");
    icon.className = "fx-sidebar-icon";
    icon.setAttribute("aria-hidden", "true");
    if (text === "settings" || text === "home") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "18");
      svg.setAttribute("height", "18");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.8");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = text === "home"
        ? '<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/>'
        : '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2m0 14.4v2m9.2-9.2h-2m-14.4 0h-2m15.7-6.5-1.4 1.4M6.9 17.1l-1.4 1.4m13 0-1.4-1.4M6.9 6.9 5.5 5.5"/>';
      icon.append(svg);
    } else {
      icon.textContent = text;
    }
    const label = document.createElement("span");
    label.className = "fx-sidebar-label";
    label.textContent = title;
    button.append(icon, label);
  } else {
    button.textContent = text;
  }
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    action();
    button.blur();
  });
  return button;
}

export function createSidebar() {
  let enabled = window.__fx?.settings?.showSidebar !== false;
  let mode = window.innerWidth < 900 ? "collapsed" : "expanded";
  try {
    const saved = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (saved === "expanded" || saved === "collapsed" || saved === "hidden") mode = saved;
    else if (saved === "true") mode = "collapsed";
    else if (saved === "false") mode = "expanded";
  } catch { /* Use the responsive default when storage is unavailable. */ }

  let panelWidth = COLLAPSED_WIDTH;
  let reservedWidth = COLLAPSED_WIDTH;
  let lastVisibleMode = mode === "hidden" ? (window.innerWidth < 900 ? "collapsed" : "expanded") : mode;
  let requestResize = () => {};
  const canvas = () => document.getElementById("canvasA");
  const shell = document.getElementById("fx-game-shell");
  if (!shell) throw new Error("FX game shell is missing from the page");
  const sidebar = document.createElement("aside");
  sidebar.id = "fx-sidebar";
  sidebar.setAttribute("aria-label", "FX Client sidebar");

  const heading = document.createElement("div");
  heading.className = "fx-sidebar-heading";
  heading.textContent = "ZULUS FX";

  const translate = key => window.__fx?.translateFX?.(key) ?? key;
  const modeControls = document.createElement("div");
  modeControls.className = "fx-sidebar-mode-actions";
  const createModeAction = (icon, className, action) => {
    const button = makeButton("", "", action, `fx-sidebar-mode-action ${className}`);
    const iconElement = document.createElement("span");
    iconElement.className = "fx-sidebar-mode-icon";
    iconElement.setAttribute("aria-hidden", "true");
    iconElement.textContent = icon;
    const labelElement = document.createElement("span");
    labelElement.className = "fx-sidebar-mode-label";
    button.append(iconElement, labelElement);
    return { button, iconElement, labelElement };
  };
  const widthAction = createModeAction("‹", "fx-sidebar-width-action", () => {
    setMode(mode === "expanded" ? "collapsed" : "expanded");
  });
  const hideAction = createModeAction("×", "fx-sidebar-hide-action", () => setMode("hidden"));
  modeControls.append(widthAction.button, hideAction.button);

  const restore = makeButton("›", "Show sidebar", () => {
    setMode(lastVisibleMode);
  }, "fx-sidebar-restore");
  restore.id = "fx-sidebar-restore";

  const clockSlot = document.createElement("div");
  clockSlot.className = "fx-sidebar-clock";
  const lobbyCard = document.createElement("section");
  lobbyCard.className = "fx-sidebar-lobby";
  lobbyCard.hidden = true;
  const lobbyHeading = document.createElement("div");
  lobbyHeading.className = "fx-sidebar-lobby-heading";
  lobbyHeading.textContent = translate("sidebarLobbyLabel");
  const lobbySummary = document.createElement("div");
  lobbySummary.className = "fx-sidebar-lobby-summary";
  const lobbySkill = document.createElement("div");
  lobbySkill.className = "fx-sidebar-lobby-skill";
  const clanJoin = document.createElement("button");
  clanJoin.type = "button";
  clanJoin.className = "fx-sidebar-clan-join";
  clanJoin.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 10v4h3l11 5V5L6 10H3zm4 4.1 2.2 5.4h3.2L11 15.1 7 14.1zM19 9.2a4 4 0 0 1 0 5.6l1.4 1.4a6 6 0 0 0 0-8.4L19 9.2z"/></svg><span>join</span>';
  clanJoin.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if (clanJoin.dataset.clan) window.__fx?.sendClanJoinMessage?.(clanJoin.dataset.clan);
  });
  lobbyCard.append(lobbyHeading, lobbySummary, lobbySkill, clanJoin);
  const navigation = document.createElement("nav");
  navigation.className = "fx-sidebar-navigation";

  const appendSection = (labelKey, actions) => {
    const section = document.createElement("section");
    section.className = "fx-sidebar-section";
    const sectionHeading = document.createElement("div");
    sectionHeading.className = "fx-sidebar-section-heading";
    sectionHeading.textContent = translate(labelKey);
    section.append(sectionHeading);
    navigation.appendChild(section);
    for (const [icon, labelKey, action] of actions) {
      const label = translate(labelKey);
      section.append(makeButton(icon, label, action, "fx-sidebar-action"));
    }
  };

  appendSection("sidebarGeneralGroup", [
    ["home", "sidebarHome", () => window.__fx?.openHome?.()],
    ["⚔️", "sidebarMultiplayer", () => window.__fx?.startMultiplayer?.()],
    ["🏆", "sidebarLeaderboard", () => window.__fx?.openGameMenuAction?.("leaderboard")],
    ["▶", "sidebarReplays", () => window.__fx?.openGameMenuAction?.("replays")],
    ["📜", "sidebarLogs", () => window.__fx?.openGameMenuAction?.("logs")],
  ]);
  appendSection("sidebarAccountGroup", [
    ["⚙", "sidebarGameSettings", () => window.__fx?.openGameMenuAction?.("settings")],
    ["settings", "sidebarSettings", () => window.__fx?.WindowManager?.openWindow("settings")],
    ["🔑", "sidebarAccount", () => window.__fx?.openAccount?.()],
    ["🧈", "sidebarGoldTransfer", () => window.__fx?.openGameMenuAction?.("goldTransfer")],
  ]);

  const updateNavigationVisibility = () => {
    let isInRound = false;
    try { isInRound = window.__fx?.getGameVar?.("gameState") === 1; } catch { /* Keep navigation visible if game state is unavailable. */ }
    navigation.hidden = isInRound;
    navigation.setAttribute("aria-hidden", String(isInRound));
  };
  updateNavigationVisibility();
  window.setInterval(updateNavigationVisibility, 500);

  sidebar.append(heading, clockSlot, lobbyCard, navigation, modeControls);
  document.body.append(sidebar, restore);
  const nativeAppendChild = document.body.appendChild.bind(document.body);
  const nativeRemoveChild = document.body.removeChild.bind(document.body);
  document.body.appendChild = node => node === sidebar || node === restore || node === shell
    ? nativeAppendChild(node)
    : shell.appendChild(node);
  document.body.removeChild = node => node.parentNode === shell
    ? shell.removeChild(node)
    : nativeRemoveChild(node);

  function setMode(nextMode) {
    if (nextMode !== "hidden") lastVisibleMode = nextMode;
    mode = nextMode;
    try { localStorage.setItem(COLLAPSED_STORAGE_KEY, mode); } catch { /* Keep state for this page. */ }
    updateLayout();
  }

  function updateLobbyStatus() {
    const roster = document.querySelector('[data-fx-lobby-enhanced="true"]');
    const rows = roster
      ? Array.from(roster.querySelectorAll('span[data-fx-lobby-player="true"]'))
      : [];
    if (!rows.length) {
      lobbyCard.hidden = true;
      clanJoin.hidden = true;
      return;
    }

    const selfRow = rows.find(row => row.dataset.fxSelf === "true");
    const rawNames = window.__fx?.getGameVar?.("rawPlayerNames");
    const playerId = window.__fx?.getGameVar?.("playerId");
    const ownName = selfRow?.dataset.fxAccountName ?? rawNames?.[playerId] ?? "";
    const parseClan = window.__fx?.leaderboardFilter?.parseClanFromPlayerName;
    const getClan = name => {
      if (typeof name !== "string" || typeof parseClan !== "function") return null;
      try { return parseClan(name)?.toLocaleUpperCase() ?? null; } catch { return null; }
    };
    const ownClan = getClan(ownName);
    const readyCount = rows.filter(row => row.dataset.fxLobbyReady === "ready").length;
    const readyRanks = rows
      .filter(row => row.dataset.fxLobbyReady === "ready")
      .map(row => row.dataset.fxRank)
      .filter(rank => rank !== "")
      .map(Number)
      .filter(rank => Number.isFinite(rank) && rank > 0);
    if (readyRanks.length) {
      const sortedRanks = readyRanks.sort((a, b) => a - b);
      const middle = Math.floor(sortedRanks.length / 2);
      const medianRank = Math.round(sortedRanks.length % 2
        ? sortedRanks[middle]
        : (sortedRanks[middle - 1] + sortedRanks[middle]) / 2);
      const formattedRank = new Intl.NumberFormat().format(medianRank);
      const tier = LOBBY_RANK_TIERS.find(({ maximumRank }) => medianRank <= maximumRank);
      const tierLabel = translate(tier.key);
      const tierIcon = document.createElement("span");
      tierIcon.className = "fx-sidebar-lobby-tier-icon";
      tierIcon.textContent = tier.icon;
      tierIcon.style.fontSize = mode === "collapsed" ? "26px" : "13px";
      tierIcon.style.lineHeight = "1";
      tierIcon.setAttribute("aria-hidden", "true");
      const tierText = document.createElement("span");
      tierText.className = "fx-sidebar-lobby-tier-text";
      tierText.textContent = translate("sidebarReadySkill")
        .replace("{tier}", tierLabel)
        .replace("{rank}", formattedRank);
      tierText.hidden = mode === "collapsed";
      lobbySkill.replaceChildren(tierIcon, tierText);
      lobbySkill.title = translate("sidebarReadySkillTitle")
        .replace("{count}", String(readyRanks.length))
        .replace("{tier}", tierLabel)
        .replace("{rank}", formattedRank);
      lobbySkill.hidden = false;
    } else {
      lobbySkill.replaceChildren();
      lobbySkill.title = "";
      lobbySkill.hidden = true;
    }
    const clanRows = ownClan
      ? rows.filter(row => getClan(row.dataset.fxAccountName ?? row.textContent) === ownClan)
      : [];
    const clanReadyCount = clanRows.filter(row => row.dataset.fxLobbyReady === "ready").length;
    const summaryKey = ownClan ? "sidebarLobbySummaryClan" : "sidebarLobbySummary";
    const summary = translate(summaryKey)
      .replace("{ready}", String(readyCount))
      .replace("{total}", String(rows.length))
      .replace("{clanReady}", String(clanReadyCount))
      .replace("{clanTotal}", String(clanRows.length));
    const compactSummary = `${readyCount}/${rows.length}`;
    lobbySummary.textContent = mode === "collapsed" ? compactSummary : summary;
    lobbySummary.title = summary;
    lobbySummary.setAttribute("aria-label", summary);
    lobbyCard.hidden = false;
    clanJoin.hidden = !ownClan;
    if (ownClan) {
      clanJoin.dataset.clan = ownClan;
      clanJoin.title = `@[${ownClan}] join`;
      clanJoin.setAttribute("aria-label", translate("sidebarJoinClanTitle").replace("{clan}", ownClan));
    } else {
      delete clanJoin.dataset.clan;
    }
  }

  function updateLayout() {
    const expandedWidth = Math.min(EXPANDED_WIDTH, Math.max(160, window.innerWidth * 0.32));
    const isMobileExpanded = window.innerWidth < MOBILE_BREAKPOINT && mode === "expanded";
    panelWidth = !enabled ? 0 : mode === "expanded"
      ? (isMobileExpanded ? Math.min(expandedWidth, window.innerWidth * 0.82) : expandedWidth)
      : mode === "collapsed" ? COLLAPSED_WIDTH : 0;
    reservedWidth = !enabled || mode === "hidden" || isMobileExpanded ? 0 : panelWidth;
    sidebar.hidden = !enabled || mode === "hidden";
    restore.hidden = !enabled || mode !== "hidden";
    sidebar.classList.toggle("is-collapsed", mode === "collapsed");
    sidebar.classList.toggle("is-expanded", mode === "expanded");
    sidebar.style.width = `${panelWidth}px`;
    document.documentElement.style.setProperty("--fx-sidebar-width", `${reservedWidth}px`);
    document.documentElement.dataset.fxSidebarHidden = String(!enabled || mode === "hidden");
    const widthActionLabel = translate(mode === "expanded" ? "sidebarModeCompact" : "sidebarModeExpanded");
    widthAction.button.title = widthActionLabel;
    widthAction.button.setAttribute("aria-label", widthActionLabel);
    widthAction.iconElement.textContent = mode === "expanded" ? "‹" : "›";
    widthAction.labelElement.textContent = widthActionLabel;
    hideAction.button.title = translate("sidebarModeHidden");
    hideAction.button.setAttribute("aria-label", hideAction.button.title);
    hideAction.labelElement.textContent = hideAction.button.title;
    restore.title = translate("sidebarShow");
    restore.setAttribute("aria-label", restore.title);
    updateLobbyStatus();
    requestResize();
  }

  window.addEventListener("resize", updateLayout);
  updateLayout();
  updateLobbyStatus();
  window.setInterval(updateLobbyStatus, 1000);

  return {
    getWidth: () => reservedWidth,
    toGameX(input, event = input) {
      const target = event?.target ?? input?.target;
      return Number.isFinite(input?.clientX) && target === canvas()
        ? input.clientX - reservedWidth
        : input?.clientX;
    },
    getClockSlot: () => clockSlot,
    setEnabled(value) {
      enabled = value !== false;
      updateLayout();
    },
    isEnabled: () => enabled,
    requestResize() { requestResize(); },
    setResizeHandler(handler) { if (typeof handler === "function") requestResize = handler; },
    isCollapsed: () => mode !== "expanded" || window.innerWidth < MOBILE_BREAKPOINT,
  };
}
