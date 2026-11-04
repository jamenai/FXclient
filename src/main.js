import versionData from '../version.json';
const { version, lastUpdated, isSignificant } = versionData;

import settingsManager from './settings.js';
import { initializeLobbyEnhancements } from "./lobbyEnhancements.js";
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
import pingFilter from './pingFilter.js';
import nameFilter from './nameFilter.js';
import followedAccounts from './followedAccounts.js';
import passwordReset from './passwordReset.js';
import savedAccounts from './savedAccounts.js';
import { getVar } from "./gameInterface.js";
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
  pingFilter,
  nameFilter,
  followedAccounts,
  passwordReset,
  savedAccounts,
  getGameVar: getVar,
});

const savedVersion = localStorage.getItem("fx_version");
if (savedVersion !== version && !fxBridge.isCustomLobbyVersion) {
  localStorage.setItem("fx_version", version);
  if (savedVersion !== null && isSignificant) displayChangelog();
}

initializeLobbyEnhancements();
initializeReplayTimebar();

console.log('Successfully loaded FX Client');
