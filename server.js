const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
            : "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
if (process.env.NODE_ENV === 'production') {
    const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    app.use(cors({
        origin: (origin, cb) => (!origin || origins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS'))
    }));
} else {
    app.use(cors());
}
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory rooms storage
const rooms = new Map();

// Track active connections per room
const roomConnections = new Map(); // roomId -> Set of socketIds

// Helper function to generate room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// REST API Routes

// GET /api/rooms - List all rooms
app.get('/api/rooms', (req, res) => {
    const roomsList = Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        ...room
    }));
    res.json(roomsList);
});

// POST /api/rooms - Create new room
app.post('/api/rooms', (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Room name is required' });
    }

    const roomId = generateRoomId();
    const room = {
        name,
        description: description || '',
        createdAt: new Date().toISOString(),
        participants: []
    };

    rooms.set(roomId, room);

    res.status(201).json({
        id: roomId,
        ...room
    });
});

// GET /api/rooms/:id - Get specific room
app.get('/api/rooms/:id', (req, res) => {
    const { id } = req.params;
    const room = rooms.get(id);

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
        id,
        ...room
    });
});

// DELETE /api/rooms/:id - Delete room
app.delete('/api/rooms/:id', (req, res) => {
    const { id } = req.params;

    if (!rooms.has(id)) {
        return res.status(404).json({ error: 'Room not found' });
    }

    rooms.delete(id);
    res.status(204).send();
});

// Socket.IO signaling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room event
    socket.on('join-room', ({ roomId, displayName }) => {
        console.log(`${socket.id} joining room ${roomId} as ${displayName}`);

        // Check if room exists
        if (!rooms.has(roomId)) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Join the socket.io room
        socket.join(roomId);

        // Track connection
        if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId).add(socket.id);

        // Store user info on socket
        socket.roomId = roomId;
        socket.displayName = displayName;

        // Get existing peers in room
        const existingPeers = Array.from(roomConnections.get(roomId))
            .filter(id => id !== socket.id);

        // Send existing peers to newcomer
        socket.emit('peers', { peers: existingPeers });

        // Notify existing peers about new user
        socket.to(roomId).emit('peer-joined', {
            peerId: socket.id,
            displayName
        });
    });

    // Signal forwarding for WebRTC
    socket.on('signal', ({ to, data }) => {
        console.log(`Forwarding signal from ${socket.id} to ${to}`);
        socket.to(to).emit('signal', {
            from: socket.id,
            data
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        if (socket.roomId) {
            const roomId = socket.roomId;

            // Remove from room connections
            if (roomConnections.has(roomId)) {
                roomConnections.get(roomId).delete(socket.id);

                // Clean up empty room connections
                if (roomConnections.get(roomId).size === 0) {
                    roomConnections.delete(roomId);
                }
            }

            // Notify peers about departure
            socket.to(roomId).emit('peer-left', {
                peerId: socket.id
            });
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/rooms`);
    console.log(`Socket.IO ready for signaling`);
});