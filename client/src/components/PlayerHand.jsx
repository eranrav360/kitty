import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import Card from './Card';
import socket from '../socket';

export default function PlayerHand() {
  const { state, dispatch } = useGame();
  const { players, myPlayerId, turnPhase, drawnCard, pendingAction, swapSelection, roomCode } = state;

  const me = players.find(p => p.playerId === myPlayerId);
  if (!me) return null;

  const isMyTurn = me.isCurrentTurn;
  const canSwap = isMyTurn && (turnPhase === 'DREW_FROM_DECK' || turnPhase === 'DREW_FROM_DISCARD');
  const isPeekMode = isMyTurn && pendingAction === 'peek';
  const isSwapMode = isMyTurn && pendingAction === 'swap';

  function handleCardClick(index) {
    if (isPeekMode) {
      socket.emit('usePeek', { roomCode, targetHandIndex: index });
      dispatch({ type: ACTION_TYPES.CLEAR_PENDING_ACTION });
      return;
    }

    if (isSwapMode) {
      if (swapSelection === null) {
        // First step: select my card
        dispatch({ type: ACTION_TYPES.SET_SWAP_SELECTION, payload: { myHandIndex: index } });
      }
      return;
    }

    if (canSwap) {
      socket.emit('swapWithHand', { roomCode, handIndex: index });
    }
  }

  const isInteractive = canSwap || isPeekMode || (isSwapMode && swapSelection === null);

  return (
    <div className="player-hand">
      {me.hand.map((card, i) => (
        <Card
          key={card.id || i}
          card={card}
          index={i}
          onClick={isInteractive ? () => handleCardClick(i) : undefined}
          highlighted={
            canSwap ||
            isPeekMode ||
            (isSwapMode && swapSelection === null)
          }
          selected={swapSelection?.myHandIndex === i}
        />
      ))}
    </div>
  );
}
