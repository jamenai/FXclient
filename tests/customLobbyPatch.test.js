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

const deferredFixture = [
  `b7.dH(a0),0===b7.size?aq.kt.aJJ(wR,3205):`,
  `this.xZ=function(){Sockets.kt.wf(3260),i___.kt.we()}`,
  `function(){n.r(),bl.zf(),Sockets.s.ze(3240),n.o(5,5)}`,
  `(sV.style.backdropFilter="blur(4px)",sV.style.webkitBackdropFilter="blur(4px)"),`,
  `if((t3=bk.t1.t3[e0])<2)return!1;`,
  `m.n___(4,5,new o(L(42),xT(e),!0))`,
  `this.vK=this.jS=this.data.a0f,this.gameIsSingleplayer=1===this.vK,`,
  `if(9===a1.jq)this.jr();else if(a1.js)if(3===a1.data.jv)for(z=a1.ju-1;0<=z;z--){var jw=z+jp;this.ie[jw]=`,
  `:50,this.a=this.b=this.data.c,this.d=this.b?new e:null,`,
  `1===a.b?this.gLobbyMaxJoin=this.gHumans:this.gLobbyMaxJoin=this.data.playerCount,this.maxPlayers=this.gLobbyMaxJoin,this.gBots=this.gLobbyMaxJoin-this.gHumans,this.sg=0,`,
].join(";");

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

  modUtils.script += deferredFixture;
  modUtils.executePostMinifyHandlers();
  assert.match(modUtils.script, /__fx\.customLobby\.isCustomMessage\(a0\)/);
  assert.match(modUtils.script, /__fx\.customLobby\.setActive\(false\)/);
  assert.match(modUtils.script, /__fx\.customLobby\.gameInfo\.difficulty/);
  assert.match(modUtils.script, /__fx\.customLobby\.gameInfo\.spawnSelection/);
  assert.match(modUtils.script, /__fx\.customLobby\.gameInfo\.botCount/);
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

test("fails when a required deferred custom lobby anchor disappears", () => {
  const modUtils = makeModUtils();
  customLobbyPatch(modUtils);
  modUtils.script += deferredFixture.replace(
    "this.xZ=function(){Sockets.kt.wf(3260),i___.kt.we()}",
    "this.xZ=function(){Sockets.kt.wf(3261),i___.kt.we()}"
  );

  assert.throws(() => modUtils.executePostMinifyHandlers(), /replaceRawCode match error/);
});
