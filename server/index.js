const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const gm = require('./gameManager');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on('createRoom', (data) => gm.createRoom(io, socket, data));
  socket.on('joinRoom', (data) => gm.joinRoom(io, socket, data));
  socket.on('rejoinRoom', (data) => gm.rejoinRoom(io, socket, data));
  socket.on('startGame', (data) => gm.startGame(io, socket, data));
  socket.on('startNextRound', (data) => gm.startNextRound(io, socket, data));
  socket.on('peekDone', (data) => gm.peekDone(io, socket, data));

  socket.on('drawFromDeck', (data) => gm.handleDrawFromDeck(io, socket, data));
  socket.on('drawFromDiscard', (data) => gm.handleDrawFromDiscard(io, socket, data));
  socket.on('swapWithHand', (data) => gm.handleSwapWithHand(io, socket, data));
  socket.on('discardDrawn', (data) => gm.handleDiscardDrawn(io, socket, data));

  socket.on('usePeek', (data) => gm.handleUsePeek(io, socket, data));
  socket.on('useSwap', (data) => gm.handleUseSwap(io, socket, data));
  socket.on('useDrawTwo', (data) => gm.handleUseDrawTwo(io, socket, data));

  socket.on('callRata', (data) => gm.handleCallRata(io, socket, data));

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    gm.handleDisconnect(io, socket);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Rata server running on port ${PORT}`);
  console.log(`Accepting connections from: ${CLIENT_ORIGIN}`);
});
