import { isLobbyPlayerRow, syncLobbyReadiness } from "./lobbyRoster.js";
import { createFrameScheduler } from "./frameScheduler.js";

let disposeLobbyEnhancements = null;

export function initializeLobbyEnhancements() {
  if (disposeLobbyEnhancements) return disposeLobbyEnhancements;
  const searchClass = "fx-lobby-roster-search";
  if (window.__fx?.settings?.enhancedLobbyLayout === false) return () => {};
  const translate = key => window.__fx?.translateFX?.(key) ?? key;
  const fontScale = () => Math.max(0.75, Math.min(3, Number(window.__fx?.settings?.lobbyFontScale ?? 100) / 100));
  const filterFontSize = () => `clamp(11px, ${0.4 * fontScale()}em, 42px)`;
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
      icon.setAttribute("width", "18");
      icon.setAttribute("height", "18");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.65");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("stroke-linejoin", "round");
      icon.setAttribute("aria-hidden", "true");
      icon.style.setProperty("width", "clamp(14px, 1.1em, 22px)", "important");
      icon.style.setProperty("height", "clamp(14px, 1.1em, 22px)", "important");
      icon.style.setProperty("min-width", "14px", "important");
      icon.style.setProperty("min-height", "14px", "important");
      icon.style.setProperty("max-width", "22px", "important");
      icon.style.setProperty("max-height", "22px", "important");
      icon.style.setProperty("flex", "0 0 clamp(14px, 1.1em, 22px)", "important");
      icon.innerHTML = paths;
      const wrapper = document.createElement("span");
      wrapper.dataset.fxLobbyTabIcon = "true";
      wrapper.style.cssText = "display:inline-flex;align-items:center;gap:.25em;vertical-align:middle;line-height:1";
      textNode.parentNode.insertBefore(wrapper, textNode);
      if (match[1]) textNode.parentNode.insertBefore(document.createTextNode(match[1]), wrapper);
      wrapper.append(icon, document.createTextNode(match[2]));
      const trailingText = textNode.textContent.slice(match[0].length);
      if (trailingText) textNode.parentNode.insertBefore(document.createTextNode(trailingText), textNode);
      textNode.remove();
    }

    for (const wrapper of root.querySelectorAll("[data-fx-lobby-tab-icon='true']")) {
      const tab = wrapper.closest("button, [role='button']");
      if (!tab) continue;
      const isPlayerTab = /^(?:spieler|players)\b/i.test(wrapper.textContent.trim());
      const clanCounterPattern = /^[A-Z0-9_-]{1,12}:\s*\d+$/;
      const setImportant = (element, property, value) => {
        if (element.style.getPropertyValue(property) !== value
          || element.style.getPropertyPriority(property) !== "important") {
          element.style.setProperty(property, value, "important");
        }
      };
      tab.style.setProperty("box-sizing", "border-box", "important");
      tab.style.setProperty("height", "auto", "important");
      tab.style.setProperty("min-height", "0", "important");
      tab.style.setProperty("padding", "0 .35em", "important");
      tab.style.setProperty("line-height", "1.05", "important");
      tab.style.setProperty("font-size", `clamp(11px, ${0.42 * fontScale()}em, 36px)`, "important");
      tab.style.setProperty("display", "flex", "important");
      tab.style.setProperty("align-items", "center", "important");
      tab.style.setProperty("justify-content", "center", "important");
      setImportant(wrapper, "justify-content", "center");
      if (tab.parentElement) {
        setImportant(tab.parentElement, "display", "flex");
        setImportant(tab.parentElement, "align-items", "stretch");
        setImportant(tab.parentElement, "width", "100%");
        setImportant(tab.parentElement, "flex", "1 1 auto");
        setImportant(tab.parentElement, "align-self", "stretch");
        setImportant(tab.parentElement, "height", "100%");
        setImportant(tab.parentElement, "max-height", "none");
        setImportant(tab.parentElement, "min-width", "0");
        setImportant(tab, "flex", "1 1 50%");
        setImportant(tab, "align-self", "stretch");
        setImportant(tab, "height", "100%");
        setImportant(tab, "min-height", "100%");
        setImportant(tab, "min-width", "0");
      }

      if (isPlayerTab) {
        const clanCounters = Array.from(tab.querySelectorAll("span"))
          .filter(span => !wrapper.contains(span) && clanCounterPattern.test(span.textContent.trim()));
        if (clanCounters.length) {
          tab.classList.add("fx-lobby-chat-player-tab");
          if (wrapper.parentElement !== tab) tab.appendChild(wrapper);
          setImportant(tab, "display", "flex");
          setImportant(tab, "flex-direction", "column");
          setImportant(tab, "flex-wrap", "nowrap");
          setImportant(tab, "align-content", "center");
          setImportant(tab, "align-items", "stretch");
          setImportant(tab, "justify-content", "center");
          setImportant(tab, "row-gap", ".1em");
          setImportant(tab, "flex", "1 1 50%");
          setImportant(tab, "align-self", "stretch");
          setImportant(tab, "width", "50%");
          setImportant(wrapper, "position", "static");
          setImportant(wrapper, "display", "inline-flex");
          setImportant(wrapper, "justify-content", "center");
          setImportant(wrapper, "align-self", "center");
          setImportant(wrapper, "flex", "0 0 auto");
          setImportant(wrapper, "width", "100%");
          setImportant(wrapper, "min-width", "0");
          setImportant(wrapper, "box-sizing", "border-box");

          let counterRow = tab.querySelector(":scope > .fx-lobby-clan-counts");
          if (!counterRow) {
            counterRow = document.createElement("div");
            counterRow.className = "fx-lobby-clan-counts";
            tab.appendChild(counterRow);
          }
          setImportant(counterRow, "display", "flex");
          setImportant(counterRow, "flex-wrap", "wrap");
          setImportant(counterRow, "align-items", "center");
          setImportant(counterRow, "justify-content", "center");
          setImportant(counterRow, "gap", ".1em .5em");
          setImportant(counterRow, "position", "static");
          setImportant(counterRow, "flex", "0 0 auto");
          setImportant(counterRow, "width", "100%");
          setImportant(counterRow, "min-width", "0");
          setImportant(counterRow, "max-width", "100%");
          setImportant(counterRow, "box-sizing", "border-box");
          for (const counter of clanCounters) {
            for (const property of ["position", "top", "right", "bottom", "left"]) {
              setImportant(counter, property, property === "position" ? "static" : "auto");
            }
            setImportant(counter, "display", "inline-flex");
            setImportant(counter, "flex", "0 0 auto");
            setImportant(counter, "white-space", "nowrap");
            setImportant(counter, "line-height", "1");
            setImportant(counter, "margin", "0");
            if (counter.parentElement !== counterRow) counterRow.appendChild(counter);
          }
        }
      }
    }
  }

  function layoutLobbyModeTabs(root) {
    const styleId = "fx-lobby-mode-tab-grid-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .fx-lobby-mode-tabs-wrapper{display:flex!important;align-items:stretch!important;width:100%!important;height:auto!important;max-height:none!important;white-space:normal!important}
        .fx-lobby-mode-tab{display:inline-grid!important;flex:0 1 auto;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,.64em) minmax(0,1fr) minmax(0,.68em);grid-template-areas:"clock count" "title title" "map map";align-items:center;box-sizing:border-box;height:auto!important;min-height:2.42em!important;padding:0 .2em!important;overflow:hidden}
        .fx-lobby-mode-tab-title{grid-area:title;justify-self:center;align-self:center;box-sizing:border-box;max-width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.1;font-weight:600}
        .fx-lobby-mode-tab [data-fx-tab-meta="clock"]{grid-area:clock;justify-self:start;align-self:start}
        .fx-lobby-mode-tab [data-fx-tab-meta="count"]{grid-area:count;justify-self:end;align-self:start}
        .fx-lobby-mode-tab [data-fx-tab-meta="map"]{grid-area:map;justify-self:start;align-self:end}
      `;
      document.head.appendChild(style);
    }

    for (const button of root.querySelectorAll("button")) {
      const spans = Array.from(button.children).filter(child => child instanceof HTMLSpanElement);
      const hasClock = spans.some(span => span.dataset.fxTabMeta === "clock"
        || (span.style.position === "absolute" && span.style.top && span.style.left));
      const hasCount = spans.some(span => span.dataset.fxTabMeta === "count"
        || (span.style.position === "absolute" && span.style.top && span.style.right));
      if (!hasClock || !hasCount) continue;

      button.classList.add("fx-lobby-mode-tab");
      const setImportantStyle = (element, property, value) => {
        if (element.style.getPropertyValue(property) !== value
          || element.style.getPropertyPriority(property) !== "important") {
          element.style.setProperty(property, value, "important");
        }
      };
      const tabsWrapper = button.parentElement;
      if (tabsWrapper) {
        tabsWrapper.classList.add("fx-lobby-mode-tabs-wrapper");
        setImportantStyle(tabsWrapper, "display", "flex");
        setImportantStyle(tabsWrapper, "align-items", "stretch");
        setImportantStyle(tabsWrapper, "width", "100%");
        setImportantStyle(tabsWrapper, "height", "auto");
        setImportantStyle(tabsWrapper, "max-height", "none");
        setImportantStyle(tabsWrapper, "white-space", "normal");
        const tabsRow = tabsWrapper.parentElement;
        if (tabsRow) setImportantStyle(tabsRow, "height", "auto");
      }
      setImportantStyle(button, "height", "auto");
      const tabFontSize = `${Math.round(16 * fontScale())}px`;
      if (button.style.getPropertyValue("font-size") !== tabFontSize
        || button.style.getPropertyPriority("font-size") !== "important") {
        button.style.setProperty("font-size", tabFontSize, "important");
      }
      const titleText = Array.from(button.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      let title = button.querySelector(":scope > .fx-lobby-mode-tab-title");
      if (!title && titleText.length) {
        title = document.createElement("span");
        title.className = "fx-lobby-mode-tab-title";
        title.textContent = titleText.map(node => node.textContent.trim()).join(" ");
        titleText.forEach(node => node.remove());
        button.appendChild(title);
      } else if (title && titleText.length) {
        title.textContent = titleText.map(node => node.textContent.trim()).join(" ");
        titleText.forEach(node => node.remove());
      }

      for (const span of spans) {
        if (!span.dataset.fxTabMeta) {
          if (span.style.position !== "absolute") continue;
          const area = span.style.bottom ? "map" : span.style.left ? "clock" : "count";
          span.dataset.fxTabMeta = area;
          for (const property of ["position", "top", "right", "bottom", "left"]) {
            span.style.setProperty(property, property === "position" ? "static" : "auto", "important");
          }
        }
        // Refresh on every pass so tabs created before/after a scale change stay consistent.
        span.style.setProperty("font-size", `${Math.round(10 * fontScale())}px`, "important");
        span.style.setProperty("line-height", "1", "important");
        span.style.setProperty("white-space", "nowrap", "important");
        span.style.setProperty("max-width", "100%", "important");
        span.style.setProperty("overflow", "hidden", "important");
        span.style.setProperty("text-overflow", "ellipsis", "important");
        span.style.setProperty("pointer-events", "none", "important");
      }
    }
  }

  function syncLobbyProgressHeight(root) {
    const progress = root.children[5];
    if (!progress) return;
    const walker = document.createTreeWalker(progress, NodeFilter.SHOW_TEXT);
    let label = null;
    while (walker.nextNode()) {
      if (/\d+(?:[.,]\d+)?\s*%/.test(walker.currentNode.textContent)) {
        label = walker.currentNode.parentElement;
        break;
      }
    }
    if (!label) return;
    const style = getComputedStyle(label);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.parseFloat(style.lineHeight);
    if (!Number.isFinite(fontSize)) return;
    const height = Math.ceil((Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.2) + 2);
    progress.style.setProperty("height", `${height}px`, "important");
    progress.style.setProperty("min-height", `${height}px`, "important");
    progress.style.setProperty("max-height", `${height}px`, "important");
    progress.style.removeProperty("overflow");
    const tracks = getComputedStyle(root).gridTemplateRows.match(/(?:minmax\([^)]*\)|\d+(?:\.\d+)?px)/g);
    if (tracks?.length === 7) {
      tracks[5] = `${height}px`;
      root.style.setProperty("grid-template-rows", tracks.join(" "), "important");
    }
  }

  function spaceLobbyMapButtons(root) {
    const mapButtons = [
      ...root.children[2].querySelectorAll("button"),
      ...root.children[3].querySelectorAll("button"),
    ].filter(button => !button.querySelector("[data-fx-lobby-tab-icon='true']")
      && !button.classList.contains("fx-lobby-mode-tab"));
    const groups = new Map();
    for (const button of mapButtons) {
      const parent = button.parentElement;
      if (!parent) continue;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(button);
    }
    for (const [parent, buttons] of groups) {
      if (buttons.length !== 2) continue;
      const gap = "1.5em";
      parent.style.setProperty("display", "grid", "important");
      parent.style.setProperty("grid-template-columns", "repeat(2, minmax(0, 1fr))", "important");
      parent.style.setProperty("grid-auto-flow", "column", "important");
      parent.style.setProperty("column-gap", gap, "important");
      parent.style.setProperty("box-sizing", "border-box", "important");
      parent.style.setProperty("width", "100%", "important");
      parent.style.setProperty("max-width", "100%", "important");
      parent.style.setProperty("min-width", "0", "important");
      parent.style.setProperty("justify-self", "stretch", "important");
      parent.style.setProperty("align-self", "stretch", "important");
      for (const button of buttons) {
        button.style.setProperty("box-sizing", "border-box", "important");
        button.style.setProperty("display", "flex", "important");
        button.style.setProperty("align-items", "center", "important");
        button.style.setProperty("justify-content", "center", "important");
        button.style.setProperty("text-align", "center", "important");
        button.style.setProperty("width", "100%", "important");
        button.style.setProperty("height", "100%", "important");
        button.style.setProperty("align-self", "stretch", "important");
        button.style.setProperty("min-width", "0", "important");
        button.style.setProperty("flex", "none", "important");
      }
      buttons[0].style.setProperty("font-weight", "700", "important");
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
    list.style.gridAutoFlow = "row";
    list.style.gridAutoRows = "max-content";
    list.style.alignItems = "start";
    list.style.alignContent = "start";
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
    clanDashboard.style.cssText = "box-sizing:border-box;display:none;flex:1 1 100%;align-items:center;gap:.15em .5em;flex-wrap:wrap;min-width:0;margin:0 .25em;padding:.1em .15em;border:0;background:transparent;font-size:clamp(12px,.58em,36px);line-height:1.2;opacity:.9";
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
      const dashboardFontSize = `clamp(12px, ${0.58 * fontScale()}em, 36px)`;
      if (clanDashboard.style.fontSize !== dashboardFontSize) {
        clanDashboard.style.fontSize = dashboardFontSize;
      }
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
        const joinAction = document.createElement("button");
        joinAction.type = "button";
        joinAction.className = "fx-clan-join-action";
        joinAction.setAttribute("aria-label", `[${ownClan}] join`);
        joinAction.title = `@[${ownClan}] join`;
        joinAction.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 10v4h3l11 5V5L6 10H3zm4 4.1 2.2 5.4h3.2L11 15.1 7 14.1zM19 9.2a4 4 0 0 1 0 5.6l1.4 1.4a6 6 0 0 0 0-8.4L19 9.2z"/></svg><span>join</span>';
        joinAction.style.cssText = "display:inline-flex;align-items:center;justify-content:center;gap:.25em;padding:0 .45em;border:1px solid rgba(120,210,155,.4);border-radius:4px;background:rgba(25,95,65,.55);color:inherit;font:inherit;font-size:.95em;line-height:1.35;cursor:pointer;white-space:nowrap";
        joinAction.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const sendClanJoinMessage = window.__fx?.sendClanJoinMessage;
          if (typeof sendClanJoinMessage === "function") sendClanJoinMessage(ownClan);
        });
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
        clanDashboard.append(title, joinAction, summary);
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
        row.style.setProperty("position", "static", "important");
        for (const property of ["top", "right", "bottom", "left"]) {
          row.style.setProperty(property, "auto", "important");
        }
        row.style.setProperty("box-sizing", "border-box", "important");
        row.style.setProperty("width", "auto", "important");
        row.style.setProperty("min-width", "0", "important");
        row.style.setProperty("max-width", "100%", "important");
        row.style.setProperty("height", "auto", "important");
        row.style.setProperty("min-height", "1.2em", "important");
        row.style.setProperty("display", "flex", "important");
        row.style.setProperty("align-items", "center", "important");
        row.style.setProperty("line-height", "1.2", "important");
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
        const rosterFontSize = `${0.58 * fontScale()}em`;
        if (row.style.fontSize !== rosterFontSize) row.style.fontSize = rosterFontSize;
        const desiredDisplay = visible ? "flex" : "none";
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
        for (const counter of button.querySelectorAll("span")) {
          if (!/^[A-Z0-9_-]{1,12}:\s*\d+$/i.test(counter.textContent.trim())) continue;
          counter.style.setProperty("padding", ".12em .2em", "important");
        }
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
    playerCount.style.fontSize = `clamp(10px, ${0.34 * fontScale()}em, 36px)`;
    controls.append(clanDashboard, search, readyFilter, followedFilter, clanFilter, followedFirst, rankSort, resetFilters, playerCount);
    list.parentElement.insertBefore(controls, list);
    list.parentElement.style.setProperty("display", "flex", "important");
    list.parentElement.style.setProperty("flex-direction", "column", "important");
    list.parentElement.style.setProperty("flex", "1 1 auto", "important");
    list.parentElement.style.setProperty("min-height", "0", "important");
    list.parentElement.style.setProperty("height", "100%", "important");
    controls.style.flex = "0 0 auto";
    list.style.flex = "1 1 auto";
    list.style.minHeight = "0";
    list.style.overflowY = "auto";
    list.style.overflowX = "hidden";
    let lobbyRoot = list.parentElement;
    for (let depth = 0; lobbyRoot.parentElement && depth < 2; depth++) lobbyRoot = lobbyRoot.parentElement;
    decorateLobbyTabIcons(lobbyRoot);
    const thinLobbyBorders = () => {
      layoutLobbyModeTabs(lobbyRoot);
      spaceLobbyMapButtons(lobbyRoot);
      syncLobbyProgressHeight(lobbyRoot);
      const footer = lobbyRoot.children[6];
      if (footer) {
        const footerActions = new Set([
          ...footer.querySelectorAll("button, [role='button']"),
          ...Array.from(footer.querySelectorAll("*")).filter(element =>
            getComputedStyle(element).cursor === "pointer"),
        ]);
        for (const action of footerActions) {
          action.style.setProperty("padding-block", "0", "important");
        }
      }
      for (const element of [lobbyRoot, ...lobbyRoot.querySelectorAll("*")]) {
        const style = getComputedStyle(element);
        if (element.matches("h1") && element.textContent.trim() === "Lobby") {
          element.style.setProperty("display", "none", "important");
        }
        if (!element.classList.contains("fx-lobby-filter-action")
          && !element.classList.contains("fx-lobby-chat-player-tab")
          && !element.classList.contains("fx-lobby-mode-tab")
          && element.matches("button, [role='button'], h1, h2, h3")) {
          const baseSize = element.matches("h1, h2, h3") ? 0.72 : 0.56;
          const scaledSize = `clamp(12px, ${baseSize * fontScale()}em, 66px)`;
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
      const rows = Array.from(element.children).filter(isPlayerRow);
      // Small lobbies are valid too. Requiring eight rows skipped every lobby
      // enhancement (including thin borders) when fewer players were present.
      if (rows.length > 0) enhanceRoster(element);
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
