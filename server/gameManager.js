const { v4: uuidv4 } = require('uuid');
const { PHASES, CARD_TYPES, TURN_PHASES } = require('./constants');
const {
  createDeck,
  dealCards,
  markInitialPeek,
  drawFromDeck,
  replacePowerCardsInHands,
  computeScores,
  buildClientState,
  buildFinalState,
} = require('./gameLogic');

const rooms = new Map(); // roomCode → room object

// ── helpers ──────────────────────────────────────────────────────────────────

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // omit I, O to avoid confusion
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function getRoom(roomCode) {
  return rooms.get(roomCode?.toUpperCase()) || null;
}

function emitToAll(io, room, event, buildPayload) {
  room.players.forEach(player => {
    io.to(player.socketId).emit(event, buildPayload(player.playerId));
  });
}

function broadcastState(io, room) {
  emitToAll(io, room, 'gameStateUpdated', (pid) => buildClientState(room, pid));
}

function advanceTurn(io, room) {
  const n = room.players.length;
  let next = (room.currentPlayerIndex + 1) % n;

  if (room.phase === PHASES.LAST_ROUND) {
    // Skip the Rata caller and anyone who already acted
    let attempts = 0;
    while (
      attempts < n &&
      room.playersWhoActedInLastRound.includes(room.players[next].playerId)
    ) {
      next = (next + 1) % n;
      attempts++;
    }

    // If we've gone all the way around, everyone acted → end game
    if (room.playersWhoActedInLastRound.includes(room.players[next].playerId)) {
      endGame(io, room);
      return;
    }
  }

  room.currentPlayerIndex = next;
  room.turnPhase = TURN_PHASES.IDLE;
  room.drawnCard = null;
  room.drawnFromDiscard = false;
  room.draw2Remaining = 0;
  broadcastState(io, room);
}

function endGame(io, room) {
  replacePowerCardsInHands(room);

  // Compute this round's scores and add to cumulative
  const roundScores = computeScores(room);
  roundScores.forEach(({ playerId, score }) => {
    room.cumulativeScores[playerId] = (room.cumulativeScores[playerId] || 0) + score;
  });

  // Remember who won this round — they'll go first in the next round
  const roundWinner = roundScores.reduce((best, curr) => curr.score < best.score ? curr : best);
  room.nextRoundStarterPlayerId = roundWinner.playerId;

  // Build revealed hands for display
  const players = room.players.map(player => ({
    playerId: player.playerId,
    name: player.name,
    hand: player.hand.map(card => ({
      id: card.id,
      type: card.type,
      value: card.value,
      isKnownToMe: true,
      isRevealed: true,
    })),
    roundScore: roundScores.find(s => s.playerId === player.playerId)?.score ?? 0,
    totalScore: room.cumulativeScores[player.playerId] || 0,
  }));

  // Determine cumulative standings
  const cumulativeScores = room.players.map(p => ({
    playerId: p.playerId,
    name: p.name,
    totalScore: room.cumulativeScores[p.playerId] || 0,
  }));

  if (room.currentRound < room.totalRounds) {
    // More rounds to go — emit roundEnded and wait for host to start next
    room.phase = PHASES.ROUND_END;
    io.to(room.roomCode).emit('roundEnded', {
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      players,
      cumulativeScores,
    });
  } else {
    // Final round — determine winners by cumulative score and end game
    room.phase = PHASES.ENDED;
    const minScore = Math.min(...cumulativeScores.map(s => s.totalScore));
    const winners = cumulativeScores.filter(s => s.totalScore === minScore).map(s => s.playerId);
    players.forEach(p => { p.isWinner = winners.includes(p.playerId); });

    io.to(room.roomCode).emit('gameEnded', {
      roomCode: room.roomCode,
      phase: PHASES.ENDED,
      players,
      winners,
      isTie: winners.length > 1,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      cumulativeScores,
    });
  }
}

// ── public handlers ───────────────────────────────────────────────────────────

function createRoom(io, socket, { playerName, totalRounds }) {
  if (!playerName?.trim()) {
    return socket.emit('errorOccurred', { message: 'נא להכניס שם' });
  }
  const roomCode = generateRoomCode();
  const playerId = uuidv4();
  const rounds = Math.min(Math.max(parseInt(totalRounds) || 3, 1), 10);

  const room = {
    roomCode,
    hostSocketId: socket.id,
    phase: PHASES.LOBBY,
    turnPhase: TURN_PHASES.IDLE,
    players: [{
      socketId: socket.id,
      playerId,
      name: playerName.trim(),
      hand: [],
      peekedInitial: false,
      hasCalledRata: false,
    }],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    drawnCard: null,
    draw2Remaining: 0,
    lastRoundCallerId: null,
    lastRoundStarterIndex: null,
    playersWhoActedInLastRound: [],
    totalRounds: rounds,
    currentRound: 1,
    cumulativeScores: {},
  };

  rooms.set(roomCode, room);
  socket.join(roomCode);
  socket.emit('roomCreated', { roomCode, playerId, playerName: playerName.trim(), totalRounds: rounds });
}

function joinRoom(io, socket, { roomCode, playerName }) {
  const code = roomCode?.toUpperCase();
  const room = rooms.get(code);

  if (!playerName?.trim()) return socket.emit('errorOccurred', { message: 'נא להכניס שם' });
  if (!room) return socket.emit('errorOccurred', { message: 'חדר לא נמצא' });
  if (room.phase !== PHASES.LOBBY) return socket.emit('errorOccurred', { message: 'המשחק כבר התחיל' });
  if (room.players.length >= 4) return socket.emit('errorOccurred', { message: 'החדר מלא' });

  const playerId = uuidv4();
  room.players.push({
    socketId: socket.id,
    playerId,
    name: playerName.trim(),
    hand: [],
    peekedInitial: false,
    hasCalledRata: false,
  });

  socket.join(code);
  socket.emit('roomJoined', { roomCode: code, playerId, playerName: playerName.trim(), totalRounds: room.totalRounds });

  // Broadcast updated player list to everyone in room
  io.to(code).emit('playerJoined', {
    players: room.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      isHost: p.socketId === room.hostSocketId,
    })),
  });
}

function rejoinRoom(io, socket, { roomCode, playerId }) {
  const room = getRoom(roomCode);
  if (!room) return socket.emit('errorOccurred', { message: 'חדר לא נמצא' });

  const player = room.players.find(p => p.playerId === playerId);
  if (!player) return socket.emit('errorOccurred', { message: 'שחקן לא נמצא' });

  // Cancel pending lobby-removal timer if they reconnected in time
  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = null;
  }

  const wasHost = room.hostSocketId === player.socketId; // check BEFORE overwriting
  player.socketId = socket.id;
  socket.join(room.roomCode);

  if (wasHost) {
    room.hostSocketId = socket.id;
  }

  socket.emit('gameStateUpdated', buildClientState(room, playerId));
}

function startGame(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return socket.emit('errorOccurred', { message: 'חדר לא נמצא' });
  if (socket.id !== room.hostSocketId) return socket.emit('errorOccurred', { message: 'רק המארח יכול להתחיל' });
  if (room.players.length < 2) return socket.emit('errorOccurred', { message: 'צריך לפחות 2 שחקנים' });
  if (room.phase !== PHASES.LOBBY) return;

  const deck = createDeck();
  const hands = dealCards(deck, room.players.length);
  markInitialPeek(hands, room.players);

  room.players.forEach((p, i) => { p.hand = hands[i]; });
  room.deck = deck;

  // Discard pile starts empty — first player must draw from the deck
  room.discardPile = [];

  room.phase = PHASES.INITIAL_PEEK;
  room.currentPlayerIndex = 0;

  // Send each player their own game state (they'll see their outer cards)
  emitToAll(io, room, 'gameStarted', (pid) => buildClientState(room, pid));
}

function startNextRound(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return socket.emit('errorOccurred', { message: 'חדר לא נמצא' });
  if (socket.id !== room.hostSocketId) return socket.emit('errorOccurred', { message: 'רק המארח יכול להתחיל סיבוב' });
  if (room.phase !== PHASES.ROUND_END) return;

  room.currentRound++;

  // Reset per-round player state
  room.players.forEach(p => {
    p.hand = [];
    p.peekedInitial = false;
    p.hasCalledRata = false;
  });
  room.playersWhoActedInLastRound = [];
  room.lastRoundCallerId = null;
  room.lastRoundStarterIndex = null;
  room.drawnCard = null;
  room.draw2Remaining = 0;

  // New deck & deal
  const deck = createDeck();
  const hands = dealCards(deck, room.players.length);
  markInitialPeek(hands, room.players);
  room.players.forEach((p, i) => { p.hand = hands[i]; });
  room.deck = deck;

  // Discard pile starts empty — first player must draw from the deck
  room.discardPile = [];

  room.phase = PHASES.INITIAL_PEEK;
  room.turnPhase = TURN_PHASES.IDLE;

  // Last round's winner goes first; fall back to player 0 if not set
  let startIndex = 0;
  if (room.nextRoundStarterPlayerId) {
    const idx = room.players.findIndex(p => p.playerId === room.nextRoundStarterPlayerId);
    if (idx !== -1) startIndex = idx;
    room.nextRoundStarterPlayerId = null;
  }
  room.currentPlayerIndex = startIndex;

  emitToAll(io, room, 'gameStarted', (pid) => buildClientState(room, pid));
}

function peekDone(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room || room.phase !== PHASES.INITIAL_PEEK) return;

  const player = room.players.find(p => p.socketId === socket.id);
  if (!player) return;

  player.peekedInitial = true;

  if (room.players.every(p => p.peekedInitial)) {
    room.phase = PHASES.PLAYING;
    broadcastState(io, room);
    io.to(room.roomCode).emit('allPeeked', {});
  } else {
    broadcastState(io, room);
  }
}

function handleDrawFromDeck(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (room.turnPhase !== TURN_PHASES.IDLE && room.turnPhase !== TURN_PHASES.DRAW2_PENDING) {
    return socket.emit('errorOccurred', { message: 'פעולה לא חוקית' });
  }

  const card = drawFromDeck(room);
  if (!card) return socket.emit('errorOccurred', { message: 'החפיסה ריקה' });

  room.drawnCard = card;
  room.turnPhase = TURN_PHASES.DREW_FROM_DECK;

  // Send the drawn card ONLY to the drawing player
  socket.emit('cardDrawn', {
    id: card.id,
    type: card.type,
    value: card.value,
  });

  broadcastState(io, room);
}

function handleDrawFromDiscard(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (room.turnPhase !== TURN_PHASES.IDLE) {
    return socket.emit('errorOccurred', { message: 'פעולה לא חוקית' });
  }
  if (room.discardPile.length === 0) {
    return socket.emit('errorOccurred', { message: 'ערימת הפסולת ריקה' });
  }

  const top = room.discardPile[room.discardPile.length - 1];
  if (top.type !== CARD_TYPES.NUMBER) {
    return socket.emit('errorOccurred', { message: 'לא ניתן לקחת קלף כוח מהפסולת' });
  }

  room.drawnCard = room.discardPile.pop();
  room.drawnCard.knownBy.clear();
  room.turnPhase = TURN_PHASES.DREW_FROM_DISCARD;
  room.drawnFromDiscard = true;

  // Player can see this card (it was face-up on discard)
  socket.emit('cardDrawn', {
    id: room.drawnCard.id,
    type: room.drawnCard.type,
    value: room.drawnCard.value,
  });

  broadcastState(io, room);
}

function handleSwapWithHand(io, socket, { roomCode, handIndex }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (
    room.turnPhase !== TURN_PHASES.DREW_FROM_DECK &&
    room.turnPhase !== TURN_PHASES.DREW_FROM_DISCARD
  ) {
    return socket.emit('errorOccurred', { message: 'פעולה לא חוקית' });
  }
  if (handIndex < 0 || handIndex > 3) {
    return socket.emit('errorOccurred', { message: 'אינדקס קלף לא חוקי' });
  }

  const oldCard = currentPlayer.hand[handIndex];
  const newCard = room.drawnCard;

  // Place drawn card in hand — player now knows it
  newCard.knownBy.add(currentPlayer.playerId);
  currentPlayer.hand[handIndex] = newCard;

  // Old card goes to discard pile
  room.discardPile.push(oldCard);
  room.drawnCard = null;

  finishTurn(io, room, currentPlayer);
}

function handleDiscardDrawn(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (room.turnPhase !== TURN_PHASES.DREW_FROM_DECK) {
    return socket.emit('errorOccurred', { message: 'לא ניתן להשליך קלף זה' });
  }

  const card = room.drawnCard;

  // If it's a power card, activate it instead of just discarding
  if (card.type !== CARD_TYPES.NUMBER) {
    room.turnPhase = TURN_PHASES.USING_POWER;
    broadcastState(io, room);
    return;
  }

  room.discardPile.push(card);
  room.drawnCard = null;

  finishTurn(io, room, currentPlayer);
}

function handleUsePeek(io, socket, { roomCode, targetHandIndex }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (room.turnPhase !== TURN_PHASES.USING_POWER || room.drawnCard?.type !== CARD_TYPES.PEEK) {
    return socket.emit('errorOccurred', { message: 'פעולה לא חוקית' });
  }
  if (targetHandIndex < 0 || targetHandIndex > 3) {
    return socket.emit('errorOccurred', { message: 'אינדקס קלף לא חוקי' });
  }

  const targetCard = currentPlayer.hand[targetHandIndex];
  targetCard.knownBy.add(currentPlayer.playerId);

  // Send peek result only to this player
  socket.emit('peekResult', {
    handIndex: targetHandIndex,
    card: { id: targetCard.id, type: targetCard.type, value: targetCard.value },
  });

  // Discard the power card
  room.discardPile.push(room.drawnCard);
  room.drawnCard = null;

  finishTurn(io, room, currentPlayer);
}

function handleUseSwap(io, socket, { roomCode, myHandIndex, targetPlayerId, targetHandIndex }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (room.turnPhase !== TURN_PHASES.USING_POWER || room.drawnCard?.type !== CARD_TYPES.SWAP) {
    return socket.emit('errorOccurred', { message: 'פעולה לא חוקית' });
  }

  const targetPlayer = room.players.find(p => p.playerId === targetPlayerId);
  if (!targetPlayer || targetPlayer.playerId === currentPlayer.playerId) {
    return socket.emit('errorOccurred', { message: 'שחקן לא חוקי' });
  }
  if (myHandIndex < 0 || myHandIndex > 3 || targetHandIndex < 0 || targetHandIndex > 3) {
    return socket.emit('errorOccurred', { message: 'אינדקס קלף לא חוקי' });
  }

  const myCard = currentPlayer.hand[myHandIndex];
  const theirCard = targetPlayer.hand[targetHandIndex];

  // Swap
  currentPlayer.hand[myHandIndex] = theirCard;
  targetPlayer.hand[targetHandIndex] = myCard;

  // The swapper knows what they received (they chose the target card)
  theirCard.knownBy.add(currentPlayer.playerId);
  // The target player now has your card — they don't automatically know it
  // (they didn't see it), so we don't add their playerId to myCard.knownBy

  // Discard the power card
  room.discardPile.push(room.drawnCard);
  room.drawnCard = null;

  // Announce the swap to all players so opponents know what moved
  const posLabels = ['ימני ביותר', 'ימני אמצעי', 'שמאלי אמצעי', 'שמאלי ביותר'];
  io.to(room.roomCode).emit('swapAnnouncement', {
    swapperName: currentPlayer.name,
    swapperPlayerId: currentPlayer.playerId,
    myHandIndex,
    myPositionLabel: posLabels[myHandIndex] ?? `#${myHandIndex + 1}`,
    targetPlayerName: targetPlayer.name,
    targetPlayerId: targetPlayer.playerId,
    targetHandIndex,
    targetPositionLabel: posLabels[targetHandIndex] ?? `#${targetHandIndex + 1}`,
  });

  finishTurn(io, room, currentPlayer);
}

function handleUseDrawTwo(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== socket.id) {
    return socket.emit('errorOccurred', { message: 'זה לא התור שלך' });
  }
  if (room.turnPhase !== TURN_PHASES.USING_POWER || room.drawnCard?.type !== CARD_TYPES.DRAW2) {
    return socket.emit('errorOccurred', { message: 'פעולה לא חוקית' });
  }

  // Discard Draw2 card, set up 2 extra draws
  room.discardPile.push(room.drawnCard);
  room.drawnCard = null;
  room.draw2Remaining = 2;
  room.turnPhase = TURN_PHASES.DRAW2_PENDING;

  broadcastState(io, room);
}

function handleCallRata(io, socket, { roomCode }) {
  const room = getRoom(roomCode);
  if (!room) return;
  if (room.phase !== PHASES.PLAYING) return socket.emit('errorOccurred', { message: 'לא ניתן לקרוא כלבלבולי עכשיו' });
  if (room.turnPhase !== TURN_PHASES.IDLE) return socket.emit('errorOccurred', { message: 'סיים את התור שלך קודם' });

  const caller = room.players.find(p => p.socketId === socket.id);
  if (!caller) return;

  caller.hasCalledRata = true;
  room.phase = PHASES.LAST_ROUND;
  room.lastRoundCallerId = caller.playerId;
  room.lastRoundStarterIndex = room.currentPlayerIndex;

  // Caller never gets an extra turn — mark them as already acted
  room.playersWhoActedInLastRound = [caller.playerId];

  io.to(room.roomCode).emit('rataCalled', {
    callerName: caller.name,
    callerPlayerId: caller.playerId,
  });

  // If it's the caller's own IDLE turn, skip it immediately so only the
  // remaining players each get one last turn.
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.playerId === caller.playerId) {
    advanceTurn(io, room);
  } else {
    broadcastState(io, room);
  }
}

function finishTurn(io, room, currentPlayer) {
  // If we're in Draw2 mode, decrement counter
  if (room.draw2Remaining > 0) {
    room.draw2Remaining--;
    if (room.draw2Remaining > 0) {
      // Still more draws to do
      room.turnPhase = TURN_PHASES.DRAW2_PENDING;
      broadcastState(io, room);
      return;
    }
  }

  // Track last-round participation
  if (room.phase === PHASES.LAST_ROUND) {
    if (!room.playersWhoActedInLastRound.includes(currentPlayer.playerId)) {
      room.playersWhoActedInLastRound.push(currentPlayer.playerId);
    }
  }

  advanceTurn(io, room);
}

function removeLobbyPlayer(io, room, player) {
  const code = room.roomCode;
  const idx = room.players.findIndex(p => p.playerId === player.playerId);
  if (idx === -1) return; // already reconnected or removed

  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    rooms.delete(code);
    return;
  }

  // Reassign host if needed
  if (room.hostSocketId === player.socketId) {
    room.hostSocketId = room.players[0].socketId;
  }

  io.to(code).emit('playerJoined', {
    players: room.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      isHost: p.socketId === room.hostSocketId,
    })),
  });
}

function handleDisconnect(io, socket) {
  // Find the room this socket was in
  for (const [code, room] of rooms) {
    const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
    if (playerIndex === -1) continue;

    const player = room.players[playerIndex];

    if (room.phase === PHASES.LOBBY) {
      // Give a 30-second grace period so brief disconnects (mobile, refresh)
      // don't immediately destroy the room slot.
      player.disconnectTimer = setTimeout(
        () => removeLobbyPlayer(io, room, player),
        30_000,
      );
    }
    // During a game (or grace period), keep the player's slot so they can rejoin
    break;
  }
}

module.exports = {
  createRoom,
  joinRoom,
  rejoinRoom,
  startGame,
  startNextRound,
  peekDone,
  handleDrawFromDeck,
  handleDrawFromDiscard,
  handleSwapWithHand,
  handleDiscardDrawn,
  handleUsePeek,
  handleUseSwap,
  handleUseDrawTwo,
  handleCallRata,
  handleDisconnect,
  getRoom,
};
