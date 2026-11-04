import { getVar } from "./gameInterface.js";
import { getSettings } from "./settings.js";
import hoveringTooltip from "./hoveringTooltip.js";
import replayHistory from "./replayHistory.js";

const replay = {
    totalTicks: 0,
    seekTarget: null,
    restoreState: null,
    isRestarting: false,
    tick: 0,
    hooks: null,
    controls: null,
    togglePlayPause: () => {},
    restartReplay: () => {},

    registerHooks(hooks) {
        this.hooks = hooks;
        this.tick = 0;
        if (!this.isRestarting) this.seekTarget = this.restoreState = null;
        this.isRestarting = false;
    },

    isWatching() {
        return Boolean(getVar("gIsReplay") && getVar("gameState") !== 0);
    },

    getTotalTicks() {
        const flags = getVar("tickFlags"), counts = getVar("tickCounts");
        if (!counts) return 0;
        if (counts !== this.countedEntries) {
            this.countedEntries = counts;
            this.totalTicks = 0;
            for (let i = 0; i < counts.length; i++) this.totalTicks += flags[i] ? 1 : counts[i];
        }
        return this.totalTicks;
    },

    getTickDuration() {
        const interval = this.hooks ? this.hooks.getTickInterval() : 56;
        return getVar("gSelectableSpawn") && !getVar("gIsSingleplayer") ? interval * 7 : interval;
    },

    seek(targetTick) {
        if (!this.isWatching() || !this.hooks) return;
        this.seekTarget = Math.max(0, Math.min(Math.round(targetTick), this.getTotalTicks()));
        if (this.seekTarget >= this.tick) return;
        if (!this.restoreState) this.restoreState =
            { playing: this.controls.fxIsPlaying(), speed: this.controls.fxGetSpeedIndex() };
        this.isRestarting = true;
        this.restartReplay();
    },

    frame() {
        if (this.seekTarget === null) return false;
        const hooks = this.hooks;
        const deadline = performance.now() + 40;
        while (this.tick < this.seekTarget && !hooks.isEnded() && performance.now() < deadline)
            hooks.advance();
        hooks.finishTick();
        hooks.requestRedraw();
        if (this.tick < this.seekTarget && !hooks.isEnded()) return true;
        this.seekTarget = null;
        const restore = this.restoreState;
        if (restore) {
            this.restoreState = null;
            this.controls.fxSetSpeedIndex(restore.speed);
            if (restore.playing && !hooks.isEnded() && !this.controls.fxIsPlaying()) this.togglePlayPause();
        }
        return true;
    }
};

function createElement(tag, className, parent) {
    const element = document.createElement(tag);
    element.className = className;
    parent.append(element);
    return element;
}

let disposeReplayTimebar = null;

export function initializeReplayTimebar() {
    if (disposeReplayTimebar) return disposeReplayTimebar;

    const bar = createElement("div", "flex d-none", document.getElementById("windowContainer"));
    bar.id = "replayTimebar";
    const currentTime = createElement("span", "replay-time", bar);
    const track = createElement("div", "replay-track", bar);
    const totalTime = createElement("span", "replay-time color-light-gray", bar);
    const fill = createElement("div", "replay-fill", track);
    const marker = createElement("div", "replay-target d-none", track);
    const markerLayer = createElement("div", "fx-replay-markers", track);
    markerLayer.style.cssText = "position:absolute;inset:0;pointer-events:none";
    const bookmarkButton = createElement("button", "fx-replay-bookmark", bar);
    bookmarkButton.type = "button";
    bookmarkButton.textContent = window.__fx?.translateFX?.("addReplayNote") ?? "Add note";
    bookmarkButton.style.cssText = "flex:0 0 auto;padding:.2em .4em;border:1px solid rgba(255,255,255,.4);border-radius:3px;background:rgba(0,0,0,.35);color:inherit;font:inherit;font-size:.8em;cursor:pointer";

    let drag = null;
    let active = true;
    let frameId = 0;
    let activeReplayTimestamp = null;
    let activeMarkers = [];
    let markerTotal = -1;
    const trackFraction = event => {
        const rect = track.getBoundingClientRect();
        if (!rect.width) return 0;
        const fraction = (event.clientX - rect.left) / rect.width;
        return fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
    };
    const onPointerDown = event => {
        if (!replay.isWatching()) return;
        event.preventDefault();
        track.setPointerCapture(event.pointerId);
        drag = trackFraction(event);
    };
    const onPointerMove = event => {
        if (drag !== null) drag = trackFraction(event);
    };
    const onPointerUp = event => {
        if (drag === null) return;
        drag = null;
        replay.seek(trackFraction(event) * replay.getTotalTicks());
    };
    const onPointerCancel = () => { drag = null; };
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", onPointerUp);
    track.addEventListener("pointercancel", onPointerCancel);

    const formatTime = time => {
        let seconds = Math.floor(time / 1000);
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
        return minutes + (seconds < 10 ? ":0" : ":") + seconds;
    };

    function renderMarkers(total) {
        markerLayer.replaceChildren();
        markerTotal = total;
        if (!total) return;
        for (const replayMarker of activeMarkers) {
            const markerButton = document.createElement("button");
            markerButton.type = "button";
            markerButton.style.cssText = `position:absolute;top:50%;left:${Math.min(replayMarker.tick / total, 1) * 100}%;width:8px;height:18px;padding:0;transform:translate(-50%,-50%);border:0;border-radius:2px;background:#ffd166;pointer-events:auto;cursor:pointer`;
            markerButton.title = `${formatTime(replayMarker.timeMs ?? replayMarker.tick * replay.getTickDuration())} - ${replayMarker.note}`;
            markerButton.setAttribute("aria-label", markerButton.title);
            markerButton.addEventListener("pointerdown", event => event.stopPropagation());
            markerButton.addEventListener("click", event => {
                event.stopPropagation();
                replay.seek(replayMarker.tick);
            });
            markerLayer.append(markerButton);
        }
    }

    bookmarkButton.addEventListener("click", () => {
        const timestamp = replayHistory.getActiveReplayTimestamp();
        if (timestamp === null) {
            alert(window.__fx?.translateFX?.("loadSavedReplayForNotes") ?? "Load a saved replay before adding notes.");
            return;
        }
        const timeMs = replay.tick * replay.getTickDuration();
        const note = prompt(
            (window.__fx?.translateFX?.("replayNotePrompt") ?? "Note for") + ` ${formatTime(timeMs)}:`,
        );
        if (note === null) return;
        if (!replayHistory.addMarker(timestamp, replay.tick, note, timeMs)) {
            alert(window.__fx?.translateFX?.("replayNoteLimitReached") ?? "The note is empty or the replay already has 100 notes.");
            return;
        }
        activeMarkers = replayHistory.getMarkers(timestamp);
        markerTotal = -1;
    });

    function updateBar() {
        if (!active) return;
        frameId = requestAnimationFrame(updateBar);
        const visible = getSettings().showReplayTimebar && replay.isWatching() && !getVar("uiHidden");
        bar.classList.toggle("d-none", !visible);
        const replayTimestamp = replayHistory.getActiveReplayTimestamp();
        bookmarkButton.disabled = replayTimestamp === null;
        bookmarkButton.style.opacity = bookmarkButton.disabled ? ".5" : "1";
        bookmarkButton.title = bookmarkButton.disabled
            ? (window.__fx?.translateFX?.("loadSavedReplayForNotes") ?? "Load a saved replay before adding notes.")
            : "";
        if (replayTimestamp !== activeReplayTimestamp) {
            activeReplayTimestamp = replayTimestamp;
            activeMarkers = activeReplayTimestamp === null ? [] : replayHistory.getMarkers(activeReplayTimestamp);
            markerTotal = -1;
        }
        if (!visible) {
            drag = null;
            return;
        }
        const panelTop = replay.controls && replay.controls.fxGetPanelTop();
        const scale = hoveringTooltip.canvasPixelScale || window.devicePixelRatio || 1;
        if (panelTop > 0) bar.style.bottom = Math.max(0, Math.round(window.innerHeight - panelTop / scale) + 8) + "px";

        const total = replay.getTotalTicks();
        if (markerTotal !== total) renderMarkers(total);
        const seeking = replay.seekTarget !== null && total !== 0;
        let fraction = total ? Math.min(replay.tick / total, 1) : 0;
        if (drag !== null) fraction = drag;

        fill.style.width = (fraction * 100).toFixed(2) + "%";
        bar.classList.toggle("seeking", seeking);
        marker.classList.toggle("d-none", !seeking);
        if (seeking) marker.style.left = (Math.min(replay.seekTarget / total, 1) * 100).toFixed(2) + "%";

        const tickDuration = replay.getTickDuration();
        currentTime.textContent = formatTime(fraction * total * tickDuration);
        totalTime.textContent = formatTime(total * tickDuration);
    }

    function dispose() {
        if (!active) return;
        active = false;
        cancelAnimationFrame(frameId);
        track.removeEventListener("pointerdown", onPointerDown);
        track.removeEventListener("pointermove", onPointerMove);
        track.removeEventListener("pointerup", onPointerUp);
        track.removeEventListener("pointercancel", onPointerCancel);
        bar.remove();
        drag = null;
        if (disposeReplayTimebar === dispose) disposeReplayTimebar = null;
    }

    disposeReplayTimebar = dispose;
    frameId = requestAnimationFrame(updateBar);
    return dispose;
}

export default replay;
