const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/rooms`);
});