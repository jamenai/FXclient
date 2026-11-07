/** Creates the saved replay settings section with its required services injected. */
export function createReplayHistoryList({ history, closeSettings, saveFile, createButton, copyToClipboard, showAlert }) {
  function ReplayHistoryList(container) {
    const t = key => window.__fx?.translateFX?.(key) ?? key;
    const title = document.createElement("h3");
    title.className = "settings-subsection-title";
    const titleSuffix = document.createTextNode("");
    title.append(titleSuffix);
    const updateTitle = () => {
      const heading = t("settingSavedReplays").split(" (")[0];
      titleSuffix.nodeValue = " " + (t("settingSavedReplays").match(/\(.*\)$/)?.[0] ?? "");
      title.replaceChildren(document.createTextNode(heading), titleSuffix);
    };
    title.dataset.settingsSubsectionLabel = "Saved Replays";
    updateTitle();
    container.append(title);
  
    const list = document.createElement("div");
    container.append(list);
  
    function formatTime(timestamp) {
      const minutes = Math.floor((Date.now() - timestamp) / 60000);
      if (minutes < 1) return t("settingJustNow");
      if (minutes < 60) return t("settingMinutesAgo").replace("{count}", minutes);
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t("settingHoursAgo").replace("{count}", hours);
      return t("settingDaysAgo").replace("{count}", Math.floor(hours / 24));
    }
  
    function render() {
      list.innerHTML = "";
      const replays = history.getAll();
      if (!replays.length) {
        const empty = document.createElement("small");
        empty.innerText = t("settingNoSavedReplays");
        list.append(empty);
        return;
      }
      replays.forEach((replay) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "6px";
        row.style.marginBottom = "4px";
  
        const label = document.createElement("small");
        label.innerText = formatTime(replay.timestamp);
        label.style.flex = "1";
  
        const loadBtn = createButton(t("settingLoad"), () => {
          closeSettings();
          history.load(replay.data, replay.timestamp);
        })
        const copyBtn = createButton(t("settingCopy"), () => {
            copyToClipboard(replay.data).then(() => {
            copyBtn.innerText = t("settingCopied");
            setTimeout(() => (copyBtn.innerText = t("settingCopy")), 1500);
          }).catch(() => showAlert(t("settingFailedCopy")));
        });
        const deleteBtn = createButton(t("settingDelete"), () => {
          history.remove(replay.timestamp);
          render();
        });
        const downloadBtn = createButton(t("settingDownload"), () =>
          saveFile(replay.data, `replay_${replay.timestamp}.txt`, "text/plain"),
        )
        row.append(label, loadBtn, copyBtn, downloadBtn, deleteBtn);
        list.append(row);

        const markers = history.getMarkers?.(replay.timestamp) ?? [];
        if (markers.length) {
          const notes = document.createElement("details");
          const summary = document.createElement("summary");
          summary.innerText = `${window.__fx?.translateFX?.("replayMarkers") ?? "Replay notes"} (${markers.length})`;
          notes.append(summary);
          for (const marker of markers) {
            const markerRow = document.createElement("div");
            markerRow.style.cssText = "display:flex;align-items:center;gap:6px;margin:3px 0 3px 12px";
            const text = document.createElement("small");
            const time = Number.isFinite(marker.timeMs) ? formatReplayTime(marker.timeMs) : `Tick ${marker.tick}`;
            text.textContent = `${time} - ${marker.note}`;
            text.style.flex = "1";
            const removeMarkerButton = createButton(window.__fx?.translateFX?.("removeReplayMarker") ?? "Remove", () => {
              history.removeMarker(replay.timestamp, marker.id);
              render();
            });
            markerRow.append(text, removeMarkerButton);
            notes.append(markerRow);
          }
          list.append(notes);
        }
      });
    }

    function formatReplayTime(timeMs) {
      const seconds = Math.floor(timeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      return `${minutes}:${String(remainder).padStart(2, "0")}`;
    }
  
    this.update = function () { updateTitle(); render(); };
  }
  return ReplayHistoryList;
}
