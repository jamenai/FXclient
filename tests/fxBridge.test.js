import assert from "node:assert/strict";
import test from "node:test";
import { publishFxBridge } from "../src/fxBridge.js";

test("publishes the API on the existing bridge without replacing it", () => {
  const bridge = { legacyReference: true };
  const target = { __fx: bridge };
  const api = { version: "1.0", getGameVar: () => 42 };

  const published = publishFxBridge(target, api);

  assert.equal(published, bridge);
  assert.equal(target.__fx, bridge);
  assert.equal(bridge.legacyReference, true);
  assert.equal(bridge.version, "1.0");
  assert.equal(bridge.getGameVar(), 42);
});

test("creates the bridge when the target does not have one", () => {
  const target = {};
  const api = { feature: true };

  const bridge = publishFxBridge(target, api);

  assert.equal(target.__fx, bridge);
  assert.equal(bridge.feature, true);
});
