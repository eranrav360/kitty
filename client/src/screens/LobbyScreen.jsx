import { useState } from 'react';
import socket from '../socket';
import { useGame } from '../context/GameContext';
import { ACTION_TYPES } from '../context/gameReducer';
import { HE } from '../i18n/he';

export default function LobbyScreen() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState('');

  function validate(requireCode) {
    if (!name.trim()) { setLocalError(HE.ERROR_NAME_REQUIRED); return false; }
    if (requireCode && code.trim().length !== 4) { setLocalError(HE.ERROR_CODE_INVALID); return false; }
    setLocalError('');
    return true;
  }

  function handleCreate() {
    if (!validate(false)) return;
    socket.emit('createRoom', { playerName: name.trim() });
    socket.once('roomCreated', ({ roomCode, playerId, playerName }) => {
      dispatch({ type: ACTION_TYPES.SET_MY_IDENTITY, payload: { playerId, playerName, isHost: true } });
      dispatch({ type: ACTION_TYPES.SET_ROOM_CODE, payload: roomCode });
      dispatch({ type: ACTION_TYPES.SET_WAITING_PLAYERS, payload: [{ playerId, name: playerName, isHost: true }] });
    });
  }

  function handleJoin() {
    if (!validate(true)) return;
    socket.emit('joinRoom', { roomCode: code.trim().toUpperCase(), playerName: name.trim() });
    socket.once('roomJoined', ({ roomCode, playerId, playerName }) => {
      dispatch({ type: ACTION_TYPES.SET_MY_IDENTITY, payload: { playerId, playerName, isHost: false } });
      dispatch({ type: ACTION_TYPES.SET_ROOM_CODE, payload: roomCode });
    });
  }

  const error = localError || state.errorMessage;

  return (
    <div className="lobby-screen">
      <div className="lobby-header">
        <div className="logo-circle">🃏</div>
        <h1 className="app-title">{HE.APP_TITLE}</h1>
        <p className="app-subtitle">{HE.APP_SUBTITLE}</p>
      </div>

      <div className="lobby-form">
        <label className="input-label">{HE.ENTER_NAME}</label>
        <input
          className="text-input"
          type="text"
          placeholder={HE.NAME_PLACEHOLDER}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        <button className="btn btn-primary" onClick={handleCreate}>
          {HE.CREATE_ROOM}
        </button>

        <div className="divider-text">{HE.OR}</div>

        <label className="input-label">{HE.ROOM_CODE_LABEL}</label>
        <input
          className="text-input code-input"
          type="text"
          placeholder={HE.ROOM_CODE_PLACEHOLDER}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
          maxLength={4}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />

        <button className="btn btn-secondary" onClick={handleJoin}>
          {HE.JOIN_ROOM}
        </button>

        {error && <div className="error-toast">{error}</div>}
      </div>

      <div className="connection-status">
        {state.isConnected
          ? <span className="status-dot connected" />
          : <span className="status-dot disconnected" />}
        <span>{state.isConnected ? HE.CONNECTED : HE.RECONNECTING}</span>
      </div>
    </div>
  );
}
