import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import Card from './Card';
import socket from '../socket';

export default function OpponentHand({ player }) {
  const { state, dispatch } = useGame();
  const { pendingAction, swapSelection, roomCode } = state;

  const isSwapMode = pendingAction === 'swap' && swapSelection !== null;

  function handleCardClick(handIndex) {
    if (!isSwapMode) return;
    socket.emit('useSwap', {
      roomCode,
      myHandIndex: swapSelection.myHandIndex,
      targetPlayerId: player.playerId,
      targetHandIndex: handIndex,
    });
    dispatch({ type: ACTION_TYPES.CLEAR_PENDING_ACTION });
  }

  return (
    <div className={`opponent-hand ${player.isCurrentTurn ? 'opponent-active' : ''}`}>
      <div className="opponent-name">
        {player.isCurrentTurn && <span className="turn-arrow">▶ </span>}
        {player.name}
      </div>
      <div className="opponent-cards">
        {player.hand.map((card, i) => (
          <Card
            key={card.id || i}
            card={card}
            index={i}
            small
            faceDown={!card.isRevealed}
            onClick={isSwapMode ? () => handleCardClick(i) : undefined}
            highlighted={isSwapMode}
          />
        ))}
      </div>
    </div>
  );
}
