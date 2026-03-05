import { useEffect, useState } from 'react';
import socket from '../socket';
import { useGame } from '../context/GameContext';
import { HE } from '../i18n/he';
import Card from '../components/Card';

const PEEK_DURATION = 10; // seconds

export default function PeekScreen() {
  const { state } = useGame();
  const { roomCode, players, myPlayerId } = state;
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PEEK_DURATION);

  const me = players.find(p => p.playerId === myPlayerId);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleDone();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done]);

  function handleDone() {
    if (done) return;
    setDone(true);
    socket.emit('peekDone', { roomCode });
  }

  if (!me) return null;

  return (
    <div className="peek-screen">
      <h2 className="peek-title">{HE.PEEK_TITLE}</h2>
      <p className="peek-subtitle">{HE.PEEK_SUBTITLE}</p>

      {!done && (
        <div className="peek-timer">
          <div className="timer-circle">{timeLeft}</div>
        </div>
      )}

      <div className="peek-hand">
        {me.hand.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            index={i}
            forceReveal={i === 0 || i === 3}
          />
        ))}
      </div>

      {!done ? (
        <button className="btn btn-primary" onClick={handleDone}>
          {HE.PEEK_DONE}
        </button>
      ) : (
        <p className="peek-waiting">{HE.PEEK_WAITING}</p>
      )}
    </div>
  );
}
