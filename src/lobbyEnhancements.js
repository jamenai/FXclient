import { isLobbyPlayerRow, syncLobbyReadiness } from "./lobbyRoster.js";
import { createFrameScheduler } from "./frameScheduler.js";

let disposeLobbyEnhancements = null;

export function initializeLobbyEnhancements() {
  if (disposeLobbyEnhancements) return disposeLobbyEnhancements;
  const searchClass = "fx-lobby-roster-search";
  if (window.__fx?.settings?.enhancedLobbyLayout === false) return () => {};
  const translate = key => window.__fx?.translateFX?.(key) ?? key;
  const fontScale = () => Math.max(0.75, Math.min(1.25, Number(window.__fx?.settings?.lobbyFontScale ?? 100) / 100));
  const filterFontSize = () => `clamp(11px, ${0.4 * fontScale()}em, 14px)`;
  const normalizeClan = clan => typeof clan === "string" ? clan.trim().toLocaleUpperCase() : null;
  const getClan = (name, parser) => {
    if (typeof name !== "string") return null;
    if (typeof parser === "function") {
      try {
        const parsed = normalizeClan(parser(name));
        if (parsed) return parsed;
      } catch {}
    }
    return normalizeClan(name.match(/\[([^\]]{1,16})\]/)?.[1] ?? null);
  };
  const isPlayerRow = element => element instanceof HTMLSpanElement && isLobbyPlayerRow(element);
  const activeRosterObservers = new Set();

  function decorateLobbyTabIcons(root) {
    const icons = {
      chat: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.6-.8L4 20l1.5-3.6A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/><path d="M8 11h8M8 14h5"/>',
      players: '<circle cx="12" cy="8" r="3"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const textNode of textNodes) {
      const element = textNode.parentElement;
      if (!element || element.closest("[data-fx-lobby-tab-icon='true']")) continue;
      const match = /^(\s*)(Chat|Spieler|Players)(?=\s|$|\d)/i.exec(textNode.textContent);
      const iconType = match?.[2].toLocaleLowerCase() === "chat" ? "chat"
        : match ? "players" : null;
      const paths = textNode.textContent.length <= 100 && iconType ? icons[iconType] : null;
      if (!paths) continue;
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("width", "23");
      icon.setAttribute("height", "23");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.65");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("stroke-linejoin", "round");
      icon.setAttribute("aria-hidden", "true");
      icon.style.setProperty("width", "23px", "important");
      icon.style.setProperty("height", "23px", "important");
      icon.style.setProperty("min-width", "23px", "important");
      icon.style.setProperty("min-height", "23px", "important");
      icon.style.setProperty("flex", "0 0 23px", "important");
      icon.innerHTML = paths;
      const wrapper = document.createElement("span");
      wrapper.dataset.fxLobbyTabIcon = "true";
      wrapper.style.cssText = "display:inline-flex;align-items:center;gap:.35em;vertical-align:middle";
      textNode.parentNode.insertBefore(wrapper, textNode);
      if (match[1]) textNode.parentNode.insertBefore(document.createTextNode(match[1]), wrapper);
      wrapper.append(icon, document.createTextNode(match[2]));
      const trailingText = textNode.textContent.slice(match[0].length);
      if (trailingText) textNode.parentNode.insertBefore(document.createTextNode(trailingText), textNode);
      textNode.remove();
    }
  }

  function isFollowedPlayer(row) {
    const accountName = row.dataset.fxAccountName;
    const followedAccounts = window.__fx?.followedAccounts;
    const isUnderlined = getComputedStyle(row).textDecorationLine.includes("underline");
    return row.dataset.fxFollowed === "true"
      || row.classList.contains("fx-followed-player")
      || row.querySelector(".fx-followed-player") !== null
      || isUnderlined
      || (typeof accountName === "string" && followedAccounts?.isFollowed?.(accountName) === true);
  }

  function setReadyLabelWeight(button, readyLabel, isReady) {
    let label = button.querySelector(".fx-ready-label");
    if (!label) {
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const textNode = walker.currentNode;
        const index = textNode.textContent.toLocaleLowerCase().indexOf(readyLabel);
        if (index < 0) continue;
        const before = textNode.textContent.slice(0, index);
        const word = textNode.textContent.slice(index, index + readyLabel.length);
        const after = textNode.textContent.slice(index + readyLabel.length);
        label = document.createElement("span");
        label.className = "fx-ready-label";
        label.textContent = word;
        const fragment = document.createDocumentFragment();
        if (before) fragment.appendChild(document.createTextNode(before));
        fragment.appendChild(label);
        if (after) fragment.appendChild(document.createTextNode(after));
        textNode.replaceWith(fragment);
        break;
      }
    }
    if (label) label.style.setProperty("font-weight", isReady ? "700" : "inherit", "important");
  }

  function enhanceRoster(list) {
    if (list.dataset.fxLobbyEnhanced === "true") return;
    list.dataset.fxLobbyEnhanced = "true";
    list.style.display = "grid";
    list.style.gridTemplateColumns = "repeat(auto-fit, minmax(max(10em, calc((100% - 1em) / 6)), 1fr))";
    list.style.alignItems = "center";
    list.style.gap = "0.02em 0.2em";
    list.style.margin = "0.2em 0.35em";

    const search = document.createElement("input");
    search.className = searchClass;
    search.type = "search";
    search.placeholder = translate("searchLobbyPlayers");
    search.setAttribute("aria-label", translate("searchLobbyPlayers"));
    search.style.cssText = "box-sizing:border-box;width:65%;height:1.65em;margin:.2em .35em;padding:.15em .45em;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(0,0,0,.45);color:white;font:inherit";
    const readyFilter = document.createElement("select");
    readyFilter.className = "fx-lobby-ready-filter";
    readyFilter.setAttribute("aria-label", translate("filterReadiness"));
    readyFilter.style.cssText = "box-sizing:border-box;width:30%;height:1.65em;margin:.2em 0;padding:.1em .4em;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(0,0,0,.65);color:white;font:inherit";
    for (const [value, key] of [["all", "allPlayers"], ["ready", "ready"], ["not-ready", "notReady"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = translate(key);
      readyFilter.appendChild(option);
    }
    const followedFilter = document.createElement("select");
    followedFilter.className = "fx-lobby-followed-filter";
    followedFilter.setAttribute("aria-label", translate("filterFollowed"));
    followedFilter.style.cssText = "box-sizing:border-box;width:30%;height:1.65em;margin:.2em 0;padding:.1em .4em;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(0,0,0,.65);color:white;font:inherit";
    for (const [value, key] of [["all", "allPlayers"], ["followed", "followedOnly"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = translate(key);
      followedFilter.appendChild(option);
    }
    const clanFilter = document.createElement("select");
    clanFilter.className = "fx-lobby-clan-filter";
    clanFilter.setAttribute("aria-label", translate("filterClan"));
    clanFilter.style.cssText = "box-sizing:border-box;height:1.65em;margin:.2em 0;padding:.1em .4em;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(0,0,0,.65);color:white;font:inherit";
    for (const [value, key] of [["all", "allPlayers"], ["clan", "clanMembersOnly"], ["my-clan", "myClanOnly"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = translate(key);
      clanFilter.appendChild(option);
    }

    const resetFilters = document.createElement("button");
    resetFilters.className = "fx-lobby-filter-action";
    resetFilters.type = "button";
    resetFilters.textContent = translate("resetLobbyFilters");
    resetFilters.setAttribute("aria-label", translate("resetLobbyFilters"));
    resetFilters.style.cssText = "box-sizing:border-box;min-height:1.65em;padding:.1em .45em;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(0,0,0,.65);color:white;font:inherit;white-space:nowrap;cursor:pointer";

    const followedFirst = document.createElement("button");
    followedFirst.className = "fx-lobby-filter-action";
    followedFirst.type = "button";
    followedFirst.textContent = translate("followedFirst");
    followedFirst.setAttribute("aria-pressed", "false");
    followedFirst.style.cssText = resetFilters.style.cssText;

    const rankSort = document.createElement("button");
    rankSort.className = "fx-lobby-filter-action";
    rankSort.type = "button";
    rankSort.setAttribute("aria-pressed", "false");
    rankSort.textContent = translate("rankBestFirst");
    rankSort.style.cssText = resetFilters.style.cssText;

    const playerCount = document.createElement("span");
    playerCount.setAttribute("aria-live", "polite");
    playerCount.style.cssText = "flex:0 0 auto;white-space:nowrap;opacity:.8;margin:.05em .35em 0 auto";
    const clanDashboard = document.createElement("section");
    clanDashboard.className = "fx-clan-lobby-dashboard";
    clanDashboard.setAttribute("aria-label", translate("clanLobbyDashboard"));
    clanDashboard.setAttribute("aria-live", "polite");
    clanDashboard.style.cssText = "box-sizing:border-box;display:none;flex:1 1 100%;align-items:center;gap:.15em .5em;flex-wrap:wrap;min-width:0;margin:0 .25em;padding:.1em .15em;border:0;background:transparent;font-size:clamp(10px,.4em,12px);line-height:1.2;opacity:.9";
    const filterStorageKey = "fxclient:lobby-filters:v1";
    let sortFollowedFirst = false;
    let rankSortDirection = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(filterStorageKey) ?? "null");
      if (saved && typeof saved === "object") {
        if (typeof saved.search === "string") search.value = saved.search;
        if (["all", "ready", "not-ready"].includes(saved.readiness)) readyFilter.value = saved.readiness;
        if (["all", "followed"].includes(saved.followed)) followedFilter.value = saved.followed;
        if (["all", "clan", "my-clan"].includes(saved.clan)) clanFilter.value = saved.clan;
        if (saved.rankSortDirection === -1 || saved.rankSortDirection === 0 || saved.rankSortDirection === 1) {
          rankSortDirection = saved.rankSortDirection;
        }
        sortFollowedFirst = saved.sortFollowedFirst === true && rankSortDirection === 0;
      }
    } catch {}
    const persistFilterState = () => {
      try {
        localStorage.setItem(filterStorageKey, JSON.stringify({
          search: search.value,
          readiness: readyFilter.value,
          followed: followedFilter.value,
          clan: clanFilter.value,
          sortFollowedFirst,
          rankSortDirection,
        }));
      } catch {}
    };
    followedFirst.setAttribute("aria-pressed", String(sortFollowedFirst));
    followedFirst.style.backgroundColor = sortFollowedFirst ? "rgba(20,90,45,.85)" : "rgba(0,0,0,.65)";
    rankSort.setAttribute("aria-pressed", String(rankSortDirection !== 0));
    rankSort.textContent = translate(rankSortDirection === -1 ? "rankWorstFirst" : "rankBestFirst");
    rankSort.title = rankSort.textContent;
    rankSort.style.backgroundColor = rankSortDirection ? "rgba(20,90,45,.85)" : "rgba(0,0,0,.65)";

    const applyFilterNow = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const parseClan = window.__fx?.leaderboardFilter?.parseClanFromPlayerName;
      const playerId = window.__fx?.getGameVar?.("playerId");
      const ownName = window.__fx?.getGameVar?.("rawPlayerNames")?.[playerId];
      const originalChildren = Array.from(list.children);
      const rows = originalChildren.filter(isPlayerRow).map((row, originalIndex) => ({
        row,
        originalIndex,
        isFollowed: isFollowedPlayer(row),
        readiness: syncLobbyReadiness(row),
        rank: Number(row.dataset.fxRank),
        clan: getClan(row.dataset.fxAccountName, parseClan),
      }));
      const hasRankData = rows.some(({ rank }) => Number.isFinite(rank) && rank > 0);
      rankSort.disabled = !hasRankData;
      rankSort.title = hasRankData ? rankSort.textContent : translate("rankUnavailable");
      rankSort.style.opacity = hasRankData ? "1" : ".55";
      rankSort.style.cursor = hasRankData ? "pointer" : "not-allowed";
      if (!hasRankData && rankSortDirection !== 0) {
        rankSortDirection = 0;
        rankSort.setAttribute("aria-pressed", "false");
        rankSort.textContent = translate("rankBestFirst");
        rankSort.style.backgroundColor = "rgba(0,0,0,.65)";
        persistFilterState();
      }
      const selfRow = rows.find(({ row }) => row.dataset.fxSelf === "true");
      const selfIsReady = selfRow?.readiness === "ready";
      const ownClan = getClan(selfRow?.row.textContent.replace(/^(?:🟢|⚪)\s*/u, ""), parseClan)
        ?? getClan(selfRow?.row.title, parseClan)
        ?? getClan(selfRow?.row.dataset.fxAccountName, parseClan)
        ?? getClan(ownName, parseClan)
        ?? selfRow?.clan
        ?? null;
      let total = 0;
      let shown = 0;
      let readyClanmate = false;
      const clanRows = ownClan ? rows.filter(({ clan }) => clan === ownClan) : [];
      const clanReadyCount = clanRows.filter(({ readiness }) => readiness === "ready").length;
      const clanWaitingCount = clanRows.filter(({ readiness }) => readiness === "not-ready").length;
      const clanUnknownCount = clanRows.length - clanReadyCount - clanWaitingCount;
      const dashboardEnabled = window.__fx?.settings?.showClanLobbyDashboard !== false;
      clanDashboard.style.display = dashboardEnabled && ownClan ? "flex" : "none";
      const dashboardState = JSON.stringify([
        dashboardEnabled,
        ownClan,
        clanReadyCount,
        clanWaitingCount,
        clanUnknownCount,
        readyFilter.value,
        followedFilter.value,
        clanFilter.value,
        search.value,
        clanRows.map(({ row, readiness }) => [row.dataset.fxAccountName, row.textContent, readiness]),
      ]);
      if (clanDashboard.dataset.fxState !== dashboardState) {
        clanDashboard.dataset.fxState = dashboardState;
        clanDashboard.replaceChildren();
        if (dashboardEnabled && ownClan) {
        const title = document.createElement("strong");
        title.textContent = `[${ownClan}]`;
        clanDashboard.append(title);
        const createClanFilterAction = (label, readiness) => {
          const action = document.createElement("button");
          action.type = "button";
          action.dataset.fxClanFilter = readiness;
          action.textContent = label;
          action.setAttribute("aria-pressed", String(
            clanFilter.value === "my-clan" && readyFilter.value === readiness
              && followedFilter.value === "all" && search.value === ""
          ));
          action.style.cssText = `padding:0 .2em;border:0;border-radius:3px;background:${action.getAttribute("aria-pressed") === "true" ? "rgba(45,120,70,.35)" : "transparent"};color:inherit;font:inherit;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px`;
          action.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            search.value = "";
            readyFilter.value = readiness;
            followedFilter.value = "all";
            clanFilter.value = "my-clan";
            persistFilterState();
            applyFilterNow();
          });
          return action;
        };
        const summary = createClanFilterAction(translate("clanReadySummary")
          .replace("{ready}", String(clanReadyCount))
          .replace("{total}", String(clanRows.length)), "ready");
        summary.setAttribute("aria-label", translate("clanReadyFilterAction"));
        clanDashboard.append(title, summary);
        if (clanWaitingCount > 0) {
          const waiting = createClanFilterAction(translate("clanWaitingSummary").replace("{count}", String(clanWaitingCount)), "not-ready");
          waiting.setAttribute("aria-label", translate("clanWaitingFilterAction"));
          clanDashboard.append(waiting);
        }
        if (clanUnknownCount > 0) {
          const unknown = document.createElement("span");
          unknown.textContent = translate("readinessUnknown") + `: ${clanUnknownCount}`;
          clanDashboard.append(unknown);
        }
        const memberList = document.createElement("span");
        memberList.style.cssText = "display:flex;flex:1 1 12em;flex-wrap:wrap;gap:.15em .4em;min-width:0;overflow:hidden";
        for (const { row, readiness } of clanRows) {
          const member = document.createElement("span");
          const name = row.dataset.fxAccountName || row.textContent.trim();
          const status = document.createElement("span");
          status.setAttribute("aria-hidden", "true");
          status.style.cssText = `display:inline-block;flex:0 0 .42em;width:.42em;height:.42em;margin-right:.25em;border-radius:50%;vertical-align:middle;background:${readiness === "ready" ? "#55d98b" : readiness === "not-ready" ? "#aaa" : "#e0b34c"}`;
          member.append(status, document.createTextNode(name || translate("unknownPlayer")));
          const readinessLabel = readiness === "ready" ? translate("ready")
            : readiness === "not-ready" ? translate("notReady") : translate("readinessUnknown");
          member.setAttribute("aria-label", `${name || translate("unknownPlayer")}: ${readinessLabel}`);
          member.title = `${name || translate("unknownPlayer")}: ${readinessLabel}`;
          member.style.cssText = "display:inline-flex;align-items:center;max-width:11em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
          memberList.append(member);
        }
        if (clanRows.length) clanDashboard.append(memberList);
        }
      }
      const sortingActive = sortFollowedFirst || (rankSortDirection !== 0 && hasRankData);
      const orderedRows = rows.slice();
      if (sortingActive) {
        orderedRows.sort((a, b) => {
          if (sortFollowedFirst) {
            const followedDifference = Number(b.isFollowed) - Number(a.isFollowed);
            if (followedDifference) return followedDifference;
          }
          if (!rankSortDirection) return a.originalIndex - b.originalIndex;
          const validA = Number.isFinite(a.rank) && a.rank > 0;
          const validB = Number.isFinite(b.rank) && b.rank > 0;
          if (validA !== validB) return validA ? -1 : 1;
          if (!validA) return a.originalIndex - b.originalIndex;
          const rankDifference = (a.rank - b.rank) * rankSortDirection;
          return rankDifference || a.originalIndex - b.originalIndex;
        });
      }
      const orderByRow = new Map(orderedRows.map(({ row }, index) => [row, String(index)]));
      for (const { row, isFollowed, readiness, clan } of rows) {
        total++;
        const text = row.textContent.trim();
        const matchesReadiness = readyFilter.value === "all"
          || (readyFilter.value === "ready" && readiness === "ready")
          || (readyFilter.value === "not-ready" && readiness === "not-ready");
        const matchesFollowed = followedFilter.value !== "followed" || isFollowed;
        const isSelf = row.dataset.fxSelf === "true" || row.dataset.fxAccountName === ownName;
        if (ownClan && clan === ownClan && !isSelf && readiness === "ready") {
          readyClanmate = true;
        }
        const matchesClan = clanFilter.value === "all"
          || (clanFilter.value === "clan" && clan != null)
          || (clanFilter.value === "my-clan" && ownClan != null && clan === ownClan);
        const visible = text.toLocaleLowerCase().includes(query) && matchesReadiness && matchesFollowed && matchesClan;
        if (visible) shown++;
        const desiredOrder = sortingActive ? orderByRow.get(row) : "";
        if (row.style.order !== desiredOrder) row.style.order = desiredOrder;
        if (row.style.fontSize !== ".58em") row.style.fontSize = ".58em";
        const desiredDisplay = visible ? "inline-block" : "none";
        if (row.style.getPropertyValue("display") !== desiredDisplay
          || row.style.getPropertyPriority("display") !== "important") {
          row.style.setProperty("display", desiredDisplay, "important");
        }
      }
      playerCount.textContent = translate("showingPlayers")
        .replace("{shown}", String(shown))
        .replace("{total}", String(total));
      if (clanFilter.value === "my-clan" && !ownClan) {
        playerCount.textContent += ` · ${translate("myClanUnavailable")}`;
      }
      const readyLabel = translate("ready").trim().toLocaleLowerCase();
      for (const button of document.querySelectorAll("button, [role='button']")) {
        const buttonLabel = button.textContent.replace(/\s+/g, " ").trim().toLocaleLowerCase();
        if (button.dataset.fxReadyButton !== "true"
          && !buttonLabel.startsWith(readyLabel)) continue;
        button.dataset.fxReadyButton = "true";
        setReadyLabelWeight(button, readyLabel, selfIsReady);
        let badge = button.querySelector(".fx-ready-clan-badge");
        if (readyClanmate && ownClan) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "fx-ready-clan-badge";
            badge.style.cssText = "display:inline-block;margin-left:.35em;padding:.05em .3em;border-radius:.3em;background:rgba(55,190,105,.22);color:#9af0b8;font-size:.72em;vertical-align:middle";
            button.appendChild(badge);
          }
          const badgeText = `[${ownClan}]`;
          if (badge.textContent !== badgeText) badge.textContent = badgeText;
          if (button.style.getPropertyValue("box-shadow") !== "inset 0 0 0 2px #55d98b"
            || button.style.getPropertyPriority("box-shadow") !== "important") {
            button.style.setProperty("box-shadow", "inset 0 0 0 2px #55d98b", "important");
          }
        } else {
          badge?.remove();
          button.style.removeProperty("box-shadow");
        }
      }
    };
    let active = true;
    const scheduleApplyFilter = createFrameScheduler(() => {
      if (active) applyFilterNow();
    });
    const clanRefreshTimer = window.setInterval(scheduleApplyFilter, 1000);
    search.addEventListener("input", () => { persistFilterState(); scheduleApplyFilter(); });
    readyFilter.addEventListener("change", () => { persistFilterState(); scheduleApplyFilter(); });
    followedFilter.addEventListener("change", () => { persistFilterState(); scheduleApplyFilter(); });
    clanFilter.addEventListener("change", () => { persistFilterState(); scheduleApplyFilter(); });
    resetFilters.addEventListener("click", () => {
      search.value = "";
      readyFilter.value = "all";
      followedFilter.value = "all";
      clanFilter.value = "all";
      sortFollowedFirst = false;
      followedFirst.setAttribute("aria-pressed", "false");
      followedFirst.style.backgroundColor = "rgba(0,0,0,.65)";
      rankSortDirection = 0;
      rankSort.setAttribute("aria-pressed", "false");
      rankSort.textContent = translate("rankBestFirst");
      rankSort.style.backgroundColor = "rgba(0,0,0,.65)";
      persistFilterState();
      scheduleApplyFilter();
    });
    followedFirst.addEventListener("click", () => {
      sortFollowedFirst = !sortFollowedFirst;
      if (sortFollowedFirst) {
        rankSortDirection = 0;
        rankSort.setAttribute("aria-pressed", "false");
        rankSort.textContent = translate("rankBestFirst");
        rankSort.style.backgroundColor = "rgba(0,0,0,.65)";
      }
      followedFirst.setAttribute("aria-pressed", String(sortFollowedFirst));
      followedFirst.style.backgroundColor = sortFollowedFirst ? "rgba(20,90,45,.85)" : "rgba(0,0,0,.65)";
      persistFilterState();
      scheduleApplyFilter();
    });
    rankSort.addEventListener("click", () => {
      rankSortDirection = rankSortDirection === 0 ? 1 : rankSortDirection === 1 ? -1 : 0;
      if (rankSortDirection !== 0) {
        sortFollowedFirst = false;
        followedFirst.setAttribute("aria-pressed", "false");
        followedFirst.style.backgroundColor = "rgba(0,0,0,.65)";
      }
      rankSort.setAttribute("aria-pressed", String(rankSortDirection !== 0));
      rankSort.textContent = translate(rankSortDirection === -1 ? "rankWorstFirst" : "rankBestFirst");
      rankSort.style.backgroundColor = rankSortDirection ? "rgba(20,90,45,.85)" : "rgba(0,0,0,.65)";
      persistFilterState();
      scheduleApplyFilter();
    });
    const controls = document.createElement("div");
    controls.style.cssText = "position:sticky;top:0;z-index:5;box-sizing:border-box;display:flex;align-items:center;gap:.25em;width:100%;flex-wrap:wrap;margin-bottom:.15em;padding:.25em .15em;background:transparent";
    search.style.cssText += `;flex:1 1 10em;width:auto;min-width:6em;font-size:${filterFontSize()};border-width:.5px`;
    readyFilter.style.cssText += `;flex:1 1 7em;width:auto;min-width:6em;font-size:${filterFontSize()};border-width:.5px`;
    followedFilter.style.cssText += `;flex:1 1 7em;width:auto;min-width:6em;font-size:${filterFontSize()};border-width:.5px`;
    clanFilter.style.cssText += `;flex:1 1 7em;width:auto;min-width:6em;font-size:${filterFontSize()};border-width:.5px`;
    resetFilters.style.fontSize = followedFirst.style.fontSize = rankSort.style.fontSize = filterFontSize();
    resetFilters.style.borderWidth = followedFirst.style.borderWidth = rankSort.style.borderWidth = ".5px";
    playerCount.style.fontSize = `clamp(10px, ${0.34 * fontScale()}em, 12px)`;
    controls.append(clanDashboard, search, readyFilter, followedFilter, clanFilter, followedFirst, rankSort, resetFilters, playerCount);
    list.parentElement.insertBefore(controls, list);
    let lobbyRoot = list.parentElement;
    for (let depth = 0; lobbyRoot.parentElement && depth < 2; depth++) lobbyRoot = lobbyRoot.parentElement;
    decorateLobbyTabIcons(lobbyRoot);
    const thinLobbyBorders = () => {
      for (const element of [lobbyRoot, ...lobbyRoot.querySelectorAll("*")]) {
        const style = getComputedStyle(element);
        if (!element.classList.contains("fx-lobby-filter-action")
          && element.matches("button, [role='button'], h1, h2, h3")) {
          const baseSize = element.matches("h1, h2, h3") ? 0.72 : 0.56;
          const scaledSize = `clamp(12px, ${baseSize * fontScale()}em, 22px)`;
          if (element.style.fontSize !== scaledSize) element.style.fontSize = scaledSize;
        }
        const hasBorder = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
          .some(width => parseFloat(width) > 0);
        const inlineBorderWidth = element.style.getPropertyValue("border-width");
        const inlineBorderPriority = element.style.getPropertyPriority("border-width");
        if (hasBorder && (parseFloat(inlineBorderWidth) !== 0.5 || inlineBorderPriority !== "important")) {
          element.style.setProperty("border-width", ".5px", "important");
        }
      }
    };
    thinLobbyBorders();
    const scheduleLobbyRefresh = createFrameScheduler(() => {
      if (!active) return;
      decorateLobbyTabIcons(lobbyRoot);
      thinLobbyBorders();
      scheduleApplyFilter();
    });
    const borderObserver = new MutationObserver(records => {
      const onlyDashboardChanges = records.length > 0 && records.every(record => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        return target?.closest(".fx-clan-lobby-dashboard") != null;
      });
      if (!onlyDashboardChanges) scheduleLobbyRefresh();
    });
    borderObserver.observe(lobbyRoot, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      characterData: true,
      subtree: true
    });
    const filterObserver = new MutationObserver(scheduleApplyFilter);
    filterObserver.observe(list, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "data-fx-followed", "data-fx-lobby-ready", "data-fx-rank"]
    });
    let observerRecord;
    const dispose = () => {
      if (!active) return;
      active = false;
      window.clearInterval(clanRefreshTimer);
      borderObserver.disconnect();
      filterObserver.disconnect();
      controls.remove();
      delete list.dataset.fxLobbyEnhanced;
      activeRosterObservers.delete(observerRecord);
    };
    observerRecord = { list, root: lobbyRoot, dispose };
    activeRosterObservers.add(observerRecord);
    scheduleApplyFilter();
  }

  function scan(root) {
    const spans = [];
    const divs = [];
    if (root instanceof Element) {
      if (root.matches("span")) spans.push(root);
      if (root.matches("div")) divs.push(root);
      spans.push(...root.querySelectorAll("span"));
      divs.push(...root.querySelectorAll("div"));
    }
    for (const element of spans) {
      if (element.dataset.fxAccountName && element.dataset.fxLobbyPlayer !== "true") {
        element.dataset.fxLobbyPlayer = "true";
      }
      if (isPlayerRow(element)) syncLobbyReadiness(element);
      if (/^[^:]{1,12}:\s*\d+$/.test(element.textContent.trim())) {
        const size = `${0.62 * fontScale()}em`;
        if (element.style.fontSize !== size) element.style.fontSize = size;
        if (element.style.whiteSpace !== "nowrap") element.style.whiteSpace = "nowrap";
      }
    }
    for (const element of divs) {
      if (element.children.length < 8) continue;
      const rows = Array.from(element.children).filter(isPlayerRow);
      if (rows.length >= 8) enhanceRoster(element);
    }
  }

  const observer = new MutationObserver(records => {
    for (const observerRecord of activeRosterObservers) {
      if (!observerRecord.list.isConnected
        || !observerRecord.root.isConnected
        || !observerRecord.root.contains(observerRecord.list)) {
        observerRecord.dispose();
      }
    }
    for (const record of records) {
      if (record.type === "attributes" && record.target instanceof Element) {
        scan(record.target.parentElement ?? record.target);
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) scan(node);
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-fx-account-name"]
  });
  scan(document.documentElement);

  const dispose = () => {
    observer.disconnect();
    for (const observerRecord of activeRosterObservers) observerRecord.dispose();
    disposeLobbyEnhancements = null;
  };
  disposeLobbyEnhancements = dispose;
  return dispose;
}
