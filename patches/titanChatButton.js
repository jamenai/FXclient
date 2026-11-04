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
        window.__fx.sendClanJoinMessage=function(clanTag){this.sendClanJoinMessage(clanTag);}.bind(this);`,
        { sendMethod }
    );
});
