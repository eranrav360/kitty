import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';

export default function TurnBanner() {
  const { state } = useGame();
  const { players, myPlayerId, phase, lastRoundCallerId } = state;

  const currentPlayer = players.find(p => p.isCurrentTurn);
  const isMyTurn = currentPlayer?.playerId === myPlayerId;
  const isLastRound = phase === 'LAST_ROUND';

  const callerName = players.find(p => p.playerId === lastRoundCallerId)?.name;

  return (
    <div className={`turn-banner ${isMyTurn ? 'my-turn' : ''} ${isLastRound ? 'last-round' : ''}`}>
      {isLastRound && (
        <div className="last-round-badge">{HE.LAST_ROUND}</div>
      )}
      <div className="turn-text">
        {isMyTurn
          ? HE.YOUR_TURN
          : HE.OPPONENT_TURN(currentPlayer?.name || '...')}
      </div>
      {isLastRound && callerName && (
        <div className="last-round-detail">{HE.LAST_ROUND_DETAIL(callerName)}</div>
      )}
    </div>
  );
}
