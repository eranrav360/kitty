import { useEffect } from 'react';
import socket from '../socket';
import { ACTION_TYPES } from '../context/gameReducer';

export function useSocket(dispatch) {
  useEffect(() => {
    socket.on('connect', () => dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: true }));
    socket.on('disconnect', () => dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false }));

    socket.on('playerJoined', ({ players }) => {
      dispatch({ type: ACTION_TYPES.SET_WAITING_PLAYERS, payload: players });
    });

    socket.on('gameStarted', (gs) => {
      dispatch({ type: ACTION_TYPES.GAME_STATE_UPDATED, payload: gs });
    });

    socket.on('allPeeked', () => {
      // State update already sent via gameStateUpdated
    });

    socket.on('gameStateUpdated', (gs) => {
      dispatch({ type: ACTION_TYPES.GAME_STATE_UPDATED, payload: gs });
    });

    socket.on('cardDrawn', (card) => {
      dispatch({ type: ACTION_TYPES.CARD_DRAWN, payload: card });
    });

    socket.on('peekResult', (data) => {
      dispatch({ type: ACTION_TYPES.PEEK_RESULT, payload: data });
    });

    socket.on('rataCalled', (data) => {
      dispatch({ type: ACTION_TYPES.RATA_CALLED, payload: data });
    });

    socket.on('roundEnded', (data) => {
      dispatch({ type: ACTION_TYPES.ROUND_ENDED, payload: data });
    });

    socket.on('gameEnded', (data) => {
      dispatch({ type: ACTION_TYPES.GAME_ENDED, payload: data });
    });

    socket.on('errorOccurred', ({ message }) => {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: message });
      setTimeout(() => dispatch({ type: ACTION_TYPES.CLEAR_ERROR }), 3000);
      // Room or player no longer exists → wipe stale state and return to lobby
      if (message === 'חדר לא נמצא' || message === 'שחקן לא נמצא') {
        dispatch({ type: ACTION_TYPES.RESET_TO_LOBBY });
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('allPeeked');
      socket.off('gameStateUpdated');
      socket.off('cardDrawn');
      socket.off('peekResult');
      socket.off('rataCalled');
      socket.off('roundEnded');
      socket.off('gameEnded');
      socket.off('errorOccurred');
    };
  }, [dispatch]);
}
