# readme-architecture.md

## System Architecture Overview

### Project: P2P Zoom-like Application
**Tech Stack**: Node.js + Express + WebRTC + Socket.IO

## High-Level Architecture

```
┌─────────────────┐    WebRTC P2P     ┌─────────────────┐
│   Client A      │◄─────────────────►│   Client B      │
│ (Browser/WebRTC)│                   │ (Browser/WebRTC)│
└─────────┬───────┘                   └─────────┬───────┘
          │                                     │
          │ Socket.IO Signaling                 │
          │                                     │
          └─────────────┐   ┌───────────────────┘
                        ▼   ▼
                ┌─────────────────┐
                │  Signaling      │
                │  Server         │
                │ (Node.js +      │
                │  Socket.IO)     │
                └─────────────────┘
```

## Component Breakdown

### 1. Backend Components

#### Signaling Server (Node.js + Express + Socket.IO)
- **Purpose**: Facilitate WebRTC peer discovery and connection establishment
- **Key Responsibilities**:
  - Room management (CRUD operations)
  - WebRTC signaling (offer/answer/ICE candidate exchange)
  - Peer tracking and notifications
  - Static file serving

#### REST API Endpoints
```
GET    /api/rooms           # List all rooms
POST   /api/rooms           # Create new room
GET    /api/rooms/:id       # Get specific room
DELETE /api/rooms/:id       # Delete room
```

#### Socket.IO Events
```javascript
// Client → Server
join-room { roomId, displayName }
signal { to, data }

// Server → Client
peers { peers: [socketId...] }
peer-joined { peerId, displayName }
peer-left { peerId }
signal { from, data }
```

### 2. Frontend Components

#### Core Files Structure
```
public/
├── index.html          # Room listing and creation
├── room.html           # Video call interface
└── app.js              # WebRTC client logic
```

#### WebRTC Client Logic
- **Media Capture**: getUserMedia() for video/audio
- **Peer Connections**: RTCPeerConnection management
- **Signaling Integration**: Socket.IO client for coordination
- **UI Controls**: Mute, camera toggle, screen sharing

### 3. Data Flow

#### Room Creation & Joining
1. User creates room via REST API
2. User navigates to room.html?id=ROOM_ID
3. Client joins room via Socket.IO
4. Server tracks peers and notifies existing participants

#### WebRTC Connection Establishment
1. **Signaling**: Peers exchange offers/answers via Socket.IO
2. **ICE**: Candidates exchanged for NAT traversal
3. **Media**: Direct P2P media streams established
4. **Data Channel**: Optional for chat/control messages

## Design Decisions & Rationale

### Why Node.js + Express?
- **Rapid Development**: Minimal boilerplate for REST + WebSocket
- **JavaScript Ecosystem**: Consistent language across stack
- **Socket.IO**: Mature WebSocket abstraction with fallbacks
- **Express**: Industry standard, lightweight web framework

### Why Full-Mesh Topology (4 users)?
- **Simplicity**: No media server required
- **Low Latency**: Direct peer connections
- **Cost Effective**: No central media processing
- **Limitation**: Bandwidth scales O(N-1), suitable for small groups

### WebRTC Architecture Patterns

#### Perfect Negotiation Pattern
- **Problem**: Avoids "glare" when both peers initiate simultaneously
- **Solution**: Designate polite/impolite peer roles
- **Implementation**: Lexicographic socket ID comparison

#### Deterministic Initiator Rule
```javascript
// Only initiate offers to peers with lexicographically greater IDs
if (localPeerId < remotePeerId) {
  createOffer();
}
```

## Scalability Considerations

### Current Limitations (4-user mesh)
- **Bandwidth**: Each peer uploads (N-1) streams
- **CPU**: Encoding multiple streams client-side
- **Network**: Requires good upstream for all participants

### Future Scaling Options
1. **SFU (Selective Forwarding Unit)**: Centralized media routing
2. **MCU (Multipoint Control Unit)**: Server-side media mixing
3. **Hybrid**: P2P for small groups, SFU for larger ones

## Security Architecture

### Current Phase (Development)
- **STUN Only**: Public servers for NAT traversal
- **No Authentication**: Open room access
- **HTTP**: Development-friendly setup

### Production Requirements
- **HTTPS**: Required for WebRTC getUserMedia
- **TURN Servers**: Private TURN (coturn) for enterprise NAT
- **Authentication**: JWT or session-based room access
- **Rate Limiting**: Prevent signaling abuse
- **CORS**: Restrict Socket.IO origins

## Technology Integration Points

### WebRTC Core APIs
```javascript
// Media Capture
navigator.mediaDevices.getUserMedia()

// Peer Connection
RTCPeerConnection()
pc.createOffer() / pc.createAnswer()
pc.setLocalDescription() / pc.setRemoteDescription()

// Data Channels
pc.createDataChannel()
```

### Socket.IO Integration
```javascript
// Client-side signaling
socket.emit('join-room', { roomId, displayName });
socket.on('signal', handleSignalingData);

// Server-side coordination
io.to(roomId).emit('peer-joined', { peerId, displayName });
```

## Future Architecture Enhancements

### Phase 5+: Database Integration
- **SQLite**: Local development persistence
- **PostgreSQL**: Production scaling
- **Prisma**: Type-safe database layer

### Phase 8: Production Features
- **Monitoring**: WebRTC statistics and connection quality
- **Recording**: Server-side media capture
- **Transcription**: Real-time speech-to-text
- **Screen Sharing**: getDisplayMedia integration

## Development Philosophy

### Incremental Complexity
1. Start with minimal viable implementation
2. Add features only when needed
3. Maintain backward compatibility
4. Test each phase thoroughly

### Code Organization Principles
- **Separation of Concerns**: WebRTC logic separate from UI
- **Event-Driven**: Socket.IO and WebRTC event handling
- **Error Resilience**: Graceful degradation and reconnection
- **Debugging**: Comprehensive logging for connection issues