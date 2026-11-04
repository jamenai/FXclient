const defaultValues = Object.freeze({
  displayWinCounter: true,
  displayTickNumber: true,
  showWorldClock: true,
  showSidebar: true,
  useFullscreenMode: false,
  hoveringTooltip: true,
  realisticNames: false,
  showPlayerDensity: true,
  showEstimatedEliminationAttack: false,
  estimatedAttackGreenThreshold: 25,
  coloredDensity: true,
  densityDisplayStyle: "absoluteQuotient",
  hideBotNames: false,
  highlightClanSpawns: false,
  highlightSelfTerritory: true,
  selfTerritoryOutlineWidth: 3,
  selfTerritoryGlow: 6,
  highlightDuplicateIps: false,
  highlightSameClan: false,
  detailedTeamPercentage: false,
  openDonationHistoryFromLb: true,
  customBackgroundUrl: "",
  keybindButtons: false,
  attackPercentageKeybinds: [],
  startingPercentageEnabled: false,
  startingPercentage: 50,
  hidePropagandaPopup: false,
  showReplayTimebar: true,
  customQuickEmojisEnabled: false,
  customQuickEmojis: [],
  lobbyReminderRules: [],
  enhancedLobbyLayout: true,
  showClanLobbyDashboard: true,
  lobbyFontScale: 100,
  mutePingAll: false,
  mutePingEveryone: false,
  mutePingRoom: false,
  mutePingClan: false,
  mutePingLanguage: false,
  mutePingDirect: false,
  hideInappropriateNames: false,
  followedAccountNicknames: {},
  followedAccountColors: {},
  savedAccountLabels: {},
});

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const typeOfDefault = value => Array.isArray(value) ? "array" : isRecord(value) ? "object" : typeof value;

const schemaEntries = Object.fromEntries(
  Object.entries(defaultValues).map(([key, value]) => [key, { type: typeOfDefault(value) }])
);

schemaEntries.estimatedAttackGreenThreshold = { type: "number", min: 5, max: 75 };
schemaEntries.selfTerritoryOutlineWidth = { type: "number", min: 1, max: 6 };
schemaEntries.selfTerritoryGlow = { type: "number", min: 0, max: 12 };
schemaEntries.startingPercentage = { type: "number", min: 0, max: 100 };
schemaEntries.lobbyFontScale = { type: "number", min: 75, max: 125 };
schemaEntries.densityDisplayStyle = { type: "string", values: ["percentage", "absoluteQuotient"] };
for (const definition of Object.values(schemaEntries)) Object.freeze(definition);
Object.freeze(schemaEntries.densityDisplayStyle.values);
export const SETTINGS_SCHEMA = Object.freeze(schemaEntries);

export const DISCONTINUED_SETTINGS = Object.freeze(["hideAllLinks", "fontName"]);

export function createDefaultSettings() {
  return {
    ...defaultValues,
    attackPercentageKeybinds: [],
    customQuickEmojis: [],
    lobbyReminderRules: [],
    followedAccountNicknames: {},
    followedAccountColors: {},
    savedAccountLabels: {},
  };
}

export function isValidSettingValue(key, value, fallbackValue) {
  const schema = SETTINGS_SCHEMA[key];
  if (!schema) return isValidByDefaultType(fallbackValue, value);
  if (schema.type === "array") return Array.isArray(value);
  if (schema.type === "object") return isRecord(value);
  if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) return false;
  if (typeof value !== schema.type) return false;
  if (schema.min !== undefined && value < schema.min) return false;
  if (schema.max !== undefined && value > schema.max) return false;
  if (schema.values && !schema.values.includes(value)) return false;
  return true;
}

function isValidByDefaultType(defaultValue, value) {
  if (Array.isArray(defaultValue)) return Array.isArray(value);
  if (isRecord(defaultValue)) return isRecord(value);
  if (typeof defaultValue === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === typeof defaultValue;
}

/** Migrates known historical settings in place and reports whether data changed. */
export function migrateSettings(settings) {
  if (settings.emojiBar === undefined && settings.customEmojiBar === undefined) return false;

  if (settings.customQuickEmojis.length === 0 && !settings.customQuickEmojisEnabled) {
    if (Array.isArray(settings.emojiBar) && settings.emojiBar.length === 9)
      settings.customQuickEmojis = settings.emojiBar;
    if (settings.customEmojiBar) settings.customQuickEmojisEnabled = true;
  }
  delete settings.emojiBar;
  delete settings.customEmojiBar;
  return true;
}
