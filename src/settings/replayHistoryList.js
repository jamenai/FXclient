/** Creates the saved replay settings section with its required services injected. */
export function createReplayHistoryList({ history, closeSettings, saveFile, createButton, copyToClipboard, showAlert }) {
  function ReplayHistoryList(container) {
    const title = document.createElement("p");
    title.innerHTML = "<b>Saved Replays</b> (auto-saves your last 5 games)";
    container.append(title);
  
    const list = document.createElement("div");
    container.append(list);
  
    function formatTime(timestamp) {
      const minutes = Math.floor((Date.now() - timestamp) / 60000);
      if (minutes < 1) return "just now";
      if (minutes < 60) return minutes + "m ago";
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + "h ago";
      return Math.floor(hours / 24) + "d ago";
    }
  
    function render() {
      list.innerHTML = "";
      const replays = history.getAll();
      if (!replays.length) {
        const empty = document.createElement("small");
        empty.innerText = "No replays saved yet. Finish a game and it'll show up here.";
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
  
        const loadBtn = createButton("Load", () => {
          closeSettings();
          history.load(replay.data, replay.timestamp);
        })
        const copyBtn = createButton("Copy", () => {
            copyToClipboard(replay.data).then(() => {
            copyBtn.innerText = "Copied!";
            setTimeout(() => (copyBtn.innerText = "Copy"), 1500);
          }).catch(() => showAlert("Failed to copy"));
        });
        const deleteBtn = createButton("Delete", () => {
          history.remove(replay.timestamp);
          render();
        });
        const downloadBtn = createButton("Download", () =>
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
  
    this.update = render;
  }
  return ReplayHistoryList;
}
