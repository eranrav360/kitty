import socket from '../socket';
import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';

export default function WaitingScreen() {
  const { state } = useGame();
  const { roomCode, isHost, waitingPlayers } = state;

  function handleStart() {
    socket.emit('startGame', { roomCode });
  }

  const canStart = waitingPlayers.length >= 2;

  return (
    <div className="waiting-screen">
      <h2 className="section-title">{HE.ROOM_CODE_DISPLAY}</h2>
      <div className="room-code-display">{roomCode}</div>
      <p className="share-hint">{HE.SHARE_CODE_HINT}</p>

      <div className="players-section">
        <h3 className="players-title">
          {HE.WAITING_PLAYERS} ({waitingPlayers.length}/4)
        </h3>
        <div className="players-list">
          {Array.from({ length: 4 }).map((_, i) => {
            const p = waitingPlayers[i];
            return (
              <div key={i} className={`player-slot ${p ? 'filled' : 'empty'}`}>
                {p ? (
                  <span className="player-name">
                    {p.isHost ? '👑 ' : '● '}
                    {p.name}
                    {p.isHost && <span className="host-badge"> {HE.HOST_LABEL}</span>}
                  </span>
                ) : (
                  <span className="waiting-slot">{HE.WAITING_SLOT}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isHost && (
        <div className="start-section">
          <button
            className={`btn btn-start ${canStart ? '' : 'disabled'}`}
            onClick={handleStart}
            disabled={!canStart}
          >
            {HE.START_GAME}
          </button>
          {!canStart && <p className="start-hint">{HE.START_GAME_HINT}</p>}
        </div>
      )}
      {!isHost && (
        <p className="waiting-for-host">ממתין למארח להתחיל את המשחק...</p>
      )}
    </div>
  );
}
