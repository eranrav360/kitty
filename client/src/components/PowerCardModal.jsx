import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import { HE } from '../i18n/he';
import socket from '../socket';
import Card from './Card';

export default function PowerCardModal() {
  const { state, dispatch } = useGame();
  const { drawnCard, players, myPlayerId, roomCode, swapSelection } = state;

  if (!drawnCard) return null;

  const me = players.find(p => p.playerId === myPlayerId);
  const opponents = players.filter(p => p.playerId !== myPlayerId);

  function handlePeekCard(index) {
    socket.emit('usePeek', { roomCode, targetHandIndex: index });
    dispatch({ type: ACTION_TYPES.CLEAR_PENDING_ACTION });
  }

  function handleSelectMyCard(index) {
    dispatch({ type: ACTION_TYPES.SET_SWAP_SELECTION, payload: { myHandIndex: index } });
  }

  function handleSelectOpponentCard(targetPlayerId, targetHandIndex) {
    if (!swapSelection) return;
    socket.emit('useSwap', {
      roomCode,
      myHandIndex: swapSelection.myHandIndex,
      targetPlayerId,
      targetHandIndex,
    });
    dispatch({ type: ACTION_TYPES.CLEAR_PENDING_ACTION });
  }

  function handleDrawTwo() {
    socket.emit('useDrawTwo', { roomCode });
    dispatch({ type: ACTION_TYPES.CLEAR_PENDING_ACTION });
  }

  function handleCancel() {
    // Can't truly cancel a power card once drawn — just re-enable USING_POWER state
    // In practice, power cards must be used. We skip cancel logic for Peek/Swap.
    // Draw2 can be "declined" by just swapping or discarding in the flow
    dispatch({ type: ACTION_TYPES.CLEAR_PENDING_ACTION });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-dialog power-modal">

        {drawnCard.type === 'PEEK' && (
          <>
            <h3 className="modal-title">{HE.POWER_PEEK_TITLE}</h3>
            <p className="modal-hint">{HE.POWER_PEEK_HINT}</p>
            <div className="modal-hand">
              {me?.hand.map((card, i) => (
                <Card
                  key={card.id || i}
                  card={card}
                  index={i}
                  onClick={() => handlePeekCard(i)}
                  highlighted
                />
              ))}
            </div>
          </>
        )}

        {drawnCard.type === 'SWAP' && (
          <>
            <h3 className="modal-title">{HE.POWER_SWAP_TITLE}</h3>
            {!swapSelection ? (
              <>
                <p className="modal-hint">{HE.POWER_SWAP_HINT_MINE}</p>
                <div className="modal-hand">
                  {me?.hand.map((card, i) => (
                    <Card
                      key={card.id || i}
                      card={card}
                      index={i}
                      onClick={() => handleSelectMyCard(i)}
                      highlighted
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="modal-hint">{HE.POWER_SWAP_HINT_OPPONENT}</p>
                {opponents.map(opp => (
                  <div key={opp.playerId} className="swap-opponent-section">
                    <div className="swap-opponent-name">{opp.name}</div>
                    <div className="modal-hand">
                      {opp.hand.map((card, i) => (
                        <Card
                          key={card.id || i}
                          card={card}
                          index={i}
                          faceDown
                          onClick={() => handleSelectOpponentCard(opp.playerId, i)}
                          highlighted
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {drawnCard.type === 'DRAW2' && (
          <>
            <h3 className="modal-title">{HE.POWER_DRAW2_TITLE}</h3>
            <p className="modal-hint">{HE.POWER_DRAW2_HINT}</p>
            <button className="btn btn-power" onClick={handleDrawTwo}>
              משוך!
            </button>
          </>
        )}
      </div>
    </div>
  );
}
