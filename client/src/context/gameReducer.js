export const ACTION_TYPES = {
  SET_CONNECTED: 'SET_CONNECTED',
  SET_MY_IDENTITY: 'SET_MY_IDENTITY',
  SET_ROOM_CODE: 'SET_ROOM_CODE',
  SET_TOTAL_ROUNDS: 'SET_TOTAL_ROUNDS',
  GAME_STATE_UPDATED: 'GAME_STATE_UPDATED',
  CARD_DRAWN: 'CARD_DRAWN',
  PEEK_RESULT: 'PEEK_RESULT',
  RATA_CALLED: 'RATA_CALLED',
  ROUND_ENDED: 'ROUND_ENDED',
  GAME_ENDED: 'GAME_ENDED',
  SET_PENDING_ACTION: 'SET_PENDING_ACTION',
  CLEAR_PENDING_ACTION: 'CLEAR_PENDING_ACTION',
  CLEAR_PEEK_REVEAL: 'CLEAR_PEEK_REVEAL',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_RATA_CONFIRM: 'SET_RATA_CONFIRM',
  CLEAR_RATA_CONFIRM: 'CLEAR_RATA_CONFIRM',
  SET_SWAP_SELECTION: 'SET_SWAP_SELECTION',
  CLEAR_SWAP_SELECTION: 'CLEAR_SWAP_SELECTION',
  SET_WAITING_PLAYERS: 'SET_WAITING_PLAYERS',
  RESET_TO_LOBBY: 'RESET_TO_LOBBY',
  SET_SWAP_ANNOUNCEMENT: 'SET_SWAP_ANNOUNCEMENT',
  CLEAR_SWAP_ANNOUNCEMENT: 'CLEAR_SWAP_ANNOUNCEMENT',
  SET_POWER_ANNOUNCEMENT: 'SET_POWER_ANNOUNCEMENT',
  CLEAR_POWER_ANNOUNCEMENT: 'CLEAR_POWER_ANNOUNCEMENT',
};

export const initialState = {
  myPlayerId: null,
  myName: '',
  roomCode: null,
  isHost: false,

  // Game state from server
  phase: 'LOBBY',
  turnPhase: 'IDLE',
  players: [],
  deckSize: 0,
  discardTop: null,
  drawnCard: null,
  drawnFromDiscard: false,
  lastRoundCallerId: null,
  draw2Remaining: 0,

  // Multi-round tracking
  currentRound: 1,
  totalRounds: 3,
  roundState: null,   // data from roundEnded event

  // Final game state
  finalState: null,

  // UI state
  pendingAction: null,   // 'peek' | 'swap' | null
  peekReveal: null,      // { handIndex, card }
  swapSelection: null,   // { myHandIndex } — first step of swap
  showRataConfirm: false,
  errorMessage: null,

  // Announcements
  swapAnnouncement: null,           // { swapperName, swapperPlayerId, myPositionLabel, targetPlayerName, targetPositionLabel }
  swapAnnouncementWatchPlayerId: null, // cleared when THIS player's turn ends
  powerAnnouncement: null,          // { playerName, playerId, cardType }

  isConnected: false,

  // Lobby waiting room players list
  waitingPlayers: [],
};

export function gameReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_CONNECTED:
      return { ...state, isConnected: action.payload };

    case ACTION_TYPES.SET_MY_IDENTITY:
      return {
        ...state,
        myPlayerId: action.payload.playerId,
        myName: action.payload.playerName,
        isHost: action.payload.isHost ?? false,
      };

    case ACTION_TYPES.SET_ROOM_CODE:
      return { ...state, roomCode: action.payload };

    case ACTION_TYPES.SET_TOTAL_ROUNDS:
      return { ...state, totalRounds: action.payload };

    case ACTION_TYPES.SET_WAITING_PLAYERS:
      return { ...state, waitingPlayers: action.payload };

    case ACTION_TYPES.GAME_STATE_UPDATED: {
      // --- Turn-based announcement clearing ---
      // When the turn player changes, advance the swap-announcement lifecycle:
      //   • 1st GAME_STATE_UPDATED after SET_SWAP_ANNOUNCEMENT → record who is now playing
      //   • 2nd change (that recorded player's turn ends) → clear the announcement
      const newCurrentPlayer = action.payload.players?.find(p => p.isCurrentTurn);
      const newCurrentId = newCurrentPlayer?.playerId ?? null;

      let swapAnn = state.swapAnnouncement;
      let watchId = state.swapAnnouncementWatchPlayerId;
      if (swapAnn && newCurrentId) {
        if (!watchId) {
          // First update after the swap — remember who is playing next
          watchId = newCurrentId;
        } else if (newCurrentId !== watchId) {
          // Watched player's turn ended — clear
          swapAnn = null;
          watchId = null;
        }
      }

      // Clear power announcement when the announcing player's turn ends
      let powerAnn = state.powerAnnouncement;
      if (powerAnn && newCurrentId && newCurrentId !== powerAnn.playerId) {
        powerAnn = null;
      }

      return {
        ...state,
        phase: action.payload.phase,
        turnPhase: action.payload.turnPhase,
        players: action.payload.players,
        deckSize: action.payload.deckSize,
        discardTop: action.payload.discardTop,
        drawnCard: action.payload.drawnCard ?? state.drawnCard,
        drawnFromDiscard: action.payload.drawnFromDiscard ?? false,
        lastRoundCallerId: action.payload.lastRoundCallerId,
        draw2Remaining: action.payload.draw2Remaining ?? 0,
        roomCode: action.payload.roomCode ?? state.roomCode,
        currentRound: action.payload.currentRound ?? state.currentRound,
        totalRounds: action.payload.totalRounds ?? state.totalRounds,
        roundState: null,
        swapAnnouncement: swapAnn,
        swapAnnouncementWatchPlayerId: watchId,
        powerAnnouncement: powerAnn,
      };
    }

    case ACTION_TYPES.CARD_DRAWN:
      return { ...state, drawnCard: action.payload };

    case ACTION_TYPES.PEEK_RESULT:
      return { ...state, peekReveal: action.payload, pendingAction: null };

    case ACTION_TYPES.RATA_CALLED:
      return { ...state, showRataConfirm: false };

    case ACTION_TYPES.ROUND_ENDED:
      return {
        ...state,
        phase: 'ROUND_END',
        roundState: action.payload,
        currentRound: action.payload.currentRound,
        totalRounds: action.payload.totalRounds,
      };

    case ACTION_TYPES.GAME_ENDED:
      return { ...state, finalState: action.payload, phase: 'ENDED' };

    case ACTION_TYPES.SET_PENDING_ACTION:
      return { ...state, pendingAction: action.payload };

    case ACTION_TYPES.CLEAR_PENDING_ACTION:
      return { ...state, pendingAction: null, swapSelection: null };

    case ACTION_TYPES.CLEAR_PEEK_REVEAL:
      return { ...state, peekReveal: null };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, errorMessage: action.payload };

    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, errorMessage: null };

    case ACTION_TYPES.SET_RATA_CONFIRM:
      return { ...state, showRataConfirm: true };

    case ACTION_TYPES.CLEAR_RATA_CONFIRM:
      return { ...state, showRataConfirm: false };

    case ACTION_TYPES.SET_SWAP_SELECTION:
      return { ...state, swapSelection: action.payload };

    case ACTION_TYPES.CLEAR_SWAP_SELECTION:
      return { ...state, swapSelection: null };

    // Room no longer exists (server restart / disconnect timeout) — go back to lobby
    case ACTION_TYPES.RESET_TO_LOBBY:
      return { ...initialState, isConnected: state.isConnected };

    case ACTION_TYPES.SET_SWAP_ANNOUNCEMENT:
      // Reset watch ID so GAME_STATE_UPDATED knows to capture the next player
      return { ...state, swapAnnouncement: action.payload, swapAnnouncementWatchPlayerId: null };

    case ACTION_TYPES.CLEAR_SWAP_ANNOUNCEMENT:
      return { ...state, swapAnnouncement: null, swapAnnouncementWatchPlayerId: null };

    case ACTION_TYPES.SET_POWER_ANNOUNCEMENT:
      return { ...state, powerAnnouncement: action.payload };

    case ACTION_TYPES.CLEAR_POWER_ANNOUNCEMENT:
      return { ...state, powerAnnouncement: null };

    default:
      return state;
  }
}
