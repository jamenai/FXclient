const listeners = new Set();
const history = [];
let decodedEntryCount = 0;
let publishedMessageCount = 0;
let duplicateMessageCount = 0;
let chatModeCommandCount = 0;
let lastChatModeCommand = null;
const packetCounts = Object.create(null);

function observeSocketPacket(packetType) {
  packetCounts[packetType] = (packetCounts[packetType] ?? 0) + 1;
  if (packetCounts[packetType] === 1) {
    console.info("[ZFX Client LobbyChat] incoming socket packet type", packetType);
  }
}

function observeSocketEntry(entry) {
  decodedEntryCount++;
  if (decodedEntryCount === 1 || decodedEntryCount % 25 === 0) {
    console.info("[ZFX Client LobbyChat] decoded room-chat socket entries", {
      decodedEntryCount,
      entryType: entry?.id ?? null,
      textEntry: typeof entry?.s === "string",
    });
  }
}

function observeChatModeCommand(mode) {
  chatModeCommandCount++;
  lastChatModeCommand = mode;
  console.info("[ZFX Client LobbyChat] native chat mode command", { mode, chatModeCommandCount });
}

function publish(message) {
  const text = String(message?.text ?? "").trim();
  if (!text) return;
  const entry = {
    id: String(message?.id ?? `${Date.now()}:${Math.random().toString(36).slice(2)}`),
    text,
    senderId: Number.isInteger(Number(message?.senderId)) ? Number(message.senderId) : null,
  };
  // Room chat entries can be replayed by the socket parser after a reconnect.
  // Their room/index ID is stable, so ignore only an identical entry with the
  // same ID; two intentionally repeated messages have different IDs.
  const duplicate = history.some(existing => existing.id === entry.id
    && existing.senderId === entry.senderId
    && existing.text === entry.text);
  if (duplicate) {
    duplicateMessageCount++;
    return;
  }
  history.push(entry);
  if (history.length > 60) history.splice(0, history.length - 60);
  publishedMessageCount++;
  console.info("[ZFX Client LobbyChat] received room message", {
    publishedMessageCount,
    senderId: entry.senderId,
    text: entry.text,
    subscriberCount: listeners.size,
  });
  for (const listener of listeners) listener(entry);
}

function subscribe(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  for (const entry of history) listener(entry);
  return () => listeners.delete(listener);
}

function getDiagnostics() {
  return {
    packetCounts: { ...packetCounts }, decodedEntryCount, publishedMessageCount,
    duplicateMessageCount,
    bufferedMessageCount: history.length, subscriberCount: listeners.size,
    chatModeCommandCount, lastChatModeCommand,
  };
}

export default { observeSocketPacket, observeSocketEntry, observeChatModeCommand, publish, subscribe, getDiagnostics };
