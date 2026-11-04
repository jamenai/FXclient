import assert from "node:assert/strict";
import test from "node:test";
import ModUtils from "../modUtils.js";

test("matchRawCode follows renamed identifiers and repeated references", () => {
  const mod = new ModUtils("function f(){return player+score+player}");

  assert.deepEqual(mod.matchRawCode("function f(){return username+points+username}"), {
    f: "f",
    username: "player",
    points: "score",
  });
});

test("replaceRawCode substitutes captured identifiers in the replacement", () => {
  const mod = new ModUtils("function f(){return username+points+username}");

  const mappings = mod.replaceRawCode(
    "function f(){return player+score+player}",
    "function f(){return player+score+1}"
  );

  assert.deepEqual(mappings, { f: "f", player: "username", score: "points" });
  assert.equal(mod.script, "function f(){return username+points+1}");
});

test("raw-code matching rejects missing and ambiguous anchors", () => {
  const missing = new ModUtils("const x=1;");
  const ambiguous = new ModUtils("a=b+1;a=b+1;");

  assert.throws(() => missing.matchRawCode("a=b+1;"), /no match/);
  assert.throws(() => ambiguous.matchRawCode("x=y+1;"), /more than one match/);
});

test("replaceCode normalizes formatting before matching", () => {
  const mod = new ModUtils("function f(){return value+1}");

  mod.replaceCode("function f(){return value+1;}", "function f(){return value+2;}");

  assert.equal(mod.script, "function f(){return value+2;}");
});
