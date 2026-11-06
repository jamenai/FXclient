import { getSettings } from "./settings.js";
import { describeGame, matchesFilters } from "./lobbyFilters.js";


const SOUND_REPEATS = 3;
const SOUND_INTERVAL = 260;

let rooms = null;
let selection = null;
let playGameSound = null;
let showPopup = null;
const roomStates = [];

function playReminderSound() {
    for (let i = 0; i < SOUND_REPEATS; i++) setTimeout(() => playGameSound?.(), i * SOUND_INTERVAL);
}

function setRooms(lobbyRooms) {
    rooms = lobbyRooms;
    roomStates.length = 0;
}

function setLobbySource(lobbyRooms, lobbySelection) {
    setRooms(lobbyRooms);
    selection = lobbySelection;
}

function getSelectedRoom() {
    const index = Number(selection?.[0]);
    return Number.isInteger(index) ? rooms?.[index] ?? null : null;
}

function getSelectedGame() {
    const room = getSelectedRoom();
    if (!room) return null;
    return {
        selectedIndex: Number(selection?.[0]),
        map: room[dictionary.lobbyRoomMap],
        mode: room[dictionary.lobbyRoomMode],
        nextMap: room[dictionary.lobbyRoomNextMap],
        nextMode: room[dictionary.lobbyRoomNextMode],
        isContest: !!room[dictionary.lobbyRoomIsContest],
        nextIsContest: false,
        chatLog: room[dictionary.lobbyRoomChatLog],
        chatId: room[dictionary.lobbyRoomChatId],
    };
}

function getRoomChatSummary() {
    if (!Array.isArray(rooms)) return [];
    const selectedIndex = Number(selection?.[0]);
    return rooms.map((room, index) => ({
        index,
        selected: index === selectedIndex,
        chatId: room?.[dictionary.lobbyRoomChatId] ?? null,
        chatLogLength: Array.isArray(room?.[dictionary.lobbyRoomChatLog])
            ? room[dictionary.lobbyRoomChatLog].length : null,
    }));
}

function setSound(playSound) {
    playGameSound = playSound;
}

function setPopupHandler(handler) {
    showPopup = handler;
}

function check() {
    if (rooms === null) return;
    const rules = getSettings().lobbyReminderRules || [];
    const selectedIndex = Number(selection?.[0]);
    for (let index = 0; index < rooms.length; index++) {
        const room = rooms[index];
        if (!room) continue;
        const timeLeft = room[dictionary.lobbyRoomTimeLeft];
        const state = roomStates[index] ?? (roomStates[index] = { timeLeft: -1, reminded: null, lastCountdown: null });
        if (timeLeft > state.timeLeft) state.reminded = null;
        state.timeLeft = timeLeft;

        const game = {
            map: room[dictionary.lobbyRoomMap],
            mode: room[dictionary.lobbyRoomMode],
            isContest: !!room[dictionary.lobbyRoomIsContest]
        };
        if (rules.length === 0) continue;

        const key = game.map + ":" + game.mode + ":" + game.isContest;
        if (state.reminded === key) continue;
        if (!matchesFilters(rules, game)) continue;
        state.reminded = key;
        const description = describeGame(game);
        console.log(`FX lobby reminder: ${description} (starts in ${timeLeft}s)`);
        showPopup?.(`Reminder: ${description}`);
        playReminderSound();
    }

}

export default { setRooms, setLobbySource, getSelectedRoom, getSelectedGame, getRoomChatSummary, setSound, setPopupHandler, check };
