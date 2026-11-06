const playerDataProperties = [
    "playerTerritories",
    "playerBalances",
    "rawPlayerNames",
    "playerCommitted"
];
const gameObjectProperties = [
    "playerId",
    "gIsTeamGame",
    "gHumans",
    "gLobbyMaxJoin",
    "gameState",
    "gIsSingleplayer",
    "gIsReplay",
    "gSelectableSpawn",
    "uiHidden"
];
const replayRecorderProperties = [
    "tickFlags",
    "tickCounts"
];
const arrayLikeProperties = new Set([
    "playerTerritories",
    "playerBalances",
    "rawPlayerNames",
    "playerCommitted",
    "tickFlags",
    "tickCounts",
]);
const numericProperties = new Set([
    "playerId",
    "gHumans",
    "gLobbyMaxJoin",
    "gameState"
]);

function isArrayLike(value) {
    return value !== null && typeof value === "object"
        && Number.isInteger(value.length) && value.length >= 0;
}

/**
 * Creates an adapter around the game's changing global object layout.
 * @param {() => Record<string, any>} getTarget
 * @param {() => Record<string, string>} getDictionary
 */
export function createGameInterface(getTarget, getDictionary, onInvalidValue = (name, value) => {
    console.warn(`[ZFX Client] Ignoring game value "${name}" with unexpected shape:`, value);
}) {
    const getPath = (...keys) => keys.reduce((value, key) => value?.[getDictionary()[key]], getTarget());
    const reportedInvalidValues = new Set();

    const getValidatedVar = varName => {
        let keys = [varName];
        if (playerDataProperties.includes(varName)) keys = ["playerData", varName];
        else if (gameObjectProperties.includes(varName)) keys = ["game", varName];
        else if (replayRecorderProperties.includes(varName)) keys = ["protocol", "replayRecorder", varName];
        const value = getPath(...keys);
        if (value === undefined || value === null) return value;

        const valid = arrayLikeProperties.has(varName) ? isArrayLike(value)
            : numericProperties.has(varName) ? Number.isFinite(value)
                : true;
        if (valid) return value;

        if (!reportedInvalidValues.has(varName)) {
            reportedInvalidValues.add(varName);
            onInvalidValue(varName, value);
        }
        return undefined;
    };

    return {
        getVar: getValidatedVar,
        getUIGap() {
            return Math.floor(getPath("uiSizes", "gap") ?? 10);
        },
        getMapNames() {
            const names = getPath("mapHolder", "mapInfo", "mapNames");
            return Array.isArray(names) && names.length ? names : null;
        },
        getLanguageCodes() {
            const codes = getPath("languageHolder", "languageData", "languageCodes");
            return Array.isArray(codes) ? codes : null;
        },
        getEmojiTile(index) {
            return getPath("emojiHolder", "emojiPicker", "emojiTiles")?.[index];
        },
    };
}

const gameInterface = createGameInterface(() => window, () => dictionary);

export const getVar = gameInterface.getVar;
export const getUIGap = gameInterface.getUIGap;
export const getGameMapNames = gameInterface.getMapNames;
export const getGameLanguageCodes = gameInterface.getLanguageCodes;
export const getGameEmojiTile = gameInterface.getEmojiTile;
