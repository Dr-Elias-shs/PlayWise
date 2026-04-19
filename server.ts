import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Render requires listening on all interfaces
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Simple room-based logic for classroom challenges
  const rooms = new Map<string, any>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId, playerName }) => {
      socket.join(roomId);
      console.log(`${playerName} joined room: ${roomId}`);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { players: [], gameState: 'waiting', config: null });
      }
      
      const room = rooms.get(roomId);
      room.players.push({ id: socket.id, name: playerName, score: 0, streak: 0 });
      
      io.to(roomId).emit('room_update', room);
    });

    socket.on('start_game', ({ roomId, config }) => {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.gameState = 'playing';
        room.config = config;
        io.to(roomId).emit('game_started', room);
      }
    });

    socket.on('submit_score', ({ roomId, score, streak }) => {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const player = room.players.find((p: any) => p.id === socket.id);
        if (player) {
          player.score = score;
          player.streak = streak;
        }
        io.to(roomId).emit('leaderboard_update', room.players);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Logic to cleanup empty rooms or remove players
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});