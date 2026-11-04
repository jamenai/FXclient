const STORAGE_KEY = "fx_replays";
const MAX_REPLAYS = 5;
let activeReplayTimestamp = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Failed to load replay history:", error);
    return [];
  }
}

function persist(replays) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replays));
  } catch (error) {
    console.warn("Failed to save replay history:", error);
  }
}

function save(replayData) {
  if (!replayData) return null;
  const replays = load();
  // avoid saving an exact duplicate if this fires twice for the same match
  if (replays.length && replays[replays.length - 1].data === replayData) return replays[replays.length - 1].timestamp;
  const timestamp = Date.now();
  replays.push({ data: replayData, timestamp, markers: [] });
  while (replays.length > MAX_REPLAYS) replays.shift();
  persist(replays);
  return timestamp;
}

function getAll() {
  return load().slice().reverse(); // most recent first
}

function remove(timestamp) {
  persist(load().filter((r) => r.timestamp !== timestamp));
  if (activeReplayTimestamp === timestamp) activeReplayTimestamp = null;
}

function clear() {
  localStorage.removeItem(STORAGE_KEY);
  activeReplayTimestamp = null;
}

function getMarkers(timestamp) {
  const replay = load().find(entry => entry.timestamp === timestamp);
  return Array.isArray(replay?.markers) ? replay.markers.filter(marker =>
    Number.isFinite(marker?.tick) && marker.tick >= 0 && typeof marker.note === "string"
  ) : [];
}

function addMarker(timestamp, tick, note, timeMs = null) {
  if (!Number.isFinite(timestamp) || !Number.isFinite(tick) || tick < 0 || typeof note !== "string") return null;
  const cleanNote = note.trim().slice(0, 160);
  if (!cleanNote) return null;
  const replays = load();
  const replay = replays.find(entry => entry.timestamp === timestamp);
  if (!replay) return null;
  if (!Array.isArray(replay.markers)) replay.markers = [];
  if (replay.markers.length >= 100) return null;
  const marker = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tick: Math.round(tick),
    timeMs: Number.isFinite(timeMs) && timeMs >= 0 ? Math.round(timeMs) : null,
    note: cleanNote,
  };
  replay.markers.push(marker);
  persist(replays);
  return marker;
}

function removeMarker(timestamp, markerId) {
  const replays = load();
  const replay = replays.find(entry => entry.timestamp === timestamp);
  if (!replay || !Array.isArray(replay.markers)) return;
  replay.markers = replay.markers.filter(marker => marker?.id !== markerId);
  persist(replays);
}

function setActiveReplay(timestamp) {
  activeReplayTimestamp = load().some(entry => entry.timestamp === timestamp) ? timestamp : null;
}

function getActiveReplayTimestamp() {
  return activeReplayTimestamp;
}

export default {
  save,
  getAll,
  getMarkers,
  addMarker,
  removeMarker,
  remove,
  clear,
  setActiveReplay,
  getActiveReplayTimestamp,
  load: () => { alert("Game hasn't loaded yet"); },
};
