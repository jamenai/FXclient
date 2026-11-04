import assert from "node:assert/strict";
import test from "node:test";
import { loadSettings, mergeSettings, parseImportedSettings } from "../src/settingsStore.js";

const defaults = {
  showReplayTimebar: true,
  lobbyFontScale: 100,
  customQuickEmojis: [],
  followedAccountColors: {},
};

test("loads valid saved settings and keeps defaults for invalid known types", () => {
  const loaded = loadSettings(JSON.stringify({
    showReplayTimebar: false,
    lobbyFontScale: "large",
    customQuickEmojis: [1011, 1012],
    unknownFutureSetting: "preserved",
  }), defaults);

  assert.deepEqual(loaded, {
    showReplayTimebar: false,
    lobbyFontScale: 100,
    customQuickEmojis: [1011, 1012],
    followedAccountColors: {},
    unknownFutureSetting: "preserved",
  });
});

test("falls back to defaults when persisted JSON is malformed", () => {
  const warnings = [];
  assert.deepEqual(loadSettings("{bad json", defaults, error => warnings.push(error)), defaults);
  assert.equal(warnings.length, 1);
  assert.deepEqual(loadSettings('"not an object"', defaults, error => warnings.push(error)), defaults);
  assert.equal(warnings.length, 2);
});

test("rejects imported non-object JSON and merges valid imports with defaults", () => {
  assert.throws(() => parseImportedSettings("[]", defaults), /JSON object/);
  assert.deepEqual(parseImportedSettings('{"showReplayTimebar":false}', defaults), {
    ...defaults,
    showReplayTimebar: false,
  });
});

test("does not mutate default settings while merging", () => {
  const base = { enabled: true, values: [] };
  const merged = mergeSettings(base, { enabled: false, values: [1] });

  assert.deepEqual(base, { enabled: true, values: [] });
  assert.notEqual(merged.values, base.values);
});
