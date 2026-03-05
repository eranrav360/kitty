import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';
import Card from '../components/Card';

export default function ScoreScreen() {
  const { state } = useGame();
  const { finalState } = state;

  if (!finalState) return null;

  const { players, winners, isTie } = finalState;
  const winnerName = players.find(p => p.playerId === winners[0])?.name;

  function handlePlayAgain() {
    window.location.reload();
  }

  const sorted = [...players].sort((a, b) => a.score - b.score);

  return (
    <div className="score-screen">
      <h1 className="game-over-title">{HE.GAME_OVER}</h1>

      <div className="winner-banner">
        {isTie ? HE.TIE : HE.WINNER(winnerName)}
      </div>

      <div className="scores-list">
        {sorted.map((player, rank) => (
          <div
            key={player.playerId}
            className={`score-row ${player.isWinner ? 'winner-row' : ''}`}
          >
            <div className="score-rank">#{rank + 1}</div>
            <div className="score-name">
              {player.isWinner && '🏆 '}
              {player.name}
            </div>
            <div className="score-hand">
              {player.hand.map(card => (
                <Card key={card.id} card={card} small forceReveal />
              ))}
            </div>
            <div className="score-value">{HE.POINTS(player.score)}</div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handlePlayAgain}>
        {HE.PLAY_AGAIN}
      </button>
    </div>
  );
}
