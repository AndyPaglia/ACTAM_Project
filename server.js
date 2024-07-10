const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 5505 });

let rooms = {}; // Oggetto per memorizzare le stanze e i loro partecipanti
let roomMessages = {}; // Oggetto per memorizzare i messaggi delle stanze in memoria
let trackState = {}; // Oggetto per memorizzare lo stato delle tracce per ogni stanza

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log('Received message:', parsedMessage); // Debug log
        handleClientMessage(ws, parsedMessage);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        leaveAllRooms(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleClientMessage(ws, message) {
    console.log('Handling client message:', message.type); // Log
    switch (message.type) {
        case 'joinRoom':
            joinRoom(ws, message.nickname, message.roomID);
            break;
        case 'leaveRoom':
            leaveRoom(ws, message.roomID);
            break;
        case 'chat':
            console.log(`Message from ${message.nickname} in room ${message.roomID}: ${message.text}`); // Debug log
            broadcastMessage(ws, message.roomID, message.nickname, message.text);
            storeMessageInMemory(message.roomID, { type: 'chat', nickname: message.nickname, text: message.text });
            break;
        case 'track':
            console.log(`Track event from ${message.nickname} in room ${message.roomID}:`, message.event); // Debug log
            handleTrackUpdates(ws, message);
            break;
        default:
            console.log('Unknown message type:', message.type);
            ws.send(JSON.stringify({ type: 'error', text: 'Unknown message type' }));
    }
}

function handleTrackUpdates(ws, message) {
    const event = message.event;
    const roomID = message.roomID;
    const nickname = message.nickname;

    console.log('Handling track event:', event); // Debug log

    const track = trackState[roomID] && trackState[roomID][event.id];
    const lastUpdatedBy = track ? track.lastUpdatedBy : null;

    if (lastUpdatedBy !== nickname) {
        const systemMessage = `${nickname} ha aggiornato track ${event.id}`;
        broadcastInfoMessage(ws, roomID, systemMessage);
        storeMessageInMemory(roomID, { type: 'info', text: systemMessage });
    }

    updateTrackState(roomID, event, nickname);
    storeMessageInMemory(roomID, { type: 'track', event: event });
    broadcastTrackEvent(ws, roomID, event);
}

function joinRoom(ws, nickname, roomID) {
    console.log(`Client ${nickname} joining room ${roomID}`); // Log

    if (!rooms[roomID]) {
        rooms[roomID] = [];
        roomMessages[roomID] = [];
        trackState[roomID] = {};
    }

    // Verifica se il nickname è già in uso nella stanza
    const nicknameInUse = rooms[roomID].some(client => client.nickname === nickname);
    if (nicknameInUse) {
        ws.send(JSON.stringify({ type: 'error', text: 'Nickname already in use in this room' }));
        return;
    }

    rooms[roomID].push({ ws, nickname });
    ws.roomID = roomID;  // Salva l'ID della stanza nel websocket
    ws.nickname = nickname;  // Salva il nickname nel websocket
    ws.send(JSON.stringify({ type: 'roomID', roomID }));

    console.log(`${nickname} joined room ${roomID}`); // Debug log

    // Invia i messaggi precedenti
    ws.send(JSON.stringify({ type: 'history', messages: roomMessages[roomID] }));

    broadcastInfoMessage(ws, roomID, `${nickname} has joined the room`);
    storeMessageInMemory(roomID, { type: 'info', text: `${nickname} has joined the room` });
}

function leaveRoom(ws, roomID) {
    console.log(`Client ${ws.nickname} leaving room ${roomID}`); // Log
    if (!rooms[roomID]) return;

    rooms[roomID] = rooms[roomID].filter(client => client.ws !== ws);
    if (rooms[roomID].length === 0) {
        delete rooms[roomID];
        delete roomMessages[roomID];
        delete trackState[roomID];
    } else {
        broadcastInfoMessage(ws, roomID, `${ws.nickname} has left the room`);
        storeMessageInMemory(roomID, { type: 'info', text: `${ws.nickname} has left the room` });
    }
    console.log(`${ws.nickname} left room ${roomID}`); // Debug log

    // Rimuovi la stanza corrente dal client
    delete ws.roomID;
    delete ws.nickname;
}

function leaveAllRooms(ws) {
    for (let roomID in rooms) {
        leaveRoom(ws, roomID);
    }
}

function broadcastMessage(sender, roomID, nickname, text) {
    console.log(`Broadcasting message in room ${roomID}: ${nickname}: ${text}`); // Debug log
    if (!rooms[roomID]) return;

    rooms[roomID].forEach(client => {
        if (client.ws !== sender) {
            client.ws.send(JSON.stringify({ type: 'chat', nickname, text }));
        }
    });
}

function broadcastTrackEvent(sender, roomID, event) {
    console.log(`Broadcasting track event in room ${roomID}:`, event); // Debug log
    if (!rooms[roomID]) return;

    rooms[roomID].forEach(client => {
        if (client.ws !== sender) {
            client.ws.send(JSON.stringify({ type: 'track', event }));
        }
    });
}

function broadcastInfoMessage(sender, roomID, text) {
    console.log(`Broadcasting info message in room ${roomID}: ${text}`); // Debug log
    if (!rooms[roomID]) return;

    rooms[roomID].forEach(client => {
        if (client.ws !== sender) {
            client.ws.send(JSON.stringify({ type: 'info', text }));
        }
    });
}

// Funzione per memorizzare i messaggi in memoria
function storeMessageInMemory(roomID, message) {
    if (!roomMessages[roomID]) {
        roomMessages[roomID] = [];
    }
    roomMessages[roomID].push(message);
    console.log('Stored message in memory:', roomMessages[roomID]); // Debug log
}

// Funzione per aggiornare lo stato delle tracce
function updateTrackState(roomID, event, nickname) {
    if (!trackState[roomID]) {
        trackState[roomID] = {};
    }
    if (!trackState[roomID][event.id]) {
        trackState[roomID][event.id] = {};
    }

    const currentTrackState = trackState[roomID][event.id];

    // Aggiorna solo i valori diversi
    for (const key in event) {
        if (event[key] !== currentTrackState[key]) {
            currentTrackState[key] = event[key];
        }
    }

    // Aggiorna l'ultimo utente che ha aggiornato la traccia
    currentTrackState.lastUpdatedBy = nickname;
}

console.log('WebSocket server is running on ws://localhost:5505');
