import assets from '../assets.js';
import ModUtils from '../modUtils.js';

function replaceRequired(modUtils, expression, replacement, featureName) {
    if (!expression.global) throw new Error(`${featureName}: expected a global regular expression`);
    const matches = Array.from(modUtils.script.matchAll(expression)).length;
    if (matches === 0) {
        throw new Error(`[Sidebar integration] Expected to patch ${featureName}, but found no matching game code.`);
    }
    modUtils.replace(expression, replacement);
    return matches;
}

export default (/** @type {ModUtils} */ modUtils) => {
    const { insertCode, waitForMinification } = modUtils

    // Render win count
    insertCode(`var s = Math.floor((Device.a1.largeUIEnabled() ? 0.018 : 0.0137) * h___.hz);
		ctx.font = Util.qd.sS(0, Math.max(5, s));
		Util.qd.textBaseline(ctx, 0);
		Util.qd.textAlign(ctx, 2);
		ctx.fillStyle = Colors.nl;
		ctx.fillText(clientInfo.gameVersion, h___.w, 0);
        /* here */`,
        `const text = "Win count: " + __fx.wins.count;
        const textLength = ctx.measureText(text).width;
        const size = Math.max(5, s);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, ctx.canvas.width - textLength - size / 2, size * 2);`)

    // Make the main canvas context have an alpha channel if a custom background is being used
    insertCode(`mainCanvasElement = document.getElementById("canvasA");
		if (Device.id === 2) { mainCanvasElement.style.webkitUserSelect = "none"; }
		mainCanvas = mainCanvasElement.getContext("2d", { alpha: /* here */ false });`,
    `__fx.makeMainMenuTransparent ? true :`)

	// Reset donation history and leaderboard filter when a new game is started
	insertCode(`an.init();ai.a5l();bA.pQ.qC = [];bA.hZ.pT = 1;/* here */`,
	`__fx.donationsTracker.reset(), __fx.leaderboardFilter.reset(), __fx.customLobby.isActive() && __fx.customLobby.hideWindow();`);

    // Capture the native profile payload before the game's final minification
    // changes its local function names. The client adapter maps this payload to
    // named account fields for the Vue account view.
    const accountProfilePattern = /function (?<profileFunction>\w+)\(data\)\{var \w+;var \w+;function \w+\(\)\{\w+=new \w+\(data\.username,/g;
    const { profileFunction } = modUtils.matchOne(accountProfilePattern).groups;
    modUtils.replaceOne(new RegExp(`function ${profileFunction}\\(data\\)\\{`, "g"), "$&if(String(data.uY).toLowerCase()===String(__fx.getNativeAccountId?.()).toLowerCase())__fx.myAccountAdapter?.setNativeProfile?.(data);");
    waitForMinification(() => applyPatches(modUtils))
}
//export const requiredVariables = ["game", "playerId", "playerData", "rawPlayerNames", "gIsSingleplayer", "playerTerritories"];

function applyPatches(/** @type {ModUtils} */ modUtils) {
    const { replace, replaceOne, replaceRawCode, safeDictionary, matchOne, matchRawCode, escapeRegExp } = modUtils;

    // Constants for easy usage of otherwise long variable access expressions
    const dict = safeDictionary;
    const playerId = `${dict.game}.${dict.playerId}`;
    const rawPlayerNames = `${dict.playerData}.${dict.rawPlayerNames}`;
    const gIsSingleplayer = `${dict.game}.${dict.gIsSingleplayer}`;

    // Replace assets
    replaceOne(/(\(4,"crown",4,")[^"]+"\),/g, "$1" + assets.crownIcon + "\"),");
    replaceOne(/(\(6,"territorial\.io",6,")[^"]+"\),/g, "$1" + assets.fxClientLogo + "\"),");
    replaceOne(/(\(22,"logo",8,")[^"]+"\)/g, "$1" + assets.smallLogo + "\")");

    // Add update information
    replaceRawCode(`new k("🚀 New Game Update","The game was updated! Please reload the game. An internet connection is required.",!0,[`,
        `new k("🚀 New Game Update","The game was updated! Please reload the game. An internet connection is required."
        + "<div style='border: white; border-width: 1px; border-style: solid; margin: 10px; padding: 5px;'><h2>ZFX Client is not yet compatible with the latest version of the game.</h2><p>Updates should normally be available within a few hours.<br>You can still use ZFX in singleplayer mode.</p></div>",!0,[`
    );

    // Max size for custom maps: from 4096x4096 to 8192x8192
    // TODO: test this; it might cause issues with new boat mechanics?

    { // Add Troop Density and Maximum Troops in side panel
        const { valuesArray } = replaceRawCode(`,labels[5]=__L(0,"Interest"),labels[6]=__L(),labels[7]=__L(),(truncatedLabels=new Array(labels.length)).fill(""),(valuesArray=new Array(labels.length))[0]=game.io?`,
            `,labels[5]=__L(0,"Interest"),labels[6]=__L(),labels[7]=__L(),
		labels.push("Max Troops", "Density"), // add labels
		(truncatedLabels=new Array(labels.length)).fill(""),(valuesArray=new Array(labels.length))[0]=game.io?`);
        replaceOne(new RegExp(/(:(?<valueIndex>\w+)<7\?\w+\.\w+\.\w+\(valuesArray\[\2\]\)):(\w+\.\w+\(valuesArray\[7\]\))}/
            .source.replace(/valuesArray/g, valuesArray), "g"),
            '$1 : $<valueIndex> === 7 ? $3 '
            + `: $<valueIndex> === 8 ? __fx.utils.getMaxTroops(${dict.playerData}.${dict.playerTerritories}, ${playerId}) `
            + `: __fx.utils.getDensity(${playerId}) }`);
        // increase the size of the side panel by 25% to make the text easier to read
        replaceOne(/(this\.\w+=Math\.floor\(\(\w+\.\w+\.\w+\(\)\?\.1646:\.126\))\*(\w+\.\w+\),)/g, "$1 * 1.25 * $2");
    }

    // Increment win counter on wins
    replaceRawCode(`=function(sE){a8.gD[sE]&&(o.ha(sE,2),b.h9<100?xD(0,__L([a8.jx[sE]]),3,sE,ad.gN,ad.kl,-1,!0):xD(0,__L([a8.jx[sE]]),3,sE,ad.gN,ad.kl,-1,!0))`,
        `=function(sE){
		if (${playerId} === sE && !${gIsSingleplayer} && !${dict.game}.${dict.gIsReplay})
			__fx.wins.count++, window.localStorage.setItem("fx_winCount", __fx.wins.count),
			xD(0,"Your Win Count is now " + __fx.wins.count,3,sE,ad.gN,ad.kl,-1,!0);
		a8.gD[sE]&&(o.ha(sE,2),b.h9<100?xD(0,__L([a8.jx[sE]]),3,sE,ad.gN,ad.kl,-1,!0):xD(0,__L([a8.jx[sE]]),3,sE,ad.gN,ad.kl,-1,!0))`);


    { // Add settings button and custom lobby button
        // add buttons
        replaceRawCode(`,new nQ("☰<br>"+__L(),function(){aD6(3)},aa.ks),new nQ("",function(){at.d5(12)},aa.kg,!1)]`,
            `,new nQ("☰<br>"+__L(),function(){aD6(3)},aa.ks),new nQ("",function(){at.d5(12)},aa.kg,!1),
            new nQ("ZFX Client settings", function() { if(typeof __fx.openVueSettings==="function")__fx.openVueSettings();else __fx.WindowManager.openWindow("settings"); }, "rgba(0, 0, 20, 0.5)"),
            new nQ("Join/Create custom lobby", function() { __fx.customLobby.showJoinPrompt(); }, "rgba(20, 9, 77, 0.5)")]`)
        // set position
        replaceRawCode(`aZ.g5.vO(aD3[3].button,x+a0S+gap,a3X+h+gap,a0S,h);`,
            `aZ.g5.vO(aD3[3].button,x+a0S+gap,a3X+h+gap,a0S,h);
            aZ.g5.vO(aD3[5].button, x, a3X + h * 2 + gap * 2, a0S * 2 + gap, h / 3);
            aZ.g5.vO(aD3[6].button, x, a3X + h * 2.33 + gap * 3, a0S * 2 + gap, h / 3);`);
    }

    { // Keybinds
        // match required variables
        const { 0: match, groups: { attackBarObject, setRelative } } = matchOne(/:\w+\.\w+\(\w+,8\)\?(?<attackBarObject>\w+)\.(?<setRelative>\w+)\(32\/31\):/g);
        // create a setAbsolutePercentage function on the attack percentage bar object,
        // and also register the keybind handler functions
        replaceOne(/}(function \w+\((\w+)\){return!\(1<\2&&1===(?<attackPercentage>\w+)\|\|\(1<\2&&\2\*\3-\3<1\/1024\?\2=\(\3\+1\/1024\)\/\3:\2<1)/g,
            "} this.setAbsolutePercentage = function(newPercentage) { $<attackPercentage> = newPercentage; }; "
            + "__fx.keybindFunctions.setAbsolute = this.setAbsolutePercentage; "
            + `__fx.keybindFunctions.setRelative = (arg1) => ${attackBarObject}.${setRelative}(arg1); $1`);
        // insert keybind handling code into the keyDown handler function
        replaceOne(new RegExp(/(function \w+\((?<event>\w+)\){)([^}]+matched)/g.source.replace(/matched/g, escapeRegExp(match)), "g"),
            "$1 if (__fx.keybindHandler($<event>.key)) return; $3");
    }

    // Custom starting attack percentage
    replaceRawCode(`il=(bm.eU.data[182].value+1)/1024`,
        `il = __fx.settings.startingPercentageEnabled ? (__fx.settings.startingPercentage || 50) / 100 : (bm.eU.data[182].value+1)/1024`)

    // Set the default font to Trebuchet MS
    replace(/sans-serif"/g, 'Trebuchet MS"');

    // Realistic bot names setting
    // matches c4[i] = c4[i].replace(a6U[dx], a6V[dx])
    replaceOne(/(((\w+)\[\w+\])=\2\.replace\(\w+(\[\w+\]),\w+\4\))/g, "$1; if (__fx.settings.realisticNames) $3 = realisticNames;")

    // Hide all links in main menu depending on settings
    //replaceOne(/(this\.\w+=function\(\){)((\w+\.\w+)\[2\]=\3\[3\]=\3\[4\]=(?<linksHidden>!this\.\w+\.\w+),)/g,
    //"$1 if (settings.hideAllLinks) $3[0] = $3[1] = $<linksHidden>; else $3[0] = $3[1] = true; $2")

    // Clear canvas background if a custom background is being used
    replaceRawCode(`,this.qk=function(){var a4n,a4m;aq.pd?(a4m=aL.gA/aq.eE,a4n=aL.gF/aq.eF,canvas.setTransform(a4m=a4n<a4m?a4m:a4n,0,0,a4m,`,
        `,this.qk=function(){var a4n,a4m;
        if (__fx.makeMainMenuTransparent) canvas.clearRect(0,0,aL.gA,aL.gF);
        else aq.pd?(a4m=aL.gA/aq.eE,a4n=aL.gF/aq.eF,canvas.setTransform(a4m=a4n<a4m?a4m:a4n,0,0,a4m,`);

    // Track donations
    replaceOne(/(this\.\w+=function\((\w+),(\w+)\)\{)(\2===\w+\.\w+&&\(\w+\.\w+\((\w+\.\w+)\[0\],\5\[1\],\3\),this\.(\w+)\[12\]\+=\5\[1\],this\.\6\[16\]\+=\5\[0\]\),\3===\w+\.\w+&&\()/g,
        `$1 __fx.donationsTracker.logDonation($2, $3, $5[0], ${dict.sidebar}.${dict.getTime}()); $4`)


    // Detailed team pie chart percentage
    replaceRawCode(`qr=Math.floor(100*f0+.5)+"%"`,
        `qr = (__fx.settings.detailedTeamPercentage ? (100*f0).toFixed(2) : Math.floor(100*f0+.5)) + "%"`)
    replaceRawCode(",fontSize=+dz*Math.min(f0,.37);", ",fontSize=(__fx.settings.detailedTeamPercentage ? 0.75 : 1)*dz*Math.min(f0,.37);")

    // Reserve the sidebar width in the game's logical viewport and keep mouse/touch coordinates aligned.
    replaceOne(/document\.body\.firstChild/g, 'document.getElementById("fx-game-shell").firstChild');
    const { socketManager, closeConnections } = matchOne(
        /(?<socketManager>\w+\.\w+)\.(?<closeConnections>\w+)\(3260\)/g
    ).groups;
    const { isConnectedMethod } = matchOne(
        /this\.(?<isConnectedMethod>\w+)=function\(\w+\)\{return \w+\[\w+\]\.\w+&&\w+\[\w+\]\.\w+\(\);?\}/g
    ).groups;
    const socketActivePattern = /function (?<activeSocketMethod>\w+)\((?<socketIndex>\w+)\)\{return \w+\[\k<socketIndex>\]\.\w+&&\w+\[\k<socketIndex>\]\.\w+\(\)\}/g;
    const { activeSocketMethod } = matchOne(socketActivePattern).groups;
    replaceOne(socketActivePattern, `$&;window.__fx.isSocketActive=id=>${activeSocketMethod}(id)`);
    const socketCloseHandlerPattern = /this\.(?<handler>\w+)=function\((?<socketIndex>\w+),(?<errorCode>\w+)\)\{(?=if\(console\.log\("socket close index "\+\k<socketIndex>\+" error "\+\k<errorCode>\),)/g;
    const { errorCode } = matchOne(socketCloseHandlerPattern).groups;
    replaceOne(
        socketCloseHandlerPattern,
        `$&if(${errorCode}===4215&&__fx.multiplayerRetryAvailableUntil>Date.now()){__fx.multiplayerRetryAvailableUntil=0;${socketManager}.${closeConnections}(3260);__fx.multiplayerResetUntil=Date.now()+1000;__fx.multiplayerStartPending=true;setTimeout(()=>{__fx.multiplayerStartPending=false;__fx.startMultiplayer(true)},1050);return;}`
    );
    const homeMethodPattern = /this\.(?<homeMethod>\w+)=function\(\)\{(?<menuManager>\w+)\.(?<menuStateMethod>\w+)\(5,5\)\}/g;
    const { menuManager, menuStateMethod } = matchOne(homeMethodPattern).groups;
    const menuStateFieldPattern = new RegExp(
        `this\\.${menuStateMethod}=function\\((?<stateArgument>\\w+)[^)]*\\)\\{(?<setterBody>[^}]*?this\\.tZ\\(\\)[^}]*?this\\.(?<menuStateField>\\w+)===\\k<stateArgument>)`, "g"
    );
    const stateFieldMatches = [...modUtils.script.matchAll(menuStateFieldPattern)];
    if (stateFieldMatches.length !== 1) throw new Error(`Expected one native menu state field, found ${stateFieldMatches.length}.`);
    const { menuStateField } = stateFieldMatches[0].groups;
    replaceOne(
        homeMethodPattern,
        `$&,(()=>{let attempts=0;const install=()=>{if(window.__fx?.installNativeLobbyRouteObserver?.(${menuManager},${JSON.stringify(menuStateMethod)},${JSON.stringify(menuStateField)}))return;if(++attempts<120)setTimeout(install,250)};install()})();window.__fx.openHome=()=>{${socketManager}.${closeConnections}(3260);__fx.multiplayerResetUntil=Date.now()+1000;this.$<homeMethod>()}`
    );
    const accountMenuButtonsPattern = /for\(var (?<index>\w+)=0;\k<index><(?<buttons>\w+)\.length;\k<index>\+\+\)\k<buttons>\[\k<index>\]\.button\.style\.position="absolute";/g;
    const { buttons: accountMenuButtons } = matchOne(accountMenuButtonsPattern).groups;
    const homeNameInputPattern = /(?<nameInput>\w+)\s*=\s*new\s+\w+\(\s*(?<settingsBuffer>\w+)\.buffer\.data\[122\]\s*\)\s*;/g;
    const { nameInput, settingsBuffer } = matchOne(homeNameInputPattern).groups;
    replaceOne(homeNameInputPattern, `$&window.__fx.getNativeHomeNameInput=()=>${nameInput}.e;window.__fx.getNativeAccountId=()=>${settingsBuffer}.buffer.data[105]?.value||"";window.__fx.getNativeGameLabel=id=>L(id);window.__fx.setNativeHomeName=value=>{var input=${nameInput}.e;if(!input)return false;input.value=String(value).slice(0,20);input.dispatchEvent(new Event("blur"));return true};window.__fx.gameSettingsAdapter={getSnapshot:function(){var langs=bA.data.aEe();var values={};[1,2,5,7,8,9,11,12,13,14,15,16].forEach(function(id){values[id]=bm.buffer.data[id]?.value;});var languageOptions=langs.map(function(entry){var parts=String(entry).split(":");return{value:parts[0],label:parts.slice(1).join(":")||parts[0]};});return{values:values,connection:aa.aIM,options:{language:languageOptions,resolution:[L(455),L(456),L(457),L(458)],minimumFont:[L(456),L(460),L(461)],textSpeed:[L(463),L(9),L(464)],connection:[L(473),L(474),L(475)]},labels:{information:L(452),informationNote:L(453),resolution:L(454),minimumFont:L(459),textSpeed:L(462),largeUi:L(465),placeBalance:L(466),hideZoom:L(467),font:L(468),messageBox:L(469),keepClosed:L(470),muted:L(471),connection:L(472),highlighting:L(476),intensity:L(477),shortcuts:L(478),reset:L(451),close:L(40)},shortcutGroups:(ba.aV2||[]).map(function(label,index){return{label:label,keys:[{index:index*2,value:ba.aDw[index*2]||""},{index:index*2+1,value:ba.aDw[index*2+1]||""}]};})};},setField:function(id,value){if(!bm.buffer.data[id])return false;bm.qo.qp(id,value);return true;},setConnection:function(value){aa.aIM=Number(value)||0;},setShortcut:function(index,value){ba.aV4(index,String(value||""));},resetShortcuts:function(){ba.aV1();},reset:function(){bm.qo.xw();}};`);
    const { openMenuAction } = matchOne(
        /function (?<openMenuAction>\w+)\(\w+\)\{\w+\.\w+\.setState\(10\)/g
    ).groups;
    replaceOne(accountMenuButtonsPattern, `$&__fx.openAccount=function(){${accountMenuButtons}[2].button.click()};__fx.openCustomScenario=function(){${accountMenuButtons}[1].button.click()};__fx.openGameMenu=function(){${accountMenuButtons}[3].button.click()};__fx.isMultiplayerConnected=()=>__fx.isSocketActive(0)&&${socketManager}.${isConnectedMethod}(0);__fx.reconnectMultiplayer=function(){if(!__fx.isMultiplayerConnected())return false;if(__fx.multiplayerStartPending)return true;__fx.multiplayerRetryAvailableUntil=0;${socketManager}.${closeConnections}(3260);__fx.multiplayerResetUntil=Date.now()+1000;__fx.multiplayerStartPending=true;setTimeout(()=>{__fx.multiplayerStartPending=false;__fx.startMultiplayer(true)},1050);return true};__fx.startMultiplayer=function(isRetry){if(__fx.multiplayerStartPending)return;if(!isRetry)__fx.multiplayerRetryAvailableUntil=Date.now()+10000;var wait=__fx.multiplayerResetUntil-Date.now();if(wait>0){__fx.multiplayerStartPending=true;setTimeout(()=>{__fx.multiplayerStartPending=false;__fx.startMultiplayer(isRetry)},wait+50);return;}if(__fx.isSocketActive(0)){if(${socketManager}.${isConnectedMethod}(0))${accountMenuButtons}[0].button.click();return;}${accountMenuButtons}[0].button.click()};__fx.openGameMenuAction=function(key){${openMenuAction}(3);__fx.gameMenuActions?.[key]?.()};`);
    const gameMenuActionsPattern = /(?<buttons>\w+)\s*=\s*\[new\s+x\(L\(481\),[\s\S]*?\](?=\s*,\s*\w+\s*=\s*\[)/g;
    const { buttons: gameMenuButtons } = matchOne(gameMenuActionsPattern).groups;
    replaceOne(
        gameMenuActionsPattern,
        `$&,window.__fx.runSidebarGameMenuAction=(key,labelId)=>{var label=L(labelId);var item=${gameMenuButtons}.find(entry=>entry.button.textContent.includes(label));if(!item){console.error("[ZFX Client] Sidebar menu action is unavailable after a game update:",key);return false;}item.button.click();return true;};window.__fx.gameMenuActions={leaderboard:()=>__fx.runSidebarGameMenuAction("leaderboard",368),logs:()=>__fx.runSidebarGameMenuAction("logs",418),replays:()=>__fx.runSidebarGameMenuAction("replays",444),goldTransfer:()=>__fx.runSidebarGameMenuAction("goldTransfer",483),settings:()=>__fx.runSidebarGameMenuAction("settings",450)}`
    );
    const { viewportWidth, viewportHeight, dimension } = matchOne(
        /(?<viewportWidth>\w+)=(?<dimension>\w+)\(document\.documentElement\.clientWidth\)(?=,(?<viewportHeight>\w+)=\k<dimension>\(window\.visualViewport)/g
    ).groups;
    replaceOne(
        new RegExp(`${viewportWidth}=${dimension}\\(document\\.documentElement\\.clientWidth\\)`, "g"),
        `${viewportWidth}=Math.max(128,${dimension}(document.documentElement.clientWidth)-(__fx.sidebar?.getWidth?.()||0))`
    );

    replaceOne(
        new RegExp(`(?<canvas>\\w+)\\.style\\.width=${viewportWidth}\\+"px"[,;](?=\\k<canvas>\\.style\\.height=${viewportHeight}\\+"px")`, "g"),
        '$<canvas>.style.left="0px",$&'
    );

    replaceOne(
        /this\.(?<resizeMethod>\w+)=function\((?<resizeArg>\w+)\)\{by=!0,resize\(\k<resizeArg>\)\}/g,
        "$&,(()=>{const handler=()=>resize(0);let attempts=0;const attach=()=>{if(__fx.sidebar?.setResizeHandler){__fx.sidebar.setResizeHandler(handler);return}if(++attempts<100)setTimeout(attach,50)};attach()})()"
    );

    const { scaleObject, scaleField } = matchOne(
        /\w+=Math\.floor\(\.5\+\w+\*(?<scaleObject>\w+)\.(?<scaleField>\w+)\),\w+=Math\.floor\(\.5\+\w+\*\k<scaleObject>\.\k<scaleField>\)/g
    ).groups;
    const scaleExpression = `${scaleObject}\\.${scaleField}\\*`;
    replaceRequired(
        modUtils,
        new RegExp(`${scaleExpression}(\\w+)\\.touches\\[(\\d+)\\]\\.clientX`, "g"),
        (_match, event, touchIndex) => `${scaleObject}.${scaleField}*(__fx.sidebar?.toGameX?.(${event}.touches[${touchIndex}],${event})??${event}.touches[${touchIndex}].clientX)`,
        "touch coordinate mapping"
    );
    replaceRequired(
        modUtils,
        new RegExp(`${scaleExpression}(\\w+)\\.clientX`, "g"),
        (_match, event) => `${scaleObject}.${scaleField}*(__fx.sidebar?.toGameX?.(${event})??${event}.clientX)`,
        "mouse coordinate mapping"
    );

    console.log('Removing ads...');
    // Remove ads
    replace('//api.adinplay.com/libs/aiptag/pub/TRT/territorial.io/tag.min.js', '');
}
