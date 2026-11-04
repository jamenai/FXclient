import assert from "node:assert/strict";
import test from "node:test";
import ModUtils, { minifyCode } from "../modUtils.js";
import customLobbyPatch from "../patches/customLobby.js";

const fixture = `
function aBG(aBE) {
  if (!Lobby.aAl) { return -1; }
  var s = aBE.length;
  var qu = Lobby.aAl.qu;
  for (var i = 0; i < s; i++) { if (aBE[i].qu === qu) { return i; } }
  return -1;
}
this.a0 = function() { u.v(5, 5); };
this.a71 = function(aUM) {
  if (aUM) { aa.f2 = aUM; }
  u.y___();
  aa.dk();
};
var l;
if (b.c) { l = "ws://localhost:" + (7130 + d) + "/"; }
if (socketId === 0) { q.a08(3249); return; }
this.send = function(a, b) {
  if (a !== 0) { c(a); }
  d[a].send(b);
};
this.closeSocket = function(socketId, errorCode) {
  console.log("socket close index " + socketId + " error " + errorCode);
  this.errors.push(errorCode);
  if (errorCode === 4321) { this.handle(errorCode); }
};
a.b.c();
d.e();
this.f = 0;
g.h();
i.j.setState(0);
MenuManager.setState(0);
k.l.m(n);
if (this.o === 2) { this.restore(); }
this.ye = new Array(bV.aNY + 1);
this.ye[0] = { j: 230, k: 230 };
`;

function makeModUtils(source = fixture, lobbyIdentifier = "Lobby") {
  const modUtils = new ModUtils(minifyCode(source));
  modUtils.dictionary.Lobby = lobbyIdentifier;
  modUtils.dictionary.MenuManager = "MenuManager";
  modUtils.dictionary.getState = "getState";
  return modUtils;
}

test("patches custom lobby anchors and hooks with the default lobby identifier", () => {
  const modUtils = makeModUtils();

  customLobbyPatch(modUtils);

  assert.match(modUtils.script, /__fx\.customLobby\.getPlayerId\(\)/);
  assert.match(modUtils.script, /__fx\.customLobby\.setJoinFunction/);
  assert.match(modUtils.script, /__fx\.customLobby\.getSocketURL/);
  assert.match(modUtils.script, /__fx\.customLobby\.setSendFunction/);
  assert.match(modUtils.script, /__fx\.customLobby\.setMapInfo/);
  assert.equal(modUtils.postMinifyHandlers.length, 1);
});

test("resolves a renamed lobby global through the patch dictionary", () => {
  const renamedFixture = fixture.replace(/\bLobby\b/g, "lobbyState");
  const modUtils = makeModUtils(renamedFixture, "lobbyState");

  customLobbyPatch(modUtils);

  assert.match(modUtils.script, /__fx\.customLobby\.getPlayerId\(\)/);
  assert.match(modUtils.script, /__fx\.customLobby\.setMapInfo/);
});

test("fails when a required custom lobby anchor disappears", () => {
  const modUtils = makeModUtils(fixture.replace("this.ye = new Array(bV.aNY + 1);", "this.maps = [];"));

  assert.throws(() => customLobbyPatch(modUtils), /replaceCode match error|no match/);
});
