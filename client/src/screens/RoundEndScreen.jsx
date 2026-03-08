import socket from '../socket';
import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';
import Card from '../components/Card';

export default function RoundEndScreen() {
  const { state } = useGame();
  const { roundState, isHost, roomCode } = state;

  if (!roundState) return null;

  const { currentRound, totalRounds, players, cumulativeScores } = roundState;

  // Sort cumulative by lowest score first (best = first)
  const sortedCumulative = [...cumulativeScores].sort((a, b) => a.totalScore - b.totalScore);

  // Round winner = lowest round score
  const roundWinner = [...players].sort((a, b) => a.roundScore - b.roundScore)[0];
  // Overall leader = lowest cumulative score
  const overallLeader = sortedCumulative[0];

  function handleNextRound() {
    socket.emit('startNextRound', { roomCode });
  }

  return (
    <div className="score-screen">
      <h2 className="round-end-title">{HE.ROUND_OF(currentRound, totalRounds)}</h2>

      {/* Round winner hero banner */}
      {roundWinner && (
        <div className="round-winner-banner">
          <span className="round-winner-icon">🏆</span>
          <span className="round-winner-name">{roundWinner.name}</span>
          <span className="round-winner-score">{HE.ROUND_WINNER_LABEL} {HE.POINTS(roundWinner.roundScore)}</span>
        </div>
      )}

      {/* Overall leader banner */}
      {overallLeader && (
        <div className="round-leader-banner">
          <span className="round-leader-icon">⭐</span>
          <span className="round-leader-name">{overallLeader.name}</span>
          <span className="round-leader-score">{HE.OVERALL_LEADER_LABEL} {HE.POINTS(overallLeader.totalScore)}</span>
        </div>
      )}

      {/* This round's results with card reveal */}
      <div className="round-section-label">{HE.ROUND_SCORES}</div>
      <div className="scores-list">
        {[...players]
          .sort((a, b) => a.roundScore - b.roundScore)
          .map((player, rank) => (
            <div key={player.playerId} className={`score-row ${rank === 0 ? 'winner-row' : ''}`}>
              <div className="score-rank">#{rank + 1}</div>
              <div className="score-name">
                {rank === 0 && '🏆 '}
                {player.name}
              </div>
              <div className="score-hand">
                {player.hand.map(card => (
                  <Card key={card.id} card={card} small forceReveal />
                ))}
              </div>
              <div className="score-value">{HE.POINTS(player.roundScore)}</div>
            </div>
          ))}
      </div>

      {/* Cumulative standings */}
      <div className="round-section-label">{HE.CUMULATIVE_SCORES}</div>
      <div className="scores-list">
        {sortedCumulative.map((entry, rank) => (
          <div key={entry.playerId} className={`score-row cumulative-row ${rank === 0 ? 'leader-row' : ''}`}>
            <div className="score-rank">#{rank + 1}</div>
            <div className="score-name">
              {rank === 0 && '⭐ '}
              {entry.name}
            </div>
            <div className="score-value cumulative-value">{HE.POINTS(entry.totalScore)}</div>
          </div>
        ))}
      </div>

      {/* Action */}
      {isHost ? (
        <button className="btn btn-start" onClick={handleNextRound}>
          {HE.NEXT_ROUND}
        </button>
      ) : (
        <p className="waiting-for-host">{HE.WAITING_NEXT_ROUND}</p>
      )}
    </div>
  );
}
