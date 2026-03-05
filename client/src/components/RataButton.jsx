import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import { HE } from '../i18n/he';

export default function RataButton() {
  const { state, dispatch } = useGame();
  const { phase, turnPhase, players, myPlayerId } = state;

  const me = players.find(p => p.playerId === myPlayerId);
  // Rata can be called when it's IDLE phase (turn just finished) and game is active
  const canCallRata =
    (phase === 'PLAYING') &&
    turnPhase === 'IDLE' &&
    !me?.hasCalledRata;

  if (!canCallRata) return null;

  return (
    <button
      className="rata-btn"
      onClick={() => dispatch({ type: ACTION_TYPES.SET_RATA_CONFIRM })}
    >
      {HE.CALL_RATA}
    </button>
  );
}
