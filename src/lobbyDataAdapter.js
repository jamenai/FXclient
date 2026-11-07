const EMPTY_SNAPSHOT = Object.freeze({
  source: "none",
  players: [],
  chatChannel: "default",
  chatMessages: [],
  modes: [],
  currentMap: "",
  currentMapImage: "",
  nextMap: "",
  nextMapImage: "",
  nextTeamCountLabel: "",
  readyCount: 0,
  playerCount: 0,
  progressPercent: null,
});

function normalizePlayer(player) {
  return {
    id: String(player.id ?? ""),
    name: String(player.name ?? ""),
    clan: player.clan ? String(player.clan).toLocaleUpperCase() : null,
    readiness: ["ready", "not-ready"].includes(player.readiness) ? player.readiness : "unknown",
    rank: Number.isFinite(Number(player.rank)) && Number(player.rank) > 0 ? Number(player.rank) : null,
    rankText: String(player.rankText ?? ""),
    followed: player.followed === true,
    self: player.self === true,
    color: typeof player.color === "string" ? player.color : "",
    title: typeof player.title === "string" ? player.title : "",
    nativeElement: player.nativeElement ?? null,
  };
}

function normalizeSnapshot(snapshot, source, previousSnapshot = EMPTY_SNAPSHOT) {
  const players = Array.isArray(snapshot?.players) ? snapshot.players.map(normalizePlayer) : [];
  const percentage = snapshot?.progressPercent == null ? NaN : Number(snapshot.progressPercent);
  const reportedPlayers = Number(snapshot?.playerCount);
  const reportedReady = Number(snapshot?.readyCount);
  const playerCount = Number.isInteger(reportedPlayers) && reportedPlayers >= 0 ? reportedPlayers : players.length;
  const readyCount = Number.isInteger(reportedReady) && reportedReady >= 0
    ? Math.min(reportedReady, playerCount)
    : players.filter(player => player.readiness === "ready").length;
  return {
    source,
    players,
    chatChannel: String(snapshot?.chatChannel ?? "default"),
    chatMessages: Array.isArray(snapshot?.chatMessages) ? snapshot.chatMessages
      .map((message, index) => ({
        id: String(message.id ?? index),
        text: String(message.text ?? "").trim(),
        senderId: Number.isInteger(Number(message.senderId)) ? Number(message.senderId) : null,
        senderName: String(message.senderName ?? ""),
        senderColor: typeof message.senderColor === "string" ? message.senderColor : "",
        segments: Array.isArray(message.segments) ? message.segments.map(segment => ({
          text: String(segment?.text ?? ""),
          color: typeof segment?.color === "string" ? segment.color : "",
        })) : [],
      }))
      .filter(message => message.text)
      .slice(-60) : [],
    modes: Array.isArray(snapshot?.modes) ? snapshot.modes.map(mode => {
      const id = String(mode.id ?? "");
      const previous = previousSnapshot?.modes?.find(item => String(item.id) === id);
      const label = String(mode.label ?? previous?.label ?? "");
      return {
        id,
        label,
        clock: String(mode.clock || previous?.clock || ""),
        count: String(mode.count || previous?.count || ""),
        map: String(mode.map || previous?.map || ""),
        // Team counts describe the current map/mode selection and can change
        // independently of the mode tab. Never carry a previous count forward.
        teamCountLabel: /team/i.test(label)
          ? String(mode.teamCountLabel || previous?.teamCountLabel || "") : "",
        isContest: mode.isContest === true || previous?.isContest === true,
        active: mode.active === true,
        nativeElement: mode.nativeElement ?? previous?.nativeElement ?? null,
      };
    }) : [],
    currentMap: String(snapshot?.currentMap ?? ""),
    currentMapImage: String(snapshot?.currentMapImage
      ?? (String(snapshot?.currentMap ?? "") === previousSnapshot?.currentMap ? previousSnapshot.currentMapImage : "") ?? ""),
    nextMap: String(snapshot?.nextMap ?? ""),
    nextMapImage: String(snapshot?.nextMapImage
      ?? (String(snapshot?.nextMap ?? "") === previousSnapshot?.nextMap ? previousSnapshot.nextMapImage : "") ?? ""),
    nextTeamCountLabel: String(snapshot?.nextTeamCountLabel ?? ""),
    isContest: snapshot?.isContest === true || snapshot?.modes?.find(mode => mode.active)?.isContest === true,
    nextIsContest: typeof snapshot?.nextIsContest === "boolean" ? snapshot.nextIsContest : null,
    noFullsend: snapshot?.noFullsend === true,
    nextNoFullsend: snapshot?.nextNoFullsend === true,
    readyCount,
    playerCount,
    progressPercent: Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : null,
  };
}

function mergeChatMessages(previous, incoming) {
  const isLobbyMetrics = message => /^MP:\s*\d+\s+SP:\s*\d+\s+Lobby:\s*\d+\s*$/i.test(message.text);
  const retained = previous.filter(message => !isLobbyMetrics(message));
  const cleanIncoming = (Array.isArray(incoming) ? incoming : []).filter(message => !isLobbyMetrics(message));
  if (cleanIncoming.length === 0) return retained.length === previous.length ? previous : retained;
  const byId = new Map(retained.map((message, index) => [message.id, index]));
  const merged = [...retained];
  for (const message of cleanIncoming) {
    const existingIndex = byId.get(message.id);
    if (existingIndex !== undefined) {
      merged[existingIndex] = message;
      continue;
    }
    // Keep repeated text when it has distinct stable IDs; only legacy entries
    // without a meaningful source identity use text as their duplicate key.
    if (!message.id || /^\d+$/.test(message.id)) {
      if (merged.some(existing => existing.id === message.id || existing.text === message.text)) continue;
    }
    byId.set(message.id, merged.length);
    merged.push(message);
  }
  return merged.slice(-300);
}

/** Stable normalized boundary between the game data source and lobby UI. */
export function createLobbyDataAdapter() {
  let snapshot = EMPTY_SNAPSHOT;
  const listeners = new Set();
  const chatHistoryByChannel = new Map();

  function publish(nextSnapshot, source = "game") {
    const normalized = normalizeSnapshot(nextSnapshot, source, snapshot);
    const channelHistory = chatHistoryByChannel.get(normalized.chatChannel) ?? [];
    normalized.chatMessages = mergeChatMessages(channelHistory, normalized.chatMessages);
    chatHistoryByChannel.set(normalized.chatChannel, normalized.chatMessages);
    snapshot = normalized;
    for (const listener of listeners) listener(snapshot);
    return snapshot;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    listener(snapshot);
    return () => listeners.delete(listener);
  }

  return {
    getSnapshot: () => snapshot,
    publish,
    subscribe,
    clear() {
      snapshot = EMPTY_SNAPSHOT;
      for (const listener of listeners) listener(snapshot);
    },
    clearChatHistory() {
      chatHistoryByChannel.clear();
      snapshot = { ...snapshot, chatMessages: [] };
      for (const listener of listeners) listener(snapshot);
    },
    switchChatChannel(channel) {
      const chatChannel = String(channel ?? "default");
      snapshot = {
        ...snapshot,
        chatChannel,
        chatMessages: chatHistoryByChannel.get(chatChannel) ?? [],
      };
      for (const listener of listeners) listener(snapshot);
    },
  };
}
