import { useEffect } from 'react';
import { useGame } from './context/GameContext';
import { useSocket } from './hooks/useSocket';
import socket from './socket';

import LobbyScreen from './screens/LobbyScreen';
import WaitingScreen from './screens/WaitingScreen';
import PeekScreen from './screens/PeekScreen';
import GameScreen from './screens/GameScreen';
import RoundEndScreen from './screens/RoundEndScreen';
import ScoreScreen from './screens/ScoreScreen';

export default function App() {
  const { state, dispatch } = useGame();

  // Register all socket listeners
  useSocket(dispatch);

  // Attempt rejoin on reconnect if we have identity
  useEffect(() => {
    function onReconnect() {
      if (state.myPlayerId && state.roomCode) {
        socket.emit('rejoinRoom', {
          roomCode: state.roomCode,
          playerId: state.myPlayerId,
        });
      }
    }
    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [state.myPlayerId, state.roomCode]);

  // Route to correct screen
  const { phase, roomCode } = state;

  if (phase === 'ENDED') return <ScoreScreen />;
  if (phase === 'ROUND_END') return <RoundEndScreen />;
  if (phase === 'PLAYING' || phase === 'LAST_ROUND') return <GameScreen />;
  if (phase === 'INITIAL_PEEK') return <PeekScreen />;
  if (roomCode) return <WaitingScreen />;
  return <LobbyScreen />;
}
