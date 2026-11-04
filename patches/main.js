import ModUtils from "../modUtils.js";
import customLobby from "./customLobby.js";
import duplicateIpHighlight from "./duplicateIpHighlight.js";
import followedAccounts from "./followedAccounts.js";
import highlightSpawnpoints from "./highlightSpawnpoints.js";
import hoveringTooltip from "./hoveringTooltip.js";
import leaderboard from "./leaderboard.js";
import lobbyLayout from "./lobbyLayout.js";
import lobbyReminders from "./lobbyReminders.js";
import misc from "./misc.js";
import mobileKeybinds from "./mobileKeybinds.js";
import nameFilter from "./nameFilter.js";
import nameRendering from "./nameRendering.js";
import passwordReset from "./passwordReset.js";
import gamePatches from "./patches.js";
import pingFilter from "./pingFilter.js";
import quickEmojis from "./quickEmojis.js";
import replayHistory from "./replayHistory.js";
import replayTimebar from "./replayTimebar.js";
import savedAccounts from "./savedAccounts.js";
import titanChatButton from "./titanChatButton.js";

// Preserve the current application order explicitly. Patch dependencies and
// post-minification callbacks should not depend on filesystem enumeration.
export const patchRegistry = [
    ["customLobby.js", customLobby],
    ["duplicateIpHighlight.js", duplicateIpHighlight],
    ["followedAccounts.js", followedAccounts],
    ["highlightSpawnpoints.js", highlightSpawnpoints],
    ["hoveringTooltip.js", hoveringTooltip],
    ["leaderboard.js", leaderboard],
    ["lobbyLayout.js", lobbyLayout],
    ["lobbyReminders.js", lobbyReminders],
    ["misc.js", misc],
    ["mobileKeybinds.js", mobileKeybinds],
    ["nameFilter.js", nameFilter],
    ["nameRendering.js", nameRendering],
    ["passwordReset.js", passwordReset],
    ["patches.js", gamePatches],
    ["pingFilter.js", pingFilter],
    ["quickEmojis.js", quickEmojis],
    ["replayHistory.js", replayHistory],
    ["replayTimebar.js", replayTimebar],
    ["savedAccounts.js", savedAccounts],
    ["titanChatButton.js", titanChatButton],
];

/** @param {ModUtils} modUtils @param {[string, (modUtils: ModUtils) => unknown][]} registry */
export function applyPatchRegistry(modUtils, registry = patchRegistry) {
    const names = new Set();
    for (const [name, patch] of registry) {
        if (names.has(name)) throw new Error(`Duplicate game patch registration: ${name}`);
        if (typeof patch !== "function") throw new Error(`Invalid game patch registration: ${name}`);
        names.add(name);
        console.info(`[FXClient] Applying game patch: ${name}`);
        patch(modUtils);
    }
}

export default function applyPatches(/** @type {ModUtils} */ modUtils) {
    applyPatchRegistry(modUtils);
}
