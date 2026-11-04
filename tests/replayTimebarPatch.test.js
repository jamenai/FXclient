import assert from "node:assert/strict";
import test from "node:test";
import ModUtils, { minifyCode } from "../modUtils.js";
import replayTimebarPatch from "../patches/replayTimebar.js";

const fixture = `
if (hidden === game.uiHidden) { return; } game.uiHidden = hidden;
return (this.gIsReplay ? (escMenu.escMenuOpen || !replayPanel.playingFlag)
    : (this.gIsSingleplayer && (escMenu.escMenuOpen || this.canSelectSpawn)));
function tickPlayer() {
  this.dh = function() {
    entryIndex = 0;
    commandIndex = 0;
    emptyTicks = 0;
    serverTick = 0;
    subTick = 0;
  };
  this.eb = function() {
    screenManager.eb();
    if (replayPanel.getSpeed() < 1.7) {
      slowLoop();
    } else {
      fastLoop();
    }
    updateOverlays();
    if (gameLoop.needsRedraw) {
      gameLoop.needsRedraw = false;
      redrawGame();
    }
  };
  function slowLoop() {
    var interval;
    if (frameCount === 0) {
      if (gameLoop.time >= nextTickTime) {
        interval = gameLoop.tickInterval / replayPanel.getSpeed();
        nextTickTime += interval * Math.floor(1 + (gameLoop.time - nextTickTime) / interval);
        if (game.gameState === 2 || escMenu.escMenuOpen || !replayPanel.playingFlag) {
          renderIdle();
        } else {
          advanceTick();
          sidePanels.updateSidePanels();
        }
      }
    }
  }
}
var flags = protocol.replayRecorder.tickFlags;
var counts = protocol.replayRecorder.tickCounts;
if (entryIndex >= counts.length) { return false; }
function advanceEmpty(count) { if (++emptyTicks >= count) { entryIndex++; emptyTicks = 0; } return true; }
function advanceCommands(count) { commandIndex += count; entryIndex++; return true; }
this.watchReplay = function() {
  var wasInGame = game.gameState !== 0;
  var returnPage = game.returnPageState;
  if (!wasInGame) { menuSystem.exitToMenu(); }
  returnPage = returnPage;
};
this.panelInit = function() {
  if (!game.gIsReplay) { return; }
  speedIndex = 5;
  this.playingFlag = false;
  speedMenuOpen = false;
  panelRect = new Rect([0.3, 0.3 / 6], [0.5, 1]);
  this.resize();
};
this.getSpeed = function() { return speedLevels[speedIndex]; };
this.getPanelTop = function() { return panelRect.panelY; };
this.togglePause = function(fromError) {
  if (game.gameState === 2) {
    this.setUIHidden(false);
    menuSystem.u(3);
    return;
  }
  this.playingFlag = !this.playingFlag;
};
`;

function makeModUtils(source = fixture, gameIdentifier = "game") {
  const modUtils = new ModUtils(minifyCode(source));
  Object.assign(modUtils.dictionary, {
    game: gameIdentifier,
    gIsReplay: "gIsReplay",
    gIsSingleplayer: "gIsSingleplayer",
  });
  return modUtils;
}

function assertReplayPatchApplied(modUtils) {
  replayTimebarPatch(modUtils);

  assert.match(modUtils.script, /__fx\.replay\.registerHooks/);
  assert.match(modUtils.script, /__fx\.replay\.frame\(\)/);
  assert.match(modUtils.script, /__fx\.replay\.restartReplay/);
  assert.match(modUtils.script, /__fx\.replay\.controls/);
  assert.match(modUtils.script, /__fx\.replay\.togglePlayPause/);
  assert.equal((modUtils.script.match(/__fx\.replay\.tick\+\+/g) || []).length, 2);
}

test("patches replay timebar anchors", () => {
  assertReplayPatchApplied(makeModUtils());
});

test("survives a renamed game global resolved through the patch dictionary", () => {
  const renamed = fixture.replace(/\bgame\b/g, "gObj");
  assertReplayPatchApplied(makeModUtils(renamed, "gObj"));
});

test("fails clearly if a required replay recorder anchor disappears", () => {
  const modUtils = makeModUtils(fixture.replace("var counts = protocol.replayRecorder.tickCounts;", "var sizes = protocol.replayRecorder.tickCounts;"));

  assert.throws(() => replayTimebarPatch(modUtils), /matchRawCode match error/);
});
