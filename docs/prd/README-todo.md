# README-todo.md

## Project Status: Planning Phase
**Goal**: Build a P2P Zoom-like app with Node.js + WebRTC

## Current Task Breakdown

### Phase 0: Setup ⏳
- [ ] Initialize npm project (`npm init -y`)
- [ ] Install dependencies (`npm i express socket.io cors`)
- [ ] Install dev dependencies (`npm i -D nodemon`)
- [ ] Configure package.json scripts
  - [ ] "dev": "nodemon server.js"
  - [ ] "start": "node server.js"
- [ ] Create folder structure

### Phase 1: Basic CRUD (Rooms) + Static hosting 📋
- [ ] Implement in-memory rooms Map
- [ ] Create REST endpoints:
  - [ ] GET /api/rooms
  - [ ] POST /api/rooms
  - [ ] GET /api/rooms/:id
  - [ ] DELETE /api/rooms/:id
- [ ] Set up static file serving from /public
- [ ] Create basic server.js

### Phase 2: Socket signaling and minimal UI 🔌
- [ ] Implement Socket.IO events:
  - [ ] join-room { roomId, displayName }
  - [ ] peers { peers: [socketId...] } to newcomer
  - [ ] peer-joined { peerId, displayName } to room
  - [ ] signal { to, data } and echoed { from, data }
  - [ ] peer-left { peerId }
- [ ] Create public/index.html (room list, create room, navigation)
- [ ] Create public/room.html (video containers)
- [ ] Create public/app.js (WebRTC logic foundation)

### Phase 3: 1:1 P2P call working 🎥
- [ ] Implement getUserMedia for video/audio capture
- [ ] Set up RTCPeerConnection with STUN servers
- [ ] Implement offer/answer exchange
- [ ] Handle ICE candidate exchange via signaling
- [ ] Add basic failure handling (restartIce)

### Phase 4: Improve robustness 🛠️
- [ ] Implement perfect negotiation (polite peer pattern)
- [ ] Add data channel for chat/control
- [ ] Create UI controls:
  - [ ] Mute/unmute audio
  - [ ] Toggle camera on/off

### Phase 5: Real DB (optional) 💾
- [ ] Evaluate need for persistent storage
- [ ] If needed: integrate SQLite (better-sqlite3) or Prisma
- [ ] Maintain existing API endpoints

### Phase 6: 4-user full-mesh 👥
- [ ] Implement deterministic initiator rule (lexicographic ID comparison)
- [ ] Create peer management system: Map peerId -> { pc, videoEl, dc }
- [ ] Handle multiple simultaneous connections
- [ ] Monitor uplink bandwidth (O(N-1) streams)

### Phase 7: NAT traversal and TURN 🌐
- [ ] Keep STUN for development
- [ ] Research and set up TURN server (coturn) for production
- [ ] Implement HTTPS (required for WebRTC in production)

### Phase 8: Production concerns 🚀
- [ ] Authentication/Authorization integration
- [ ] Rate limiting for REST + signaling
- [ ] CORS/origin checks for Socket.IO
- [ ] Logging and metrics
- [ ] Screen sharing via getDisplayMedia
- [ ] Bandwidth controls with RTCRtpSender.setParameters

## Progress Log
*Updates will be added as phases are completed*

## Next Steps
1. Begin Phase 0: Project setup and initialization
2. Create basic folder structure as defined in PLAN.md
3. Set up development environment

## Notes
- Focus on minimal viable implementation at each phase
- Test thoroughly at each phase before proceeding
- Keep architecture simple and pragmatic
- Document decisions and learnings as we progress