import assert from "node:assert/strict";
import test from "node:test";
import { patchLobbyLayout } from "../patchUtils/lobbyLayoutAst.js";

const minifiedFixture = `function a(){this.resize=function(){var t=p(x*.05);var u=p(x*.06+.03*y);var v=p(x*.08+.03*y);var w=p(x*.02+.01*y);q.style.margin="0.2em 0.2em 0.2em 0.2em";q.style.width=q.style.maxWidth=r===2?"10em":"9em";q.style.fontSize=p(.02,.3);s[1].label.textContent="MP: "+m+"   SP: "+n+"   Lobby: "+o;c.style.margin="0.6em 0.6em";var selectedMode=modeState.selected[0];for(var modeIndex=0;modeIndex<4;modeIndex++){mapLabels[modeIndex]=new Label(mapNames[modeIndex],modeButtons[modeIndex].button,1,1);mapLabels[modeIndex].textNode.textContent=mapNames[selectedMode]}}}`;
const renamedFixture = `function modal(){ this.resize = function(){ var titleSize=scale(width * .05); var teamSize=scale(width * .06 + .03 * isTall); var modeSize=scale(width * .08 + .03 * isTall); var footerSize=scale(width * .02 + .01 * isTall); player.style.margin = "0.2em 0.2em 0.2em 0.2em"; player.style.width = player.style.maxWidth = mode === 2 ? "10em" : "9em"; player.style.fontSize = size(.02,.3); stats[1].label.textContent = "MP: " + mp + "   SP: " + sp + "   Lobby: " + count; chat.style.margin = "0.6em 0.6em"; var activeMode = view.selectedMode[0]; for (var modeIndex = 0; modeIndex < 4; modeIndex++) { labels[modeIndex] = new MapLabel(names[modeIndex], tabs[modeIndex].button, 1, 1); labels[modeIndex].labelElement.textContent = names[activeMode]; } }; }`;

for (const [name, fixture] of [["minified names", minifiedFixture], ["renamed names and whitespace", renamedFixture]]) {
  test(`patches lobby layout with ${name}`, () => {
    const { script, results } = patchLobbyLayout(fixture);
    assert.deepEqual(results.map(result => result.applied), [true, true, true, true, true, true, true]);
    assert.match(script, /enhancedLobbyLayout\s*\?\s*\.034\s*:\s*\.05/);
    assert.match(script, /enhancedLobbyLayout\?window\.innerWidth<window\.innerHeight\|\|window\.innerWidth\/window\.innerHeight>4\?\.055:\.04:\.06/);
    assert.match(script, /enhancedLobbyLayout\?window\.innerWidth<window\.innerHeight\|\|window\.innerWidth\/window\.innerHeight>4\?\.06:\.04:\.08/);
    assert.match(script, /enhancedLobbyLayout\s*\?\s*\.016\s*:\s*\.02/);
    assert.match(script, /enhancedLobbyLayout\s*\?\s*\.007\s*:\s*\.01/);
    assert.match(script, /enhancedLobbyLayout\s*\?\s*"0\.05em 0\.1em"/);
    assert.match(script, /enhancedLobbyLayout\s*\?\s*"100%"/);
    assert.match(script, /enhancedLobbyLayout\s*\?\s*\.018\s*:\s*\.02/);
    assert.match(script, /textContent="Lobby"/);
    assert.match(script, /style\.margin="0\.3em 0\.6em"/);
    assert.match(script, /\.style\.setProperty\("font-weight",modeIndex===\w+\?"700":"normal","important"\)/);
    assert.doesNotMatch(script, /\.p2\b/);
  });
}

test("fails the build when a required lobby target is missing", () => {
  assert.throws(
    () => patchLobbyLayout("function noLobby(){this.resize=function(){var x=1}} "),
    /Expected one lobby resize function, found 0/
  );
});

test("fails the build when a lobby target is ambiguous", () => {
  assert.throws(
    () => patchLobbyLayout(`${minifiedFixture}${minifiedFixture}`),
    /Expected one lobby resize function, found 2/
  );
});
