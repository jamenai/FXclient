import { definePatch, insert } from "../modUtils.js";

export default definePatch(({ matchCode, insertCode, modifyCode, matchRawCode, replaceRawCode, replaceOne, waitForMinification }) => {

    replaceRawCode(
        "function aEP(){var s1=bm.buffer.data[12].value;",
        "function aEP(){if(window.__fx){window.__fx.getGameLanguage=function(){return bm.buffer.data[12].value;};window.__fx.sidebar?.refreshTranslations?.();window.dispatchEvent(new CustomEvent('fx-game-language-change',{detail:{language:bm.buffer.data[12].value}}));}var s1=bm.buffer.data[12].value;"
    );

    replaceRawCode(
        `var packetType=reader.readBits(6);if(packetType===0){`,
        `if(!window.__fx.setNativeLobbyChatMode)window.__fx.setNativeLobbyChatMode=function(mode){var token=window.__fx.lobbyChatActivationToken=(window.__fx.lobbyChatActivationToken||0)+1;var started=Date.now();window.__fx.lobbyChatActivationStatus="requested:"+mode;var sendMode=()=>{if(token!==window.__fx.lobbyChatActivationToken)return;var manager=b1;if(!manager||!manager.z||!manager.aGx||!manager.aGx.aGy||!manager.z.ef(manager.z.f7)){window.__fx.lobbyChatActivationStatus="waiting:"+mode;if(mode===0&&Date.now()-started<60000){setTimeout(sendMode,250);return;}window.__fx.lobbyChatActivationStatus="inactive:"+mode;return;}window.__fx.lobbyChatActivationStatus="sent:"+mode;__fx.lobbyChatFeed?.observeChatModeCommand(mode);manager.aGx.aGy(mode);};sendMode();};if(!window.__fx.getLobbyChatSenderName)window.__fx.getLobbyChatSenderName=function(senderId){var player=bq&&bq.lj&&bq.z&&bq.lj.aFe?bq.lj.aFe(bq.z.tM[0],senderId):null;if(!player&&bq&&bq.vg&&Array.isArray(bq.vg.aFE)){for(var index=bq.vg.aFE.length-1;index>=0;index--){if(bq.vg.aFE[index].uY===senderId){player=bq.vg.aFE[index];break;}}}return player&&player.username||null;};if(!window.__fx.getLobbyChatSenderColor)window.__fx.getLobbyChatSenderColor=function(senderId){var player=bq&&bq.lj&&bq.z&&bq.lj.aFe?bq.lj.aFe(bq.z.tM[0],senderId):null;if(!player&&bq&&bq.vg&&Array.isArray(bq.vg.aFE)){for(var index=bq.vg.aFE.length-1;index>=0;index--){if(bq.vg.aFE[index].uY===senderId){player=bq.vg.aFE[index];break;}}}return player&&bq.lj&&bq.lj.vm?bq.lj.vm(player.vn):null;};if(!window.__fx.resolveLobbyChatMention)window.__fx.resolveLobbyChatMention=function(shortId){var userId=bJ.f0.f1(shortId,5);var player=bq&&bq.vg&&bq.vg.aFe?bq.vg.aFe(userId):null;if(!player&&bq&&bq.vg&&Array.isArray(bq.vg.aFE)){for(var index=bq.vg.aFE.length-1;index>=0;index--){if(bq.vg.aFE[index].uY===userId){player=bq.vg.aFE[index];break;}}}if(!player&&bq&&bq.vg&&bq.vg.aFK)player=bq.vg.aFK(userId,shortId,1,999999,999999,0,0,0,0,1);return player&&player.username||null;};if(!window.__fx.resolveLobbyChatMentionColor)window.__fx.resolveLobbyChatMentionColor=function(shortId){var userId=bJ.f0.f1(shortId,5);var player=bq&&bq.vg&&bq.vg.aFe?bq.vg.aFe(userId):null;if(!player&&bq&&bq.vg&&Array.isArray(bq.vg.aFE)){for(var index=bq.vg.aFE.length-1;index>=0;index--){if(bq.vg.aFE[index].uY===userId){player=bq.vg.aFE[index];break;}}}if(!player&&bq&&bq.vg&&bq.vg.aFK)player=bq.vg.aFK(userId,shortId,1,999999,999999,0,0,0,0,1);return player&&bq.lj&&bq.lj.vm?bq.lj.vm(player.vn):null;};var packetType=reader.readBits(6);__fx.lobbyChatFeed?.observeSocketPacket(packetType);if(packetType===0){`
    );

    // Mirror the original lobby notification queue into an event the custom
    // lobby can render with its own styling.
    replaceRawCode(
        `var sC=bq.lj.tT(aG2,bq.lj.tU(aG2));`,
        `var sC=bq.lj.tT(aG2,bq.lj.tU(aG2));if(window.__fx)window.__fx.getLobbyNotificationHistory=function(){return bq.message.aGG().map(function(notification,index){return {index:index,id:notification.id,text:bq.lj.tT(notification,bq.lj.tU(notification)).s};});};if(aG2.id!==6&&sC)window.dispatchEvent(new CustomEvent("fx-lobby-notification",{detail:{id:aG2.id,index:bq.message.aGG().indexOf(aG2),text:sC.s}}));`
    );

    // The original message manager renders its notification corner directly.
    // Keep the queue intact for Vue, but close both native notification panels
    // whenever the custom lobby is active.
    const nativeLobbyNotification = `window.__fx&&window.__fx.settings&&window.__fx.settings.customLobbyView===true&&window.__fx.getGameVar("gameState")!==1`;
    replaceRawCode(
        `aH3.show(aH4[aH5]);`,
        `(${nativeLobbyNotification})?(aH3.vx(),aH3=null):aH3.show(aH4[aH5]);`,
        { aH3: "aH3", aH4: "aH4", aH5: "aH5" }
    );
    replaceRawCode(
        `aH3.show();`,
        `(${nativeLobbyNotification})?(aH3.vx(),aH3=null):aH3.show();`,
        { aH3: "aH3", show: "show" }
    );

    // Tap only the incoming room-chat packet parser. The surrounding room lookup,
    // chat-id update and room refresh make this push unique to socket room chat.
    waitForMinification(() => replaceOne(
        /tP\.push\(aHs\)/g,
        `tP.push(aHs);__fx.lobbyChatFeed?.observeSocketEntry(aHs);if(aHs&&aHs.id===0&&typeof aHs.s==="string")__fx.lobbyChatFeed?.publish({id:"room:"+tL+":"+(tP.length-1),text:aHs.s,senderId:aHs.uY})`
    ));

    matchCode(`function LobbyRoom() {
        this.lobbyRoomState = 0;
        this.lobbyRoomMap = 0;
        this.lobbyRoomMapSeed = 0;
        this.lobbyRoomMode = 0;
        this.lobbyRoomNextMap = 0;
        this.lobbyRoomNextMapSeed = 0;
        this.lobbyRoomNextMode = 0;
        this.lobbyRoomIsContest = 0;
        this.lobbyRoomTimeLeft = 0;
        this.lobbyRoomSpawningSeed = 0;
        this.lobbyRoomPlayerIndex = 0;
        this.lobbyRoomTeamOffset = 0;
        this.lobbyRoomChatLog = [];
        this.lobbyRoomChatId = 1048575;
        /*...*/
    }`, {
        addToDictionary: ["lobbyRoomState", "lobbyRoomMap", "lobbyRoomMode", "lobbyRoomNextMap", "lobbyRoomNextMode",
            "lobbyRoomIsContest", "lobbyRoomTimeLeft", "lobbyRoomChatLog", "lobbyRoomChatId"]
    })

    matchCode(`function getMapName(mapIndex, unusedMapSeed) { return mapHolder.mapInfo.mapNames[mapIndex] }`,
        { addToDictionary: ["mapHolder", "mapInfo", "mapNames"] })

    const { container, pushMessage, messageTextField } = matchRawCode(
        `resultText=formatList(entries," is"," are"," in the lobby.");if(resultText.length){container.message.pushMessage({id:7,messageTextField:resultText})}list1=[];list2=[];counter=0}`
    )

    insertCode(`this.di = function () {
        for (var index = 0; index < this.lobbyRooms.length; index++) { this.lobbyRooms[index] = new LobbyRoom }
        this.lobbySelection[0] = settingsHolder.userSettings.data[158].value
        /* here */
    }`, `__fx.lobbyReminders.setLobbySource(this.lobbyRooms, this.lobbySelection);
    __fx.lobbyReminders.setPopupHandler(function (text) { bq.message.aEd({ id: 7, s: text }); });`,
        { dictionary: { bq: container, aEd: pushMessage, s: messageTextField } })

    modifyCode(`this.onFullLobbyUpdate = function () {
        updateLobbyUI(true);
        lobbyManager.joinTracker.di();
        ${insert(`__fx.lobbyReminders.check();`)}
    };
    this.onLobbyUpdate = function () {
        lobbyManager.joinTracker.onLobbyUpdate();
        updateRoomTimers();
        updateLobbyUI(false);
        ${insert(`__fx.lobbyReminders.check();`)}
    }`)

    insertCode(`/* here */
    function replayPendingSound() { pendingSoundCount++; notificationSound.play() }
    this.play = function () {
        if (!soundsLoaded) { return }
        var timeNow = performance.now();
        /*...*/
    }`, `__fx.lobbyReminders.setSound(function () { notificationSound.play(); });`)
})
