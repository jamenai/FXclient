import assert from "node:assert/strict";
import test from "node:test";
import { createGameInterface } from "../src/gameInterface.js";

test("resolves game values through dictionary names rather than source variable names", () => {
  const dictionary = {
    playerData: "a", playerBalances: "b", game: "c", playerId: "d",
    protocol: "e", replayRecorder: "f", tickCounts: "g", mapHolder: "h",
    mapInfo: "i", mapNames: "j", languageHolder: "k", languageData: "l",
    languageCodes: "m", emojiHolder: "n", emojiPicker: "o", emojiTiles: "p",
    uiSizes: "q", gap: "r", unknownValue: "s",
  };
  const target = {
    a: { b: [15, 30] },
    c: { d: 1 },
    e: { f: { g: [4, 8] } },
    h: { i: { j: ["Map A", "Map B"] } },
    k: { l: { m: ["en", "de"] } },
    n: { o: { p: ["tile"] } },
    q: { r: 12.8 },
    s: "fallback",
  };
  const game = createGameInterface(() => target, () => dictionary);

  assert.deepEqual(game.getVar("playerBalances"), [15, 30]);
  assert.equal(game.getVar("playerId"), 1);
  assert.deepEqual(game.getVar("tickCounts"), [4, 8]);
  assert.equal(game.getVar("unknownValue"), "fallback");
  assert.equal(game.getUIGap(), 12);
  assert.deepEqual(game.getMapNames(), ["Map A", "Map B"]);
  assert.deepEqual(game.getLanguageCodes(), ["en", "de"]);
  assert.equal(game.getEmojiTile(0), "tile");
});

test("returns safe defaults when optional game structures are unavailable", () => {
  const game = createGameInterface(() => ({}), () => ({}));

  assert.equal(game.getVar("playerId"), undefined);
  assert.equal(game.getUIGap(), 10);
  assert.equal(game.getMapNames(), null);
  assert.equal(game.getLanguageCodes(), null);
  assert.equal(game.getEmojiTile(0), undefined);
});

test("rejects malformed game values and reports each changed field once", () => {
  const dictionary = { playerData: "a", playerBalances: "b", game: "c", playerId: "d" };
  const target = { a: { b: "not-an-array" }, c: { d: "not-a-number" } };
  const warnings = [];
  const game = createGameInterface(() => target, () => dictionary,
    (name, value) => warnings.push([name, value]));

  assert.equal(game.getVar("playerBalances"), undefined);
  assert.equal(game.getVar("playerBalances"), undefined);
  assert.equal(game.getVar("playerId"), undefined);
  assert.deepEqual(warnings, [
    ["playerBalances", "not-an-array"],
    ["playerId", "not-a-number"],
  ]);
});

test("accepts typed arrays as indexed game data", () => {
  const dictionary = { playerData: "a", playerTerritories: "b" };
  const game = createGameInterface(() => ({ a: { b: new Uint16Array([2, 5]) } }), () => dictionary);

  assert.deepEqual([...game.getVar("playerTerritories")], [2, 5]);
});
