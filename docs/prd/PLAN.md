# Roadmap: Build a P2P Zoom‑like app with Node.js + WebRTC

This plan takes you from a basic CRUD app to a peer‑to‑peer (P2P) 1:1 video call, then to a 4‑user mesh. It keeps the stack minimal and pragmatic so you can ship and learn quickly.

## Tech stack
- Backend (Node.js + Express)
  - REST CRUD: rooms (start), later users/messages if needed
  - WebSocket signaling (Socket.IO) for WebRTC offers/answers/ICE
  - Room membership tracking
- Frontend (vanilla HTML/JS)
  - Get user media (webcam/mic)
  - Peer connection logic per room
  - For 4 users: full‑mesh (each peer connects to each peer)
- STUN/TURN servers
  - Public STUN for dev; add your own TURN (coturn) for reliability/NAT

## Folder structure (initial)
```
zoom-clone/
  server.js
  package.json
  public/
    index.html
    room.html
    app.js
  src/
    signaling.js   (optional split later)
    db.js          (in-memory first; swap to SQLite/Prisma later)
```

## Phase 0: Setup
- npm init -y
- npm i express socket.io cors
- npm i -D nodemon
- package.json scripts:
  - "dev": "nodemon server.js"
  - "start": "node server.js"

## Phase 1: Basic CRUD (Rooms) + Static hosting
- Implement in-memory rooms Map and REST endpoints:
  - GET /api/rooms
  - POST /api/rooms
  - GET /api/rooms/:id
  - DELETE /api/rooms/:id
- Serve static files from /public

## Phase 2: Socket signaling and minimal UI
- Socket events:
  - join-room { roomId, displayName }
  - peers { peers: [socketId...] } to newcomer
  - peer-joined { peerId, displayName } to room
  - signal { to, data } and echoed { from, data }
  - peer-left { peerId }
- public/index.html: list rooms, create room, link to room.html?id=ROOM_ID
- public/room.html: shows local video and remote container
- public/app.js: WebRTC logic for 1:1

## Phase 3: 1:1 P2P call working
- Media capture: getUserMedia({ video: true, audio: true })
- RTCPeerConnection with STUN servers
- Initiator creates offer; responder answers
- Exchange ICE candidates via signaling
- Add basic failure handling (restartIce when failed)

## Phase 4: Improve robustness
- Adopt perfect negotiation (polite peer) to avoid glare
- Add a data channel (chat / control)
- UI: mute/unmute, camera toggle

## Phase 5: Real DB (optional now)
- Swap in-memory store with SQLite (better-sqlite3) or Prisma
- Keep endpoints the same

## Phase 6: 4‑user full‑mesh
- Deterministic initiator rule to avoid glare:
  - Only initiate offers to peers whose ID is lexicographically greater than yours
- Maintain Map peerId -> { pc, videoEl, dc }
- Watch uplink bandwidth; it’s O(N-1) upstreams

## Phase 7: NAT traversal and TURN
- Keep STUN for dev
- Add TURN (coturn) for production networks
- Add HTTPS (secure context required by WebRTC in production)

## Phase 8: Production concerns
- AuthN/AuthZ: JWT or integrate with existing Laravel auth
- Rate limiting REST + signaling
- CORS/origin checks for Socket.IO
- Logging + metrics
- Screen share via getDisplayMedia and renegotiation
- Bandwidth controls per track with RTCRtpSender.setParameters

## Why Node + Express?
- Express provides routing, JSON parsing, static file serving, and middleware. It’s the most common minimal web framework in Node.
- You can absolutely build signaling on pure `http` + `ws` without Express; Express just reduces boilerplate for REST and static.
- Learning both Node and Express together is typical and not much harder: Express is thin and idiomatic.

If you prefer to avoid Express initially:
- Start with `http.createServer()` and `socket.io` for signaling, and serve static files with a tiny handler. You can add Express later without changing your WebRTC logic.
