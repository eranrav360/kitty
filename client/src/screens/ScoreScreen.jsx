import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';
import Card from '../components/Card';

export default function ScoreScreen() {
  const { state } = useGame();
  const { finalState } = state;

  if (!finalState) return null;

  const { players, winners, isTie, totalRounds, cumulativeScores } = finalState;
  const winnerName = players.find(p => p.playerId === winners[0])?.name;

  function handlePlayAgain() {
    window.location.reload();
  }

  // Sort by totalScore ascending (lowest = best)
  const sorted = [...players].sort((a, b) => a.totalScore - b.totalScore);

  // Cumulative standings sorted
  const sortedCumulative = cumulativeScores
    ? [...cumulativeScores].sort((a, b) => a.totalScore - b.totalScore)
    : null;

  return (
    <div className="score-screen">
      <h1 className="game-over-title">{HE.GAME_OVER}</h1>
      {totalRounds > 1 && (
        <p className="round-end-title">{HE.ROUND_OF(totalRounds, totalRounds)}</p>
      )}

      <div className="winner-banner">
        {isTie ? HE.TIE : HE.WINNER(winnerName)}
      </div>

      {/* Last round cards reveal */}
      <div className="round-section-label">{HE.ROUND_SCORES}</div>
      <div className="scores-list">
        {[...players].sort((a, b) => a.roundScore - b.roundScore).map((player, rank) => (
          <div
            key={player.playerId}
            className={`score-row ${player.isWinner && totalRounds === 1 ? 'winner-row' : ''}`}
          >
            <div className="score-rank">#{rank + 1}</div>
            <div className="score-name">{player.name}</div>
            <div className="score-hand">
              {player.hand.map(card => (
                <Card key={card.id} card={card} small forceReveal />
              ))}
            </div>
            <div className="score-value">{HE.POINTS(player.roundScore)}</div>
          </div>
        ))}
      </div>

      {/* Final cumulative standings */}
      {totalRounds > 1 && sortedCumulative && (
        <>
          <div className="round-section-label">{HE.FINAL_SCORES}</div>
          <div className="scores-list">
            {sortedCumulative.map((entry, rank) => (
              <div
                key={entry.playerId}
                className={`score-row cumulative-row ${winners.includes(entry.playerId) ? 'winner-row' : ''}`}
              >
                <div className="score-rank">#{rank + 1}</div>
                <div className="score-name">
                  {winners.includes(entry.playerId) && '🏆 '}
                  {entry.name}
                </div>
                <div className="score-value cumulative-value">{HE.POINTS(entry.totalScore)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn btn-primary" onClick={handlePlayAgain}>
        {HE.PLAY_AGAIN}
      </button>
    </div>
  );
}
