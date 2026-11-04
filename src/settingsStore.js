import { isValidSettingValue } from "./settingsSchema.js";

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

/** Merges persisted settings while keeping defaults for values with invalid types. */
export function mergeSettings(defaults, candidate) {
  if (!isRecord(candidate)) throw new TypeError("Settings must be a JSON object");

  const merged = { ...defaults };
  for (const [key, value] of Object.entries(candidate)) {
    if (Object.hasOwn(defaults, key) && !isValidSettingValue(key, value, defaults[key])) continue;
    Object.defineProperty(merged, key, { value, enumerable: true, configurable: true, writable: true });
  }
  return merged;
}

/** Loads settings safely; invalid or damaged stored JSON falls back to defaults. */
export function loadSettings(serialized, defaults, onInvalid = error => console.warn("[FXClient] Could not load saved settings:", error)) {
  if (serialized === null || serialized === undefined || serialized === "") return { ...defaults };
  try {
    return mergeSettings(defaults, JSON.parse(serialized));
  } catch (error) {
    onInvalid(error);
    return { ...defaults };
  }
}

/** Parses an imported settings file, rejecting non-object JSON and retaining defaults. */
export function parseImportedSettings(serialized, defaults) {
  const candidate = JSON.parse(serialized);
  return mergeSettings(defaults, candidate);
}
