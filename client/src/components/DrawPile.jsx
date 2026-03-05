import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';
import socket from '../socket';
import Card from './Card';

export default function DrawPile() {
  const { state } = useGame();
  const { deckSize, discardTop, turnPhase, players, myPlayerId, roomCode, draw2Remaining } = state;

  const me = players.find(p => p.playerId === myPlayerId);
  const isMyTurn = me?.isCurrentTurn;

  const canDrawFromDeck = isMyTurn && (turnPhase === 'IDLE' || turnPhase === 'DRAW2_PENDING');
  const canDrawFromDiscard = isMyTurn && turnPhase === 'IDLE' &&
    discardTop && discardTop.type === 'NUMBER';

  function handleDeckClick() {
    if (!canDrawFromDeck) return;
    socket.emit('drawFromDeck', { roomCode });
  }

  function handleDiscardClick() {
    if (!canDrawFromDiscard) return;
    socket.emit('drawFromDiscard', { roomCode });
  }

  return (
    <div className="draw-pile-area">
      {draw2Remaining > 0 && (
        <div className="draw2-banner">משיכה כפולה! נותרו {draw2Remaining} משיכות</div>
      )}

      <div className="piles-row">
        {/* Deck */}
        <div className="pile-section">
          <div
            className={`deck-pile ${canDrawFromDeck ? 'pile-clickable' : ''}`}
            onClick={handleDeckClick}
          >
            {deckSize > 0 ? (
              <div className="deck-back">
                <span className="deck-icon">🃏</span>
                <span className="deck-count">{deckSize}</span>
              </div>
            ) : (
              <div className="deck-empty">{HE.DECK_EMPTY}</div>
            )}
          </div>
          <div className="pile-label">{HE.DECK_LABEL}</div>
        </div>

        {/* Discard */}
        <div className="pile-section">
          <div
            className={`discard-pile ${canDrawFromDiscard ? 'pile-clickable' : ''}`}
            onClick={handleDiscardClick}
          >
            {discardTop ? (
              <Card card={discardTop} forceReveal />
            ) : (
              <div className="discard-empty">—</div>
            )}
          </div>
          <div className="pile-label">{HE.DISCARD_LABEL}</div>
        </div>
      </div>
    </div>
  );
}
