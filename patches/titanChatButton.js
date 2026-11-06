import { definePatch } from "../modUtils.js";

export default definePatch(({ matchRawCode, replaceRawCode }) => {
    const { method: sendMethod } = matchRawCode(
        `root.parent.child.input.value="";processor.handler.method(message)`
    );

    replaceRawCode(
        `var pendingState=0;var previousMessage="";var stateA=0;var stateB=0;var stateC=0;`,
        `var pendingState=0;var previousMessage="";var stateA=0;var stateB=0;var stateC=0;
        this.sendClanJoinMessage=function(clanTag){
            this.sendMethod("@["+clanTag+"] join");
            if(pendingState){this.sendMethod("yes");}
        };
        this.sendClanMessage=function(clanTag,message){
            if(typeof clanTag!=="string"||!clanTag.trim()||typeof message!=="string"||!message.trim())return;
            this.sendMethod("@["+clanTag+"] "+message.trim());
            if(pendingState){this.sendMethod("yes");}
            return true;
        };
        window.__fx.sendLobbyMessage=function(message){
            if(typeof message!=="string"||!message.trim())return false;
            this.sendMethod(message);
            return true;
        }.bind(this);
        window.__fx.sendClanJoinMessage=function(clanTag){this.sendClanJoinMessage(clanTag);}.bind(this);
        window.__fx.sendClanMessage=function(clanTag,message){return this.sendClanMessage(clanTag,message);}.bind(this);`,
        { sendMethod }
    );
});
