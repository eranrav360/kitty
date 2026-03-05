import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import { HE } from '../i18n/he';
import socket from '../socket';
import Card from './Card';

export default function ActionPanel() {
  const { state, dispatch } = useGame();
  const { turnPhase, drawnCard, players, myPlayerId, roomCode } = state;

  const me = players.find(p => p.playerId === myPlayerId);
  const isMyTurn = me?.isCurrentTurn;

  if (!isMyTurn) return null;

  function handleDiscard() {
    socket.emit('discardDrawn', { roomCode });
    dispatch({ type: ACTION_TYPES.CARD_DRAWN, payload: null });
  }

  function handleActivatePower() {
    // Server will transition to USING_POWER; show power modal
    socket.emit('discardDrawn', { roomCode }); // server checks if it's a power card and sets USING_POWER
  }

  // After drawing from deck: show drawn card + actions
  if (turnPhase === 'DREW_FROM_DECK' && drawnCard) {
    const isPower = drawnCard.type !== 'NUMBER';

    return (
      <div className="action-panel">
        <div className="drawn-card-area">
          <div className="drawn-label">קלף שמשכת:</div>
          <Card card={{ ...drawnCard, isKnownToMe: true, isRevealed: true }} forceReveal />
        </div>
        <div className="action-buttons">
          {isPower ? (
            <button className="btn btn-power" onClick={handleActivatePower}>
              {HE.USE_POWER}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={handleDiscard}>
              {HE.DISCARD_DRAWN}
            </button>
          )}
          <div className="swap-hint">{HE.SWAP_CARD_HINT}</div>
        </div>
      </div>
    );
  }

  // After drawing from discard: must swap
  if (turnPhase === 'DREW_FROM_DISCARD' && drawnCard) {
    return (
      <div className="action-panel">
        <div className="drawn-card-area">
          <div className="drawn-label">קלף שלקחת מהפסולת:</div>
          <Card card={{ ...drawnCard, isKnownToMe: true, isRevealed: true }} forceReveal />
        </div>
        <div className="swap-hint must-swap">{HE.SWAP_CARD_HINT} (חובה)</div>
      </div>
    );
  }

  return null;
}
