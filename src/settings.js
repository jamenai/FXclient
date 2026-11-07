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
// Settings follow the language selected in the game. If the game has not exposed
// its setting yet, use English instead of silently inheriting the browser locale.
const settingsLanguage = () => String(__fx.getGameLanguage?.() || "en").toLowerCase();
const settingsTextDe = {
  Notifications: "Benachrichtigungen",
  "In-game": "Im Spiel", Interface: "Benutzeroberfläche",
  Popups: "Pop-ups",
  General: "Allgemein", "In-game display": "Spielanzeige", Density: "Dichte", "Attack estimate": "Angriffsschätzung",
  "Own territory": "Eigenes Gebiet", Names: "Namen", Controls: "Steuerung", Home: "Startseite", Lobby: "Lobby", Replays: "Wiederholungen", About: "Über",
  "Use fullscreen mode": "Vollbildmodus verwenden",
  "Note: fullscreen mode will trigger after you click anywhere on the page due to browser policy restrictions.": "Hinweis: Der Vollbildmodus wird nach einem Klick auf die Seite aktiviert, da der Browser dies erfordert.",
  "Custom main menu background:": "Eigenes Hintergrundbild für das Hauptmenü:", "Enter an image URL here": "Bild-URL eingeben",
  "A custom image to be shown on the main menu instead of the currently selected map.": "Dieses Bild wird im Hauptmenü anstelle der ausgewählten Karte angezeigt.",
  "Hide propaganda popup": "Propaganda-Popup ausblenden",
  "Display win counter": "Siegzähler anzeigen", "The win counter tracks multiplayer solo wins (not in team games)": "Der Siegzähler erfasst Solo-Siege im Mehrspielermodus, keine Teamsiege.",
  "Reset win counter": "Siegzähler zurücksetzen", "Display tick number near the balance": "Tick-Nummer neben dem Kontostand anzeigen",
  "Show Unicode country flags on the map": "Unicode-Länderflaggen auf der Karte anzeigen",
  "Replaces recognized Unicode flags in player names above their territory with flag images.": "Ersetzt erkannte Unicode-Flaggen in Spielernamen über ihrem Gebiet durch Flaggenbilder.",
  "Hovering tooltip": "Tooltip beim Darüberfahren", "Display map territory info constantly (on mouse hover) instead of only when right clicking on the map": "Gebietsinformationen beim Darüberfahren mit der Maus anzeigen, statt nur per Rechtsklick.",
  "Highlight clan spawnpoints": "Clan-Spawnpunkte hervorheben", "Increases the spawnpoint glow size for members of your clan": "Vergrößert das Leuchten der Spawnpunkte für Mitglieder deines Clans.",
  "Detailed team pie chart percentage": "Prozentwerte im Team-Kreisdiagramm genauer anzeigen",
  "For example: this would show 25.82% instead of 26% on the pie chart in team games": "Zeigt im Team-Kreisdiagramm zum Beispiel 25,82 % statt 26 % an.",
  "Open donation history from the leaderboard": "Spendenverlauf über die Rangliste öffnen",
  "Changes whether or not clicking on a player's name in the in-game leaderboard in team games will open their donation history": "Legt fest, ob ein Klick auf einen Spielernamen in der Rangliste eines Teamspiels den Spendenverlauf öffnet.",
  "Show player density": "Spielerdichte anzeigen", "Colored density": "Dichte farbig anzeigen",
  "Display the density with a color between red and green depending on the density value": "Färbt die Dichte abhängig vom Wert zwischen Rot und Grün.",
  "Density value display style:": "Darstellung des Dichtewerts:", "Controls how the territorial density value should be rendered": "Legt fest, wie der Gebietsdichtewert dargestellt wird.",
  Percentage: "Prozent", "Value from 0 to 150 (BetterTT style)": "Wert von 0 bis 150 (BetterTT-Stil)",
  "Realistic Bot Names": "Realistische Bot-Namen", "Hide bot names": "Bot-Namen ausblenden",
  "Inappropriate name hider": "Unpassende Namen ausblenden", "Hidden Name": "Verborgener Name",
  "Replaces player names that contain common offensive or inappropriate words with \"Hidden Name\".": "Ersetzt Spielernamen mit häufigen beleidigenden oder unpassenden Begriffen durch „Verborgener Name“.",
  "Keybind buttons": "Tastenkürzel-Schaltflächen", "Show keybind buttons above the troop selector (max 6)": "Zeigt bis zu sechs Tastenkürzel oberhalb der Truppenauswahl.",
  "Duplicate IP highlighting": "Doppelte IP-Adressen hervorheben",
  "Highlights players in the lobby's team list who share the same IP hash (the same one shown when hovering over a player's name). Each group of matching IPs gets its own color, so distinct duplicates are easy to tell apart at a glance.": "Hebt Spieler mit derselben IP-Kennung in der Lobby-Spielerliste hervor. Jede Gruppe erhält eine eigene Farbe.",
  "Same clan highlighting": "Eigenen Clan hervorheben",
  "Highlights you and every player in the lobby's team list who has the same clan tag as you in red. When duplicate IP highlighting is also on players matching both get a red outline around their IP color.": "Hebt dich und Spieler mit demselben Clan-Tag rot hervor. Bei aktivierter IP-Hervorhebung erhalten Spieler mit beiden Treffern zusätzlich eine rote Kontur.",
  "Replay timebar": "Replay-Zeitleiste", "Show a seek bar when watching replays, allowing you to skip to any point of the replay. Seeking backward re-simulates the replay from the start, which can take a few seconds.": "Zeigt beim Abspielen eine Zeitleiste zum Springen an. Rückwärts zu springen simuliert das Replay vom Anfang an neu und kann kurz dauern.",
  "ZFX Client Discord": "ZFX-Client-Discord", "Github repository": "GitHub-Repository", Changelog: "Änderungsprotokoll", "Clear cache": "Cache leeren",
  "A custom image to be shown on the main menu as the background instead of the currently selected map.": "Dieses Bild wird im Hauptmenü als Hintergrund anstelle der ausgewählten Karte angezeigt.",
  "Realistic Bot Names": "Realistische Bot-Namen", "Hide bot names": "Bot-Namen ausblenden",
  "Duplicate IP highlighting": "Doppelte IP-Adressen hervorheben", "Same clan highlighting": "Eigenen Clan hervorheben",
  "Replay timebar": "Replay-Zeitleiste",
  "Show a seek bar when watching replays, allowing you to skip to any point of the replay. Seeking backward re-simulates the replay from the start, which can take a few seconds.": "Zeigt beim Abspielen eine Zeitleiste zum Springen an. Rückwärts zu springen simuliert das Replay vom Anfang an neu und kann kurz dauern.",
  "Show keybind buttons above the troop selector (max 6)": "Zeigt bis zu sechs Tastenkürzel oberhalb der Truppenauswahl.",
  "Custom starting attack percentage": "Benutzerdefinierter Start-Angriffsprozentsatz",
  "Use custom quick emojis": "Eigene Schnell-Emojis verwenden",
  "Choose the 9 emojis shown in the in-game quick-emoji bar, in order, instead of them being picked automatically based on usage. Click \"Save Settings\" below to apply.": "Wähle die neun Emojis für die Schnell-Emoji-Leiste im Spiel. Sie werden dann nicht mehr automatisch nach Verwendung ausgewählt. Klicke unten auf \u201eEinstellungen speichern\u201c, um die Änderung anzuwenden.",
  "Reminder rules": "Erinnerungsregeln", "You'll get a notification in lobby whenever a game matching one of these rules is about to start.": "Du erhältst eine Lobby-Benachrichtigung, wenn ein Spiel startet, das einer dieser Regeln entspricht.",
  Game: "Spiel", Map: "Karte", Contest: "Wettkampf", Add: "Hinzufügen", Delete: "Löschen", "No reminder rules added": "Keine Erinnerungsregeln hinzugefügt",
  None: "Keines", Any: "Beliebig", "All Teams": "Alle Teams", Yes: "Ja", No: "Nein",
  "Muted lobby pings": "Lobby-Erwähnungen stummschalten", "Mute all pings": "Alle Erwähnungen stummschalten",
  "Mute @all, @everyone and @0ya pings": "@all-, @everyone- und @0ya-Erwähnungen stummschalten",
  "Mute @room1 - @room4 pings": "@room1- bis @room4-Erwähnungen stummschalten",
  "Mute clan pings (@[TAG])": "Clan-Erwähnungen (@[TAG]) stummschalten", "Mute language pings (@en, @de, ...)": "Sprach-Erwähnungen (@en, @de, ...) stummschalten",
  "Mute pings of your username": "Erwähnungen deines Spielernamens stummschalten",
  "Saved Replays": "Gespeicherte Replays", "(auto-saves your last 5 games)": "(speichert automatisch deine letzten 5 Spiele)",
  "No replays saved yet. Finish a game and it'll show up here.": "Noch keine Replays gespeichert. Beende ein Spiel, damit es hier erscheint.",
  "just now": "gerade eben", Load: "Laden", Copy: "Kopieren", "Copied!": "Kopiert!", Download: "Herunterladen", "Failed to copy": "Kopieren fehlgeschlagen",
  "Clear the cached client files and reload the page?": "Zwischengespeicherte Client-Dateien löschen und die Seite neu laden?",
  "Custom starting attack percentage ": "Benutzerdefinierter Start-Angriffsprozentsatz ",
  "Sets a fixed attack percentage for the troop bar at the start of every game.": "Legt den Angriffsprozentsatz der Truppenleiste zu Beginn jedes Spiels fest.",
  "Percentage (%): ": "Prozentsatz (%): ",
  "Invalid file format": "Ungültiges Dateiformat",
  Error: "Fehler",
  "Warning: This will override all current settings, click \"OK\" to confirm": "Achtung: Dadurch werden alle aktuellen Einstellungen überschrieben. Klicke zur Bestätigung auf \u201eOK\u201c.",
  "Are you Really SURE you want to RESET ALL SETTINGS back to the default?": "Möchtest du wirklich ALLE EINSTELLUNGEN auf die Standardwerte zurücksetzen?",
  "Show estimated attack size for complete annihilation of a player": "Geschätzte Angriffsmenge für die vollständige Vernichtung eines Spielers anzeigen",
  "Rough estimate: a configurable multiplier applied to the enemy's remaining troops, plus 2 units per remaining territory tile. The percentage shows the share of your available troops; the color shifts from the configurable green threshold to red at 100%. Border defense and other front costs are not included.": "Grobe Schätzung: ein einstellbarer Faktor auf die gegnerischen Resttruppen plus 2 Einheiten je verbleibendem Gebietspunkt. Der Prozentwert zeigt den Anteil deiner verfügbaren Truppen; die Farbe wechselt ab dem einstellbaren Grünwert bis 100 % zu Rot. Grenzverteidigung und weitere Frontkosten fehlen.",
  "Enemy remaining troops multiplier": "Faktor für gegnerische Resttruppen", "Green at troop share": "Grün ab Truppenanteil",
};
const localizeSettingsText = value => {
  if (typeof value !== "string") return value;
  const isGerman = settingsLanguage().startsWith("de");
  if (isGerman) {
    if (settingsTextDe[value]) return settingsTextDe[value];
    const fxKey = Object.keys(fxText.en).find(key => fxText.en[key] === value && fxText.de[key]);
    return fxKey ? fxText.de[fxKey] : value;
  }
  const germanEntry = Object.entries(settingsTextDe).find(([, translated]) => translated === value);
  if (germanEntry) return germanEntry[0];
  const fxKey = Object.keys(fxText.de).find(key => fxText.de[key] === value && fxText.en[key]);
  return fxKey ? fxText.en[fxKey] : value;
};
const settingsTextBindings = [];
const bindSettingsText = (value, setter) => {
  settingsTextBindings.push(() => setter(localizeSettingsText(value)));
  setter(localizeSettingsText(value));
};
const eliminationEstimateText = {
  label: "Show estimated attack size for complete annihilation of a player",
  note: "Rough estimate: a configurable multiplier applied to the enemy's remaining troops, plus 2 units per remaining territory tile. The percentage shows the share of your available troops; the color shifts from the configurable green threshold to red at 100%. Border defense and other front costs are not included.",
};

const fxText = {
  en: {
    settingStartingAttack: "Custom starting attack percentage",
    settingStartingAttackNote: "Sets a fixed attack percentage for the troop bar at the start of every game.",
    settingPercentage: "Percentage (%)",
    settingQuickEmojis: "Use custom quick emojis",
    settingQuickEmojisNote: "Choose the 9 emojis shown in the in-game quick-emoji bar, in order, instead of them being picked automatically based on usage. Click \"Save Settings\" below to apply.",
    settingReminderRules: "Reminder rules",
    settingReminderRulesNote: "You'll get a notification in lobby whenever a game matching one of these rules is about to start.",
    settingReminderGame: "Game", settingReminderMap: "Map", settingReminderContest: "Contest",
    settingAdd: "Add", settingDelete: "Delete", settingNoReminderRules: "No reminder rules added",
    settingNone: "None", settingAny: "Any", settingAllTeams: "All Teams", settingYes: "Yes", settingNo: "No",
    settingMutedPings: "Muted lobby pings", settingMuteAllPings: "Mute all pings",
    settingMuteEveryone: "Mute @all, @everyone and @0ya pings", settingMuteRooms: "Mute @room1 - @room4 pings",
    settingMuteClan: "Mute clan pings (@[TAG])", settingMuteLanguage: "Mute language pings (@en, @de, ...)",
    settingMuteUsername: "Mute pings of your username",
    settingSavedReplays: "Saved Replays (auto-saves your last 5 games)",
    settingNoSavedReplays: "No replays saved yet. Finish a game and it'll show up here.",
    settingJustNow: "just now", settingLoad: "Load", settingCopy: "Copy", settingCopied: "Copied!",
    settingDownload: "Download", settingFailedCopy: "Failed to copy",
    settingMinutesAgo: "{count}m ago", settingHoursAgo: "{count}h ago", settingDaysAgo: "{count}d ago",
    settingAttackKeybinds: "Attack Percentage Keybinds", settingNoAttackKeybinds: "No custom attack percentage keybinds added",
    settingAbsolute: "Absolute", settingRelative: "Relative", settingNoKeySet: "No key set", settingPressAnyKey: "Press any key",
    enhancedLobbyLayout: "Enhanced lobby layout",
    enhancedLobbyLayoutNote: "Adds player search and readiness filters, a compact six-column roster, and a shorter lobby header.",
    customLobbyView: "Alternative lobby view",
    customLobbyViewNote: "Shows a separate FX lobby dashboard while keeping the game lobby as its live data and action source.",
    customHomeView: "New home screen",
    customHomeViewNote: "Replaces the game's home menu with the ZFX Client Vue home screen.",
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
    showSidebar: "Show ZFX Client sidebar",
    vueSidebar: "Use the new Vue sidebar",
    vueSidebarNote: "Use the redesigned sidebar interface throughout the game.",
    sidebarSettings: "ZFX Settings",
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
    sidebarEditPlayerName: "Change player name",
    sidebarAccountId: "Account ID",
    sidebarLobbyLabel: "Lobby",
    sidebarInGame: "In game",
    sidebarLobbySummary: "{ready}/{total} ready",
    sidebarLobbySummaryClan: "{ready}/{total} ready · clan {clanReady}/{clanTotal}",
    sidebarInGamePlayersSummary: "{humans} humans · clan {clan}",
    sidebarReadySkillMeta: "{tier} · median #{rank}",
    sidebarReadySkillTitle: "Estimated {tier} lobby rating {rating}/10 from {count} ready players; weights the median 40% and strongest-quarter average 60%, plus a capped bonus for each ready Top-500 player. Median global rank: #{rank}",
    sidebarReadySkillTop100Boost: "2 or more ready Top-100 players guarantee at least Gold",
    sidebarReadySkillTop10Boost: "2 or more ready Top-10 players guarantee at least Platinum",
    sidebarReadySkillSingleTop10Boost: "1 ready Top-10 player guarantees at least Silver",
    sidebarRankObsidian: "Obsidian",
    sidebarRankDiamond: "Diamond",
    sidebarRankPlatinum: "Platinum",
    sidebarRankGold: "Gold",
    sidebarRankSilver: "Silver",
    sidebarRankBronze: "Bronze",
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
    settingStartingAttack: "Benutzerdefinierter Start-Angriffsprozentsatz",
    settingStartingAttackNote: "Legt den Angriffsprozentsatz der Truppenleiste zu Beginn jedes Spiels fest.",
    settingPercentage: "Prozentsatz (%)",
    settingQuickEmojis: "Eigene Schnell-Emojis verwenden",
    settingQuickEmojisNote: "Wähle die neun Emojis für die Schnell-Emoji-Leiste im Spiel. Sie werden dann nicht mehr automatisch nach Verwendung ausgewählt. Klicke unten auf \u201eEinstellungen speichern\u201c, um die Änderung anzuwenden.",
    settingReminderRules: "Erinnerungsregeln",
    settingReminderRulesNote: "Du erhältst eine Lobby-Benachrichtigung, wenn ein Spiel startet, das einer dieser Regeln entspricht.",
    settingReminderGame: "Spiel", settingReminderMap: "Karte", settingReminderContest: "Wettkampf",
    settingAdd: "Hinzufügen", settingDelete: "Löschen", settingNoReminderRules: "Keine Erinnerungsregeln hinzugefügt",
    settingNone: "Keines", settingAny: "Beliebig", settingAllTeams: "Alle Teams", settingYes: "Ja", settingNo: "Nein",
    settingMutedPings: "Lobby-Erwähnungen stummschalten", settingMuteAllPings: "Alle Erwähnungen stummschalten",
    settingMuteEveryone: "@all-, @everyone- und @0ya-Erwähnungen stummschalten", settingMuteRooms: "@room1- bis @room4-Erwähnungen stummschalten",
    settingMuteClan: "Clan-Erwähnungen (@[TAG]) stummschalten", settingMuteLanguage: "Sprach-Erwähnungen (@en, @de, ...) stummschalten",
    settingMuteUsername: "Erwähnungen deines Spielernamens stummschalten",
    settingSavedReplays: "Gespeicherte Replays (speichert automatisch deine letzten 5 Spiele)",
    settingNoSavedReplays: "Noch keine Replays gespeichert. Beende ein Spiel, damit es hier erscheint.",
    settingJustNow: "gerade eben", settingLoad: "Laden", settingCopy: "Kopieren", settingCopied: "Kopiert!",
    settingDownload: "Herunterladen", settingFailedCopy: "Kopieren fehlgeschlagen",
    settingMinutesAgo: "vor {count} Min.", settingHoursAgo: "vor {count} Std.", settingDaysAgo: "vor {count} Tagen",
    settingAttackKeybinds: "Tastenkürzel für Angriffsprozente", settingNoAttackKeybinds: "Keine eigenen Tastenkürzel für Angriffsprozente hinzugefügt",
    settingAbsolute: "Absolut", settingRelative: "Relativ", settingNoKeySet: "Keine Taste festgelegt", settingPressAnyKey: "Beliebige Taste drücken",
    enhancedLobbyLayout: "Verbessertes Lobby-Layout",
    customLobbyView: "Alternative Lobby-Ansicht",
    customLobbyViewNote: "Zeigt ein separates FX-Lobby-Dashboard. Die Spiellobby bleibt im Hintergrund als Live-Daten- und Aktionsquelle.",
    customHomeView: "Neue Startseite",
    customHomeViewNote: "Ersetzt das Startmenü des Spiels durch die neue Vue-Startseite des ZFX Clients.",
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
    showSidebar: "ZFX-Client-Seitenleiste anzeigen",
    vueSidebar: "Neue Vue-Seitenleiste verwenden",
    vueSidebarNote: "Verwendet die neu gestaltete Seitenleiste im gesamten Spiel.",
    sidebarSettings: "ZFX-Einstellungen",
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
    sidebarEditPlayerName: "Spielernamen ändern",
    sidebarAccountId: "Account-ID",
    sidebarLobbyLabel: "Lobby",
    sidebarInGame: "Im Spiel",
    sidebarLobbySummary: "{ready}/{total} bereit",
    sidebarLobbySummaryClan: "{ready}/{total} bereit · Clan {clanReady}/{clanTotal}",
    sidebarInGamePlayersSummary: "{humans} Menschen · Clan {clan}",
    sidebarReadySkillMeta: "{tier} · Median #{rank}",
    sidebarReadySkillTitle: "Geschätztes Lobby-Rating {rating}/10 ({tier}) aus {count} bereiten Spielern; Median zählt 40%, Durchschnitt des stärksten Viertels 60%, dazu ein begrenzter Bonus pro bereitem Top-500-Spieler. Median-Weltrang: #{rank}",
    sidebarReadySkillTop100Boost: "Mindestens 2 bereite Top-100-Spieler garantieren mindestens Gold",
    sidebarReadySkillTop10Boost: "Mindestens 2 bereite Top-10-Spieler garantieren mindestens Platin",
    sidebarReadySkillSingleTop10Boost: "1 bereiter Top-10-Spieler garantiert mindestens Silber",
    sidebarRankObsidian: "Obsidian",
    sidebarRankDiamond: "Diamant",
    sidebarRankPlatinum: "Platin",
    sidebarRankGold: "Gold",
    sidebarRankSilver: "Silber",
    sidebarRankBronze: "Bronze",
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
__fx.translateFX = key => {
  const selectedLanguage = __fx.getGameLanguage?.() || "en";
  return fxText[selectedLanguage.toLowerCase().startsWith("de") ? "de" : "en"][key] ?? key;
};

var settings = createDefaultSettings();
__fx.settings = settings;
__fx.makeMainMenuTransparent = false;

async function clearCacheAndReload() {
  if (!confirm(localizeSettingsText("Clear the cached client files and reload the page?"))) return;
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
  closeSettings: () => {
    if (typeof __fx.closeVueSettings === "function") __fx.closeVueSettings();
    else WindowManager.closeWindow("settings");
  },
  saveFile,
  createButton,
  copyToClipboard: text => navigator.clipboard.writeText(text),
  showAlert: message => alert(message),
});

function StartingPercentageInput(container) {
  const label = document.createElement("label");
  label.className = "checkbox";
  const labelText = document.createTextNode("");
  label.append(labelText);
  const note = document.createElement("small");
  const updateLanguage = () => {
    labelText.nodeValue = __fx.translateFX("settingStartingAttack") + " ";
    note.innerText = __fx.translateFX("settingStartingAttackNote");
  };
  updateLanguage();
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
  const percentageLabel = document.createTextNode("");
  inputRow.append(percentageLabel, input);
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
    updateLanguage();
    percentageLabel.nodeValue = __fx.translateFX("settingPercentage") + ": ";
    checkbox.checked = !!currentSettings.startingPercentageEnabled;
    input.value = currentSettings.startingPercentage ?? 50;
    updateVisibility();
  };
}

function SectionHeader(text) {
  return function (container) {
    const title = document.createElement("h3");
    title.className = "settings-subsection-title";
    bindSettingsText(text, value => { title.innerText = value; });
    container.append(title);
  };
}

function CategoryHeader(text) {
  return function (container) {
    const title = document.createElement("h2");
    title.className = "settings-category-title";
    bindSettingsText(text, value => { title.innerText = value; });
    container.append(title);
  };
}

const settingsManager = new (function () {
  const settingsStructure = [
    CategoryHeader("General"),
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
      for: "vueSidebar",
      type: "checkbox",
      label: __fx.translateFX("vueSidebar"),
      note: __fx.translateFX("vueSidebarNote"),
    },
    {
      for: "customBackgroundUrl",
      type: "textInput",
      label: "Custom main menu background:",
      placeholder: "Enter an image URL here",
      tooltip:
        "A custom image to be shown as the main menu background instead of the currently selected map.",
    },
    //{ for: "hideAllLinks", type: "checkbox", label: "Hide Links option also hides app store links" },
    CategoryHeader("In-game"),
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
      for: "showCountryFlagsOnLand",
      type: "checkbox",
      label: settingsLanguage().startsWith("de")
        ? "Unicode-Länderflaggen auf der Karte anzeigen"
        : "Show Unicode country flags on the map",
      note: settingsLanguage().startsWith("de")
        ? "Ersetzt erkannte Unicode-Flaggen in Spielernamen auf dem Gebiet durch Flaggenbilder."
        : "Replaces recognized Unicode flags in player names above their territory with flag images.",
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
    SectionHeader("Attack estimate"),
    {
      for: "showEstimatedEliminationAttack",
      type: "checkbox",
      label: eliminationEstimateText.label,
      note: eliminationEstimateText.note,
    },
    {
      for: "estimatedAttackTroopMultiplier",
      type: "rangeInput",
      label: "Enemy remaining troops multiplier",
      min: 1,
      max: 4,
      step: 0.1,
      unit: "\u00d7",
    },
    {
      for: "estimatedAttackGreenThreshold",
      type: "rangeInput",
      label: "Green at troop share",
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
    CategoryHeader("Interface"),
    SectionHeader("Home"),
    {
      for: "customHomeView",
      type: "checkbox",
      label: __fx.translateFX("customHomeView"),
      note: __fx.translateFX("customHomeViewNote"),
    },
    SectionHeader("Lobby"),
    {
      for: "enhancedLobbyLayout",
      type: "checkbox",
      label: __fx.translateFX("enhancedLobbyLayout"),
      note: __fx.translateFX("enhancedLobbyLayoutNote"),
    },
    {
      for: "customLobbyView",
      type: "checkbox",
      label: __fx.translateFX("customLobbyView"),
      note: __fx.translateFX("customLobbyViewNote"),
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
      max: 300,
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
    CategoryHeader("Notifications"),
    SectionHeader("Popups"),
    {
      for: "hidePropagandaPopup",
      type: "checkbox",
      label: "Hide propaganda popup"
    },
    LobbyReminderRulesInput,
    MutePingSection,
    CategoryHeader("Replays"),
    SectionHeader("Playback"),
    {
      for: "showReplayTimebar",
      type: "checkbox",
      label: "Replay timebar",
      note: "Show a seek bar when watching replays, allowing you to skip to any point of the replay. Seeking backward re-simulates the replay from the start, which can take a few seconds.",
    },
    ReplayHistoryList,
    CategoryHeader("About"),
    function Footer(container) {
      const versionInfo = document.createElement("p");
      versionInfo.innerText = `ZFX Client v${versionData.version}`;
      const links = document.createElement("p");
      links.innerHTML = `<a href="https://discord.gg/Hzqm6NSRp" target="_blank">ZFX Client Discord</a> |
        <a href="https://github.com/jamenai/FXclient#readme">Github repository</a>`;
      bindSettingsText("ZFX Client Discord", value => { links.querySelector("a")?.replaceChildren(value); });
      bindSettingsText("Github repository", value => { links.querySelectorAll("a")[1]?.replaceChildren(value); });
      const changelogButton = document.createElement("button");
      bindSettingsText("Changelog", value => { changelogButton.innerText = value; });
      changelogButton.addEventListener("click", displayChangelog);
      const clearCacheButton = document.createElement("button");
      bindSettingsText("Clear cache", value => { clearCacheButton.innerText = value; });
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
    if (item.tooltip) bindSettingsText(item.tooltip, value => { label.title = value; });
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
    if (item.placeholder) bindSettingsText(item.placeholder, value => { element.placeholder = value; });
    if (isValueInput || item.type === "selectMenu")
      inputFields[item.for] = element;
    if (item.text) bindSettingsText(item.text, value => { element.innerText = value; });
    if (item.action) element.addEventListener("click", item.action);
    if (item.label) {
      const labelText = document.createTextNode("");
      bindSettingsText(item.label, value => { labelText.nodeValue = value + " "; });
      label.append(labelText);
    }
    if (item.note) {
      const note = document.createElement("small");
      bindSettingsText(item.note, value => { note.innerText = value; });
      label.append(document.createElement("br"), note);
    }
    if (item.options)
      item.options.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.setAttribute("value", option.value);
        bindSettingsText(option.label, value => { optionElement.innerText = value; });
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
      return alert(localizeSettingsText("Invalid file format"));
    const fileReader = new FileReader();
    fileReader.onload = function () {
      let result;
      try {
        result = parseImportedSettings(fileReader.result, createDefaultSettings());
        if (
          confirm(
            localizeSettingsText('Warning: This will override all current settings, click "OK" to confirm')
          )
        )
          migrateSettings(result);
          __fx.settings = settings = result;
        localStorage.setItem("fx_settings", JSON.stringify(settings));
        window.location.reload();
      } catch (error) {
        alert(localizeSettingsText("Error") + "\n" + error);
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
  this.refreshTranslations = function () {
    settingsTextBindings.forEach(update => update());
  };
  this.resetAll = function () {
    if (
      !confirm(
        localizeSettingsText("Are you Really SURE you want to RESET ALL SETTINGS back to the default?")
      )
    )
      return;
    localStorage.removeItem("fx_settings");
    window.location.reload();
  };
  this.applySettings = function () {
    document.documentElement.style.setProperty(
      "--fx-lobby-font-scale",
      String(Math.max(0.75, Math.min(3, Number(settings.lobbyFontScale ?? 100) / 100)))
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
