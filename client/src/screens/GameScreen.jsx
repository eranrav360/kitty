import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import { HE } from '../i18n/he';
import socket from '../socket';
import TurnBanner from '../components/TurnBanner';
import OpponentHand from '../components/OpponentHand';
import DrawPile from '../components/DrawPile';
import PlayerHand from '../components/PlayerHand';
import ActionPanel from '../components/ActionPanel';
import PowerCardModal from '../components/PowerCardModal';
import RataButton from '../components/RataButton';

export default function GameScreen() {
  const { state, dispatch } = useGame();
  const { players, myPlayerId, pendingAction, peekReveal, showRataConfirm, errorMessage, swapAnnouncement } = state;

  const me = players.find(p => p.playerId === myPlayerId);
  const opponents = players.filter(p => p.playerId !== myPlayerId);
  const isMyTurn = me?.isCurrentTurn;
  const isPowerModal = state.turnPhase === 'USING_POWER';

  const [peekCountdown, setPeekCountdown] = useState(4);

  function clearPeek() {
    dispatch({ type: ACTION_TYPES.CLEAR_PEEK_REVEAL });
  }

  // Auto-dismiss peek overlay after 4 seconds with countdown
  useEffect(() => {
    if (!peekReveal) return;
    setPeekCountdown(4);
    let count = 4;
    const timer = setInterval(() => {
      count--;
      setPeekCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        dispatch({ type: ACTION_TYPES.CLEAR_PEEK_REVEAL });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [peekReveal]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="game-screen">
      {/* Turn indicator */}
      <TurnBanner />

      {/* Error toast */}
      {errorMessage && (
        <div className="error-toast-game">{errorMessage}</div>
      )}

      {/* Swap announcement (shown to all players except the swapper) */}
      {swapAnnouncement && swapAnnouncement.swapperPlayerId !== myPlayerId && (
        <div className="swap-announcement-banner">
          {HE.SWAP_ANNOUNCEMENT(
            swapAnnouncement.swapperName,
            swapAnnouncement.myPositionLabel,
            swapAnnouncement.targetPlayerName,
            swapAnnouncement.targetPositionLabel,
          )}
        </div>
      )}

      {/* Peek reveal overlay */}
      {peekReveal && (
        <div className="peek-reveal-overlay" onClick={clearPeek}>
          <div className="peek-reveal-card">
            <div className="peek-reveal-label">קלף #{peekReveal.handIndex + 1}</div>
            <div className="peek-reveal-value">
              {peekReveal.card.value !== null ? peekReveal.card.value : peekReveal.card.type}
            </div>
            <div className="peek-reveal-countdown">{peekCountdown}</div>
          </div>
        </div>
      )}

      {/* Opponents */}
      <div className="opponents-area">
        {opponents.map(opp => (
          <OpponentHand key={opp.playerId} player={opp} />
        ))}
      </div>

      {/* Draw area */}
      <DrawPile />

      {/* Action panel */}
      <ActionPanel />

      {/* My hand */}
      <div className="my-hand-section">
        <div className="my-hand-label">{HE.MY_CARDS}</div>
        <PlayerHand />
      </div>

      {/* Rata button */}
      <RataButton />

      {/* Rata confirm dialog */}
      {showRataConfirm && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <p className="modal-text">{HE.RATA_CONFIRM}</p>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  dispatch({ type: ACTION_TYPES.CLEAR_RATA_CONFIRM });
                  socket.emit('callRata', { roomCode: state.roomCode });
                }}
              >
                {HE.RATA_YES}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => dispatch({ type: ACTION_TYPES.CLEAR_RATA_CONFIRM })}
              >
                {HE.RATA_NO}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Power card modal */}
      {isPowerModal && <PowerCardModal />}
    </div>
  );
}
