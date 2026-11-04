import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyPatchRegistry, patchRegistry } from "../patches/main.js";

const patchDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../patches");

test("registered patches have unique names and callable implementations", () => {
  const names = patchRegistry.map(([name]) => name);

  assert.equal(new Set(names).size, names.length);
  assert.ok(patchRegistry.length > 0);
  for (const [name, patch] of patchRegistry) {
    assert.match(name, /\.js$/);
    assert.equal(typeof patch, "function");
  }
});

test("every patch file is present in the explicit registry", () => {
  const patchFiles = readdirSync(patchDirectory)
    .filter(name => name.endsWith(".js") && name !== "main.js")
    .sort();
  const registeredFiles = patchRegistry.map(([name]) => name).sort();

  assert.deepEqual(registeredFiles, patchFiles);
});

test("applies patches in declared order", () => {
  const calls = [];
  const registry = [
    ["first.js", () => calls.push("first")],
    ["second.js", () => calls.push("second")],
  ];

  applyPatchRegistry({}, registry);

  assert.deepEqual(calls, ["first", "second"]);
});

test("rejects duplicate registrations and propagates patch failures", () => {
  const patch = () => {};
  assert.throws(
    () => applyPatchRegistry({}, [["same.js", patch], ["same.js", patch]]),
    /Duplicate game patch registration/
  );

  const failure = new Error("patch anchor changed");
  assert.throws(
    () => applyPatchRegistry({}, [["broken.js", () => { throw failure; }]]),
    error => error === failure
  );
});
