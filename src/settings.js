import { KeybindsInput } from "./keybindsInput.js";
import winCounter from "./winCounter.js";
import WindowManager from "./windowManager.js";
import versionData from '../version.json';
import { displayChangelog } from './changelog.js';
import replayHistory from './replayHistory.js'
import { LobbyReminderRulesInput } from './lobbyReminderRulesInput.js';
import { createCustomQuickEmojis } from "./settings/customQuickEmojis.js";
import { getGameEmojiTile } from "./gameInterface.js";
import { loadSettings, parseImportedSettings } from "./settingsStore.js";
import { MutePingSection } from "./settings/mutePingSection.js";
import { createReplayHistoryList } from "./settings/replayHistoryList.js";
import { createDefaultSettings, DISCONTINUED_SETTINGS, migrateSettings } from "./settingsSchema.js";

window.__fx = window.__fx || {};
const __fx = window.__fx;
const CustomQuickEmojis = createCustomQuickEmojis({
  getQuickEmojis: () => __fx.quickEmojis,
  getEmojiTile: getGameEmojiTile,
});
const eliminationEstimateText = (navigator.language || "en").toLowerCase().startsWith("de")
  ? {
      label: "Gesch\u00e4tzte Angriffsmenge f\u00fcr vollst\u00e4ndige Vernichtung anzeigen",
      note: "Grobe Sch\u00e4tzung: etwa das Doppelte der gegnerischen Resttruppen plus 2 Einheiten je verbleibendem Gebietspunkt. Der Prozentwert zeigt den Anteil deiner verf\u00fcgbaren Truppen; die Farbe wechselt ab dem einstellbaren Gr\u00fcnwert bis 100% zu Rot. Grenzverteidigung und weitere Frontkosten fehlen.",
    }
  : {
      label: "Show estimated attack size for complete annihilation of a player",
      note: "Rough estimate: about twice the enemy's remaining troops plus 2 units per remaining territory tile. The percentage shows the share of your available troops; the color shifts from the configurable green threshold to red at 100%. Border defense and other front costs are not included.",
    };

const fxText = {
  en: {
    enhancedLobbyLayout: "Enhanced lobby layout",
    enhancedLobbyLayoutNote: "Adds player search and readiness filters, a compact six-column roster, and a shorter lobby header.",
    showClanLobbyDashboard: "Clan lobby dashboard",
    showClanLobbyDashboardNote: "Shows your clan members in this lobby and their readiness. Requires a detectable clan tag.",
    clanReadySummary: "{ready}/{total} ready",
    clanWaitingSummary: "{count} waiting",
    clanReadyFilterAction: "Show ready players from your clan",
    clanWaitingFilterAction: "Show waiting players from your clan",
    replayMarkers: "Replay notes",
    removeReplayMarker: "Remove",
    addReplayNote: "Mark",
    loadSavedReplayForNotes: "Load a saved replay to add notes.",
    replayNotePrompt: "Add a note at",
    replayNoteLimitReached: "The note is empty, or this replay already has 100 notes.",
    readinessUnknown: "Unknown",
    unknownPlayer: "Unknown player",
    lobbyFontScale: "Lobby UI font size",
    lobbyFontScaleNote: "Adjusts the text size in the lobby. Save settings to apply.",
    searchLobbyPlayers: "Search lobby players...",
    filterReadiness: "Filter players by readiness",
    filterFollowed: "Filter followed players",
    filterClan: "Filter by clan",
    clanMembersOnly: "Clan members",
    myClanOnly: "My clan only",
    myClanUnavailable: "Your clan could not be detected",
    resetLobbyFilters: "Reset filters",
    followedFirst: "Followed first",
    rankBestFirst: "Rank: best first",
    rankWorstFirst: "Rank: worst first",
    rankUnavailable: "Rank data unavailable",
    showingPlayers: "Showing {shown} of {total}",
    allPlayers: "All players",
    followedOnly: "Followed only",
    ready: "Ready",
    notReady: "Not ready",
    worldTime: "World time",
    showWorldClock: "Show shared world time (UTC)",
    showSidebar: "Show FX Client sidebar",
    sidebarSettings: "FX Settings",
    sidebarHome: "Home",
    sidebarGeneralGroup: "General",
    sidebarAccountGroup: "Account",
    sidebarMultiplayer: "Multiplayer",
    sidebarLeaderboard: "Leaderboards",
    sidebarGameSettings: "Game settings",
    sidebarReplays: "Replays",
    sidebarGoldTransfer: "Gold transfer",
    sidebarLogs: "Logs",
    sidebarAccount: "My Account",
    sidebarLobbyLabel: "Lobby",
    sidebarLobbySummary: "{ready}/{total} ready",
    sidebarLobbySummaryClan: "{ready}/{total} ready · clan {clanReady}/{clanTotal}",
    sidebarJoinClanTitle: "Ask clan {clan} to join",
    sidebarModeExpanded: "Wide",
    sidebarModeCompact: "Compact",
    sidebarModeHidden: "Hide",
    sidebarShow: "Show sidebar",
    ownTerritory: "Own territory",
    highlightSelfTerritory: "Highlight my territory",
    selfTerritoryOutlineWidth: "Outline width",
    selfTerritoryGlow: "Glow strength",
    selfTerritoryHighlightNote: "Adds a high-contrast contour around your own territory on the map.",
  },
  de: {
    enhancedLobbyLayout: "Verbessertes Lobby-Layout",
    lobbyFontScale: "Schriftgr\u00f6\u00dfe der Lobby",
    lobbyFontScaleNote: "Passt die Textgr\u00f6\u00dfe in der Lobby an. Zum \u00dcbernehmen Einstellungen speichern.",
    enhancedLobbyLayoutNote: "Erg\u00e4nzt Spielersuche und Bereitschaftsfilter, eine kompakte Liste mit sechs Spalten und einen flacheren Lobby-Kopfbereich.",
    showClanLobbyDashboard: "Clan-Lobby-Dashboard",
    showClanLobbyDashboardNote: "Zeigt Clanmitglieder in dieser Lobby und ihren Bereitschaftsstatus. Ein erkennbarer Clan-Tag ist erforderlich.",
    clanReadySummary: "{ready}/{total} bereit",
    clanWaitingSummary: "{count} warten",
    clanReadyFilterAction: "Bereite Spieler aus deinem Clan anzeigen",
    clanWaitingFilterAction: "Wartende Spieler aus deinem Clan anzeigen",
    replayMarkers: "Replay-Notizen",
    removeReplayMarker: "Entfernen",
    addReplayNote: "Markieren",
    loadSavedReplayForNotes: "Lade ein gespeichertes Replay, um Notizen hinzuzuf\u00fcgen.",
    replayNotePrompt: "Notiz bei",
    replayNoteLimitReached: "Die Notiz ist leer oder dieses Replay hat bereits 100 Notizen.",
    readinessUnknown: "Unbekannt",
    unknownPlayer: "Unbekannter Spieler",
    searchLobbyPlayers: "Lobby-Spieler suchen...",
    filterReadiness: "Spieler nach Bereitschaft filtern",
    filterFollowed: "Gefolgte Spieler filtern",
    filterClan: "Nach Clan filtern",
    clanMembersOnly: "Spieler mit Clan",
    myClanOnly: "Nur mein Clan",
    myClanUnavailable: "Dein Clan konnte nicht erkannt werden",
    resetLobbyFilters: "Filter zur\u00fccksetzen",
    followedFirst: "Gefolgte zuerst",
    rankBestFirst: "Rang: beste zuerst",
    rankWorstFirst: "Rang: schlechteste zuerst",
    rankUnavailable: "Rangdaten nicht verfügbar",
    showingPlayers: "{shown} von {total} angezeigt",
    allPlayers: "Alle Spieler",
    followedOnly: "Nur gefolgte",
    ready: "Bereit",
    notReady: "Nicht bereit",
    worldTime: "Weltzeit",
    showWorldClock: "Gemeinsame Weltzeit (UTC) anzeigen",
    showSidebar: "FX-Client-Seitenleiste anzeigen",
    sidebarSettings: "FX-Einstellungen",
    sidebarHome: "Startseite",
    sidebarGeneralGroup: "Generelles",
    sidebarAccountGroup: "Account",
    sidebarMultiplayer: "Mehrspieler",
    sidebarLeaderboard: "Bestenliste",
    sidebarGameSettings: "Spieleinstellungen",
    sidebarReplays: "Wiederholungen",
    sidebarGoldTransfer: "Goldtransfer",
    sidebarLogs: "Protokolle",
    sidebarAccount: "Mein Konto",
    sidebarLobbyLabel: "Lobby",
    sidebarLobbySummary: "{ready}/{total} bereit",
    sidebarLobbySummaryClan: "{ready}/{total} bereit · Clan {clanReady}/{clanTotal}",
    sidebarJoinClanTitle: "Clan {clan} zum Beitritt auffordern",
    sidebarModeExpanded: "Breit",
    sidebarModeCompact: "Kompakt",
    sidebarModeHidden: "Ausblenden",
    sidebarShow: "Seitenleiste einblenden",
    ownTerritory: "Eigenes Gebiet",
    highlightSelfTerritory: "Eigenes Gebiet hervorheben",
    selfTerritoryOutlineWidth: "Konturbreite",
    selfTerritoryGlow: "Leuchtstärke",
    selfTerritoryHighlightNote: "Hebt dein eigenes Gebiet auf der Karte mit einer kontrastreichen Kontur hervor.",
  },
};
__fx.translateFX = key => fxText[(navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en"][key] ?? key;

var settings = createDefaultSettings();
__fx.settings = settings;
__fx.makeMainMenuTransparent = false;

async function clearCacheAndReload() {
  if (!confirm("Clear the cached client files and reload the page?")) return;
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
  window.location.reload();
}

// https://stackoverflow.com/a/34156339
function saveFile(content, fileName, contentType) {
  var a = document.createElement("a");
  var file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
function createButton(text, action) {
    const button = document.createElement("button");
    button.textContent = text;
    button.addEventListener("click", action);
    return button;
}

const ReplayHistoryList = createReplayHistoryList({
  history: replayHistory,
  closeSettings: () => WindowManager.closeWindow("settings"),
  saveFile,
  createButton,
  copyToClipboard: text => navigator.clipboard.writeText(text),
  showAlert: message => alert(message),
});

function StartingPercentageInput(container) {
  const label = document.createElement("label");
  label.className = "checkbox";
  label.append("Custom starting attack percentage ");
  const note = document.createElement("small");
  note.innerText = "Sets a fixed attack percentage for the troop bar at the start of every game.";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  const checkmark = document.createElement("span");
  checkmark.className = "checkmark";
  label.append(document.createElement("br"), note, checkbox, checkmark);
  container.append(label, document.createElement("br"));

  const inputRow = document.createElement("div");
  Object.assign(inputRow.style, { display: "none", transition: "none", animation: "none" });
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "100";
  input.step = "0.1";
  input.placeholder = "50";
  inputRow.append("Percentage (%): ", input);
  const spacer = document.createElement("br");
  container.append(inputRow, spacer);

  function updateVisibility() {
    inputRow.style.display = checkbox.checked ? "block" : "none";
    spacer.style.display = checkbox.checked ? "" : "none";
  }
  checkbox.addEventListener("change", () => {
    if (checkbox.checked && input.value.trim() === "") input.value = "50";
    updateVisibility();
  });

  this.save = function (targetSettings) {
    targetSettings.startingPercentageEnabled = checkbox.checked;
    targetSettings.startingPercentage = input.value.trim() === "" ? 50 : Number(input.value);
  };

  this.update = function (currentSettings) {
    checkbox.checked = !!currentSettings.startingPercentageEnabled;
    input.value = currentSettings.startingPercentage ?? 50;
    updateVisibility();
  };
}

function SectionHeader(text) {
  return function (container) {
    const title = document.createElement("h2");
    title.className = "settings-section-title";
    title.innerText = text;
    container.append(title);
  };
}

const settingsManager = new (function () {
  const settingsStructure = [
    SectionHeader("General"),
    {
      for: "useFullscreenMode",
      type: "checkbox",
      label: "Use fullscreen mode",
      note: "Note: fullscreen mode will trigger after you click anywhere on the page due to browser policy restrictions.",
    },
    {
      for: "showSidebar",
      type: "checkbox",
      label: __fx.translateFX("showSidebar"),
    },
    {
      for: "customBackgroundUrl",
      type: "textInput",
      label: "Custom main menu background:",
      placeholder: "Enter an image URL here",
      tooltip:
        "A custom image to be shown as the main menu background instead of the currently selected map.",
    },
    {
      for: "hidePropagandaPopup",
      type: "checkbox",
      label: "Hide propaganda popup"
    },
    //{ for: "hideAllLinks", type: "checkbox", label: "Hide Links option also hides app store links" },
    SectionHeader("In-game display"),
    {
      for: "displayWinCounter",
      type: "checkbox",
      label: "Display win counter",
      note: "The win counter tracks multiplayer solo wins (not in team games)",
    },
    {
      type: "button",
      text: "Reset win counter",
      action: winCounter.removeWins,
    },
    {
      for: "displayTickNumber",
      type: "checkbox",
      label: "Display tick number near the balance",
    },
    {
      for: "showWorldClock",
      type: "checkbox",
      label: __fx.translateFX("showWorldClock"),
    },
    {
      for: "hoveringTooltip",
      type: "checkbox",
      label: "Hovering tooltip",
      note: "Display map territory info constantly (on mouse hover) instead of only when right clicking on the map",
    },
    {
      for: "highlightClanSpawns",
      type: "checkbox",
      label: "Highlight clan spawnpoints",
      note: "Increases the spawnpoint glow size for members of your clan",
    },
    {
      for: "detailedTeamPercentage", type: "checkbox",
      label: "Detailed team pie chart percentage",
      note: "For example: this would show 25.82% instead of 26% on the pie chart in team games"
    },
    {
      for: "openDonationHistoryFromLb",
      type: "checkbox",
      label: "Open donation history from the leaderboard",
      note: "Changes whether or not clicking on a player's name in the in-game leaderboard in team games will open their donation history",
    },
    SectionHeader("Density"),
    {
      for: "showPlayerDensity",
      type: "checkbox",
      label: "Show player density",
    },
    {
      for: "coloredDensity",
      type: "checkbox",
      label: "Colored density",
      note: "Display the density with a color between red and green depending on the density value",
    },
    {
      for: "densityDisplayStyle",
      type: "selectMenu",
      label: "Density value display style:",
      tooltip: "Controls how the territorial density value should be rendered",
      options: [
        { value: "percentage", label: "Percentage" },
        {
          value: "absoluteQuotient",
          label: "Value from 0 to 150 (BetterTT style)",
        },
      ],
    },
    SectionHeader((navigator.language || "en").toLowerCase().startsWith("de")
      ? "Angriffssch\u00e4tzung"
      : "Attack estimate"),
    {
      for: "showEstimatedEliminationAttack",
      type: "checkbox",
      label: eliminationEstimateText.label,
      note: eliminationEstimateText.note,
    },
    {
      for: "estimatedAttackGreenThreshold",
      type: "rangeInput",
      label: (navigator.language || "en").toLowerCase().startsWith("de")
        ? "Gr\u00fcn ab Truppenanteil"
        : "Green at troop share",
      min: 5,
      max: 75,
      step: 1,
    },
    SectionHeader(__fx.translateFX("ownTerritory")),
    {
      for: "highlightSelfTerritory",
      type: "checkbox",
      label: __fx.translateFX("highlightSelfTerritory"),
      note: __fx.translateFX("selfTerritoryHighlightNote"),
    },
    {
      for: "selfTerritoryOutlineWidth",
      type: "rangeInput",
      label: __fx.translateFX("selfTerritoryOutlineWidth"),
      min: 1,
      max: 6,
      step: 0.5,
      unit: "px",
    },
    {
      for: "selfTerritoryGlow",
      type: "rangeInput",
      label: __fx.translateFX("selfTerritoryGlow"),
      min: 0,
      max: 12,
      step: 1,
      unit: "px",
    },
    SectionHeader("Names"),
    { for: "realisticNames", type: "checkbox", label: "Realistic Bot Names" },
    { for: "hideBotNames", type: "checkbox", label: "Hide bot names" },
    {
      for: "hideInappropriateNames",
      type: "checkbox",
      label: "Inappropriate name hider",
      note: "Replaces player names that contain common offensive or inappropriate words with \"Hidden Name\".",
    },
    SectionHeader("Controls"),
    KeybindsInput,
    {
      for: "keybindButtons", type: "checkbox",
      label: "Keybind buttons", note: "Show keybind buttons above the troop selector (max 6)"
    },
    StartingPercentageInput,
    CustomQuickEmojis,
    SectionHeader("Lobby"),
    {
      for: "enhancedLobbyLayout",
      type: "checkbox",
      label: __fx.translateFX("enhancedLobbyLayout"),
      note: __fx.translateFX("enhancedLobbyLayoutNote"),
    },
    {
      for: "showClanLobbyDashboard",
      type: "checkbox",
      label: __fx.translateFX("showClanLobbyDashboard"),
      note: __fx.translateFX("showClanLobbyDashboardNote"),
    },
    {
      for: "lobbyFontScale",
      type: "rangeInput",
      label: __fx.translateFX("lobbyFontScale"),
      note: __fx.translateFX("lobbyFontScaleNote"),
      min: 75,
      max: 125,
      step: 5,
    },
    {
      for: "highlightDuplicateIps",
      type: "checkbox",
      label: "Duplicate IP highlighting",
      note: "Highlights players in the lobby's team list who share the same IP hash (the same one shown when hovering over a player's name). Each group of matching IPs gets its own color, so distinct duplicates are easy to tell apart at a glance.",
    },
    {
      for: "highlightSameClan",
      type: "checkbox",
      label: "Same clan highlighting",
      note: "Highlights you and every player in the lobby's team list who has the same clan tag as you in red. When duplicate IP highlighting is also on players matching both get a red outline around their IP color.",
    },
    LobbyReminderRulesInput,
    MutePingSection,
    SectionHeader("Replays"),
    {
      for: "showReplayTimebar",
      type: "checkbox",
      label: "Replay timebar",
      note: "Show a seek bar when watching replays, allowing you to skip to any point of the replay. Seeking backward re-simulates the replay from the start, which can take a few seconds.",
    },
    ReplayHistoryList,
    SectionHeader("About"),
    function Footer(container) {
      const versionInfo = document.createElement("p");
      versionInfo.innerText = `FX Client v${versionData.version}`;
      const links = document.createElement("p");
      links.innerHTML = `<a href="https://discord.gg/Hzqm6NSRp" target="_blank">Zulus FXClient Discord</a> |
        <a href="https://github.com/jamenai/FXclient#readme">Github repository</a>`;
      const changelogButton = document.createElement("button");
      changelogButton.innerText = "Changelog";
      changelogButton.addEventListener("click", displayChangelog);
      const clearCacheButton = document.createElement("button");
      clearCacheButton.innerText = "Clear cache";
      clearCacheButton.addEventListener("click", clearCacheAndReload);
      container.append(versionInfo, links, changelogButton, " ", clearCacheButton);
    }
  ];
  const settingsContainer = document.querySelector(".settings .scrollable");
  var inputFields = {}; // (includes select menus)
  var checkboxFields = {};
  var rangeOutputs = {};
  var customElements = [];
  settingsStructure.forEach((item) => {
    if (typeof item === "function") {
      const container = document.createElement("div");
      customElements.push(new item(container));
      return settingsContainer.append(container);
    }
    const label = document.createElement("label");
    if (item.tooltip) label.title = item.tooltip;
    const isValueInput = item.type.endsWith("Input");
    const element = document.createElement(
      isValueInput || item.type === "checkbox"
        ? "input"
        : item.type === "selectMenu"
        ? "select"
        : "button"
    );
    if (item.type === "textInput") element.type = "text";
    if (item.type === "rangeInput") {
      element.type = "range";
      element.min = item.min;
      element.max = item.max;
      element.step = item.step;
      element.style.width = "min(100%, 320px)";
    }
    if (item.placeholder) element.placeholder = item.placeholder;
    if (isValueInput || item.type === "selectMenu")
      inputFields[item.for] = element;
    if (item.text) element.innerText = item.text;
    if (item.action) element.addEventListener("click", item.action);
    if (item.label) label.append(item.label + " ");
    if (item.note) {
      const note = document.createElement("small");
      note.innerText = item.note;
      label.append(document.createElement("br"), note);
    }
    if (item.options)
      item.options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.setAttribute("value", option.value);
        optionElement.innerText = option.label;
        element.append(optionElement);
      });
    label.append(element);
    if (item.type === "rangeInput") {
      const output = document.createElement("output");
      const unit = item.unit ?? "%";
      output.dataset.unit = unit;
      output.value = element.value + unit;
      element.addEventListener("input", () => { output.value = element.value + unit; });
      rangeOutputs[item.for] = output;
      label.append(" ", output);
    }
    if (item.type === "checkbox") {
      element.type = "checkbox";
      const checkmark = document.createElement("span");
      checkmark.className = "checkmark";
      label.className = "checkbox";
      label.append(checkmark);
      checkboxFields[item.for] = element;
    } else label.append(document.createElement("br"));
    settingsContainer.append(label, document.createElement("br"));
  });
  this.save = function () {
    Object.keys(inputFields).forEach(function (key) {
      settings[key] = inputFields[key].type === "range"
        ? Number(inputFields[key].value)
        : inputFields[key].value.trim();
    });
    Object.keys(checkboxFields).forEach(function (key) {
      settings[key] = checkboxFields[key].checked;
    });
    customElements.forEach((element) => element.save?.(settings));
    this.applySettings();
    WindowManager.closeWindow("settings");
    DISCONTINUED_SETTINGS.forEach((settingName) => delete settings[settingName]);
    localStorage.setItem("fx_settings", JSON.stringify(settings));
    window.location.reload();
  };

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  function handleFileSelect(event) {
    const input = event.target;
    /** @type {File} */
    const selectedFile = input.files[0];
    if (!selectedFile) return;

    input.removeEventListener("change", handleFileSelect);
    input.value = "";
    if (!selectedFile.name.endsWith(".json"))
      return alert("Invalid file format");
    const fileReader = new FileReader();
    fileReader.onload = function () {
      let result;
      try {
        result = parseImportedSettings(fileReader.result, createDefaultSettings());
        if (
          confirm(
            'Warning: This will override all current settings, click "OK" to confirm'
          )
        )
          migrateSettings(result);
          __fx.settings = settings = result;
        localStorage.setItem("fx_settings", JSON.stringify(settings));
        window.location.reload();
      } catch (error) {
        alert("Error\n" + error);
      }
    };
    fileReader.readAsText(selectedFile);
  }
  this.importFromFile = function () {
    fileInput.click();
    fileInput.addEventListener("change", handleFileSelect);
  };
  this.exportToFile = function () {
    saveFile(
      JSON.stringify(settings),
      "FX_client_settings.json",
      "application/json"
    );
  };

  this.syncFields = function () {
    Object.keys(inputFields).forEach(function (key) {
      inputFields[key].value = settings[key];
      if (rangeOutputs[key]) rangeOutputs[key].value = inputFields[key].value + rangeOutputs[key].dataset.unit;
    });
    Object.keys(checkboxFields).forEach(function (key) {
      checkboxFields[key].checked = settings[key];
    });
    customElements.forEach((element) => element.update?.(settings));
  };
  this.resetAll = function () {
    if (
      !confirm(
        "Are you Really SURE you want to RESET ALL SETTINGS back to the default?"
      )
    )
      return;
    localStorage.removeItem("fx_settings");
    window.location.reload();
  };
  this.applySettings = function () {
    document.documentElement.style.setProperty(
      "--fx-lobby-font-scale",
      String(Math.max(0.75, Math.min(1.25, Number(settings.lobbyFontScale ?? 100) / 100)))
    );
    if (settings.customBackgroundUrl !== "") {
      document.body.style.backgroundImage =
        "url(" + settings.customBackgroundUrl + ")";
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    }
    __fx.makeMainMenuTransparent = settings.customBackgroundUrl !== "";
  };

  if (settings.useFullscreenMode) tryEnterFullscreen();
})();

export function tryEnterFullscreen() {
  if (document.fullscreenElement !== null || !document.fullscreenEnabled) return
  document.documentElement
    .requestFullscreen({ navigationUI: "hide" })
    .then(() => console.log("Fullscreen mode activated"))
    .catch((error) => console.warn("Could not enter fullscreen mode:", error))
}

const openCustomBackgroundFilePicker = () => {
  const fileInput = document.getElementById("customBackgroundFileInput");
  fileInput.click();
  fileInput.addEventListener("change", handleFileSelect);
};
function handleFileSelect(event) {
  const fileInput = event.target;
  const selectedFile = fileInput.files[0];
  console.log(fileInput.files);
  console.log(fileInput.files[0]);
  if (selectedFile) {
    const fileUrl = URL.createObjectURL(selectedFile);
    console.log("File URL:", fileUrl);
    fileInput.value = "";
    fileInput.removeEventListener("change", handleFileSelect);
  }
}

WindowManager.add({
  name: "settings",
  element: document.querySelector(".settings"),
  beforeOpen: function () {
    settingsManager.syncFields();
  },
});

__fx.settings = settings = loadSettings(localStorage.getItem("fx_settings"), createDefaultSettings());

if (migrateSettings(settings)) {
  localStorage.setItem("fx_settings", JSON.stringify(settings));
}

settingsManager.applySettings();

export default settingsManager;
export function getSettings() {
  return settings;
}
export function saveSettings() {
  localStorage.setItem("fx_settings", JSON.stringify(settings));
}
