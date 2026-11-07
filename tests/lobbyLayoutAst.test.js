import assert from "node:assert/strict";
import test from "node:test";
import { patchLobbyLayout } from "../patchUtils/lobbyLayoutAst.js";

const minifiedFixture = `function a(){
var root={},titleRow={},teamRow={},mapRow={},mapInfoRow={},footerRow={},bodyRow={},gapA={},gapB={};
root.appendChild(titleRow);root.appendChild(mapRow);root.appendChild(mapInfoRow);root.appendChild(teamRow);root.appendChild(gapA);root.appendChild(bodyRow);root.appendChild(footerRow);root.appendChild(gapB);
this.resize=function(){
var t=p(x*.05),u=p(x*.06+.03*y),v=p(x*.08+.03*y),w=p(x*.04+.02*y),z=p(x*.02+.01*y),b=p(x*(window.innerHeight/window.innerWidth));
titleRow.style.height=layout.sT(t);teamRow.style.height=layout.sT(u);mapRow.style.height=layout.sT(v);mapInfoRow.style.height=layout.sT(w);footerRow.style.height=layout.sT(z);bodyRow.style.height=layout.sT(window.innerHeight/window.innerWidth);
mapInfoRow.style.font=p(12,.6);teamRow.style.font=p(12,.6);
titleRow.style.top=p(x*.01);teamRow.style.top=p(x*.05+.03*y);mapRow.style.top=p(x*.03+.03*y);mapInfoRow.style.top=p(x*.04+.02*y);footerRow.style.top=p(x*.02+.01*y);
player.style.margin="0.2em 0.2em 0.2em 0.2em";player.style.width=player.style.maxWidth=mode===2?"10em":"9em";player.style.fontSize=p(.02,.3);
stats[1].label.textContent="MP: "+mp+"   SP: "+sp+"   Lobby: "+count;chat.style.margin="0.6em 0.6em";
modeButtons[0].button.resize(mapRow);modeButtons[1].button.resize(mapRow);modeButtons[2].button.resize(mapRow);modeButtons[3].button.resize(mapRow);
if(active)this.lobby.resize(bodyRow);
};
var updateMode=function(){var selectedMode=modeState.selected[0];for(var modeIndex=0;modeIndex<4;modeIndex++){mapLabels[modeIndex]=new Label(mapNames[modeIndex],modeButtons[modeIndex].button,1,1);mapLabels[modeIndex].textNode.textContent=mapNames[selectedMode]}};
this.show=function(){this.resize();this.message.show()};
}`;
const renamedFixture = minifiedFixture
  .replaceAll("function a()", "function lobbyDialog()")
  .replaceAll("titleRow", "headerSection")
  .replaceAll("teamRow", "nextMapSection")
  .replaceAll("mapRow", "modeTabsSection")
  .replaceAll("mapInfoRow", "currentMapSection")
  .replaceAll("footerRow", "progressSection")
  .replaceAll("bodyRow", "lobbyBody")
  .replaceAll("modeButtons", "lobbyTabs")
  .replaceAll("mapLabels", "mapTabLabels")
  .replaceAll("modeIndex", "selectedTab")
  .replaceAll("selectedMode", "activeTab")
  .replaceAll(";", "; ");

for (const [name, fixture] of [["minified names", minifiedFixture], ["renamed names and whitespace", renamedFixture]]) {
  test(`patches lobby layout with ${name}`, () => {
    const { script, results } = patchLobbyLayout(fixture);
    assert.deepEqual(results.map(result => result.applied), Array(9).fill(true));
    assert.match(script, /enhancedLobbyLayout\?0:\.05/);
    assert.match(script, /enhancedLobbyLayout\?\.085\*Math\.max\(/);
    assert.match(script, /enhancedLobbyLayout\?\.016:\.02/);
    assert.match(script, /enhancedLobbyLayout\?\.007:\.01/);
    assert.match(script, /enhancedLobbyLayout\?"0\.05em 0\.1em"/);
    assert.match(script, /enhancedLobbyLayout\?"100%"/);
    assert.match(script, /enhancedLobbyLayout\?\.018:\.02/);
    assert.match(script, /textContent="Lobby"/);
    assert.match(script, /style\.margin="0\.3em 0\.6em"/);
    assert.match(script, /\.style\.setProperty\("font-weight",\w+===\w+\?"700":"normal","important"\)/);
    assert.match(script, /grid-template-rows/);
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
