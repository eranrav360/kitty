const { CARD_TYPES, TURN_PHASES } = require('./constants');

function createDeck() {
  const cards = [];
  let id = 0;

  // 40 number cards: 4 copies of each value 0-9
  for (let value = 0; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      cards.push({
        id: `num-${value}-${copy}`,
        type: CARD_TYPES.NUMBER,
        value,
        knownBy: new Set(),
      });
      id++;
    }
  }

  // 14 power cards: 5 Peek, 5 Swap, 4 Draw2
  const powers = [
    ...Array(5).fill(CARD_TYPES.PEEK),
    ...Array(5).fill(CARD_TYPES.SWAP),
    ...Array(4).fill(CARD_TYPES.DRAW2),
  ];
  powers.forEach((type, i) => {
    cards.push({
      id: `power-${type}-${i}`,
      type,
      value: null,
      knownBy: new Set(),
    });
  });

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

function dealCards(deck, playerCount) {
  const hands = [];
  for (let p = 0; p < playerCount; p++) {
    hands.push(deck.splice(0, 4));
  }
  return hands;
}

// Mark initial outer cards (index 0 and 3) as known by their owner
function markInitialPeek(hands, players) {
  hands.forEach((hand, i) => {
    const playerId = players[i].playerId;
    hand[0].knownBy.add(playerId);
    hand[3].knownBy.add(playerId);
  });
}

function reshuffleDiscard(room) {
  const top = room.discardPile.pop();
  // Shuffle all but the top card back into the deck
  const toReshuffle = room.discardPile.splice(0);
  toReshuffle.forEach(c => c.knownBy.clear()); // cards lose their known status when reshuffled
  for (let i = toReshuffle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [toReshuffle[i], toReshuffle[j]] = [toReshuffle[j], toReshuffle[i]];
  }
  room.deck = toReshuffle;
  room.discardPile = [top];
}

function drawFromDeck(room) {
  if (room.deck.length === 0) {
    if (room.discardPile.length <= 1) return null; // truly empty
    reshuffleDiscard(room);
  }
  return room.deck.shift();
}

function computeScores(room) {
  return room.players.map(player => {
    const score = player.hand.reduce((sum, card) => {
      return sum + (card.type === CARD_TYPES.NUMBER ? card.value : 0);
    }, 0);
    return { playerId: player.playerId, name: player.name, score };
  });
}

// Replace power cards remaining in a player's hand with drawn cards before scoring
function replacePowerCardsInHands(room) {
  room.players.forEach(player => {
    player.hand = player.hand.map(card => {
      if (card.type !== CARD_TYPES.NUMBER) {
        const replacement = drawFromDeck(room);
        if (replacement) {
          replacement.knownBy.clear();
          return replacement;
        }
        // If deck is truly empty (extremely rare), keep the power card with value 0
        return { ...card, value: 0, type: CARD_TYPES.NUMBER };
      }
      return card;
    });
  });
}

// Build what a specific player is allowed to see
function buildClientState(room, forPlayerId) {
  const { PHASES } = require('./constants');
  const isEnded = room.phase === PHASES.ENDED;

  const players = room.players.map(player => {
    const isMe = player.playerId === forPlayerId;
    const isCurrentTurn = room.players[room.currentPlayerIndex]?.playerId === player.playerId;

    const hand = player.hand.map(card => {
      const isKnownToMe = card.knownBy.has(forPlayerId);
      const reveal = isEnded || isKnownToMe;
      return {
        id: card.id,
        type: reveal ? card.type : null,
        value: reveal ? card.value : null,
        isKnownToMe,
        isRevealed: isEnded,
      };
    });

    return {
      playerId: player.playerId,
      name: player.name,
      isMe,
      isCurrentTurn,
      hand,
      hasCalledRata: player.hasCalledRata,
    };
  });

  // Only the current drawing player sees their drawnCard
  const currentPlayer = room.players[room.currentPlayerIndex];
  const drawnCard = (currentPlayer?.playerId === forPlayerId && room.drawnCard)
    ? {
        id: room.drawnCard.id,
        type: room.drawnCard.type,
        value: room.drawnCard.value,
      }
    : null;

  const discardTop = room.discardPile.length > 0
    ? {
        id: room.discardPile[room.discardPile.length - 1].id,
        type: room.discardPile[room.discardPile.length - 1].type,
        value: room.discardPile[room.discardPile.length - 1].value,
      }
    : null;

  return {
    roomCode: room.roomCode,
    phase: room.phase,
    turnPhase: room.turnPhase,
    myPlayerId: forPlayerId,
    players,
    deckSize: room.deck.length,
    discardTop,
    drawnCard,
    lastRoundCallerId: room.lastRoundCallerId,
    draw2Remaining: currentPlayer?.playerId === forPlayerId ? room.draw2Remaining : undefined,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
  };
}

// Build final state with all cards revealed + scores
function buildFinalState(room) {
  const scores = computeScores(room);
  const scoreMap = Object.fromEntries(scores.map(s => [s.playerId, s.score]));
  const minScore = Math.min(...scores.map(s => s.score));
  const winners = scores.filter(s => s.score === minScore).map(s => s.playerId);

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
    score: scoreMap[player.playerId],
    isWinner: winners.includes(player.playerId),
  }));

  return {
    roomCode: room.roomCode,
    phase: room.phase,
    players,
    winners,
    isTie: winners.length > 1,
  };
}

module.exports = {
  createDeck,
  dealCards,
  markInitialPeek,
  drawFromDeck,
  reshuffleDiscard,
  replacePowerCardsInHands,
  buildClientState,
  buildFinalState,
};
