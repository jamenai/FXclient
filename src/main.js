import versionData from '../version.json';
const { version, lastUpdated, isSignificant } = versionData;

import settingsManager from './settings.js';
import { initializeLobbyEnhancements } from "./lobbyEnhancements.js";
import { initializeCustomLobbyView } from "./customLobbyView.js";
import { clanFilter, leaderboardFilter } from "./clanFilters.js";
import WindowManager from "./windowManager.js";
import donationsTracker from "./donationsTracker.js";
import winCounter from "./winCounter.js";
import playerList from "./playerList.js";
import gameScriptUtils from "./gameScriptUtils.js";
import hoveringTooltip from "./hoveringTooltip.js";
import { keybindFunctions, keybindHandler, mobileKeybinds } from "./keybinds.js";
import customLobby from './customLobby.js';
import { displayChangelog } from './changelog.js';
import { reportError } from './debugging.js';
import replayHistory from './replayHistory.js';
import replay, { initializeReplayTimebar } from './replay.js';
import lobbyReminders from './lobbyReminders.js';
import lobbyChatFeed from './lobbyChatFeed.js';
import pingFilter from './pingFilter.js';
import nameFilter from './nameFilter.js';
import followedAccounts from './followedAccounts.js';
import passwordReset from './passwordReset.js';
import savedAccounts from './savedAccounts.js';
import { installSelfTerritoryHighlight } from "./selfTerritoryHighlight.js";
import { initializeWorldClock } from "./worldClock.js";
import { createSidebar } from "./sidebar.js";
import { createVueSettingsView } from "./vueSettingsView.js";
import { createVueHomeView } from "./homeView.js";
import { createVueReplayView } from "./replayView.js";
import { createVueLeaderboardsView } from "./leaderboardsView.js";
import { createVueLogsView } from "./logsView.js";
import { createVueGameSettingsView } from "./gameSettingsView.js";
import { createVueMyAccountView, myAccountAdapter } from "./myAccountView.js";
import { initializeUpdatePromptView } from "./updatePromptView.js";
import { getVar, getGameMapNames } from "./gameInterface.js";
import { publishFxBridge } from "./fxBridge.js";

// Stable bridge used by injected game patches. Keep this surface explicit:
// patched game code must not reach into individual FX modules directly.
const fxBridge = publishFxBridge(window, {
  version: version + " " + lastUpdated,
  isCustomLobbyVersion: window.location.href.startsWith("https://fxclient.github.io/custom-lobbies"),
  settingsManager,
  leaderboardFilter,
  utils: gameScriptUtils,
  WindowManager,
  keybindFunctions,
  keybindHandler,
  mobileKeybinds,
  donationsTracker,
  reportError,
  playerList,
  hoveringTooltip,
  clanFilter,
  wins: winCounter,
  customLobby,
  replayHistory,
  replay,
  lobbyReminders,
  lobbyChatFeed,
  pingFilter,
  nameFilter,
  followedAccounts,
  passwordReset,
  savedAccounts,
  selfTerritoryHighlight: { install: installSelfTerritoryHighlight },
  getGameVar: getVar,
  getGameMapNames,
  myAccountAdapter,
});

const savedVersion = localStorage.getItem("fx_version");
if (savedVersion !== version && !fxBridge.isCustomLobbyVersion) {
  localStorage.setItem("fx_version", version);
  if (savedVersion !== null && isSignificant) displayChangelog();
}

initializeLobbyEnhancements();
initializeUpdatePromptView();
initializeCustomLobbyView();
createVueSettingsView(settingsManager);
createVueHomeView();
createVueReplayView();
createVueLeaderboardsView();
createVueLogsView();
createVueGameSettingsView();
createVueMyAccountView();
initializeReplayTimebar();
const sidebar = createSidebar();
fxBridge.sidebar = sidebar;
initializeWorldClock(sidebar.getClockSlot(), sidebar.isCollapsed);

console.log('Successfully loaded ZFX Client');
