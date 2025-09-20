// WebRTC and Socket.IO client logic
class WebRTCApp {
    constructor() {
        this.socket = null;
        this.localStream = null;
        this.peers = new Map(); // peerId -> { pc: RTCPeerConnection, videoEl: HTMLVideoElement }
        this.roomId = null;
        this.displayName = null;
        this.isMuted = false;
        this.isVideoOff = false;

        // STUN servers for NAT traversal
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    async initialize(roomId, displayName) {
        this.roomId = roomId;
        this.displayName = displayName;

        try {
            // Initialize Socket.IO
            this.socket = io();
            this.setupSocketEvents();

            // Get user media
            await this.getUserMedia();

            // Join the room
            this.socket.emit('join-room', { roomId, displayName });

            window.updateStatus('Connected! Waiting for other participants...');

        } catch (error) {
            console.error('Initialization error:', error);
            window.showError('Failed to initialize: ' + error.message);
        }
    }

    async getUserMedia() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Add local video to UI
            this.addLocalVideo();

            window.updateStatus('Camera and microphone access granted');

        } catch (error) {
            console.error('getUserMedia error:', error);
            window.showError('Could not access camera/microphone: ' + error.message);
            throw error;
        }
    }

    addLocalVideo() {
        const videoContainer = document.getElementById('video-container');

        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'video-wrapper local-video';
        videoWrapper.id = 'local-video-wrapper';

        const video = document.createElement('video');
        video.srcObject = this.localStream;
        video.autoplay = true;
        video.muted = true; // Mute local video to prevent feedback
        video.playsInline = true;
        video.className = 'video-element';

        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = `${this.displayName} (You)`;

        videoWrapper.appendChild(video);
        videoWrapper.appendChild(label);
        videoContainer.appendChild(videoWrapper);
    }

    setupSocketEvents() {
        this.socket.on('peers', ({ peers }) => {
            console.log('Existing peers in room:', peers);
            peers.forEach(peerId => this.createPeerConnection(peerId, true));
        });

        this.socket.on('peer-joined', ({ peerId, displayName }) => {
            console.log('New peer joined:', peerId, displayName);
            this.createPeerConnection(peerId, false);
            this.updateParticipantList();
        });

        this.socket.on('peer-left', ({ peerId }) => {
            console.log('Peer left:', peerId);
            this.removePeer(peerId);
            this.updateParticipantList();
        });

        this.socket.on('signal', async ({ from, data }) => {
            console.log('Received signal from:', from, data.type);
            await this.handleSignal(from, data);
        });

        this.socket.on('error', ({ message }) => {
            console.error('Socket error:', message);
            window.showError('Connection error: ' + message);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            window.showError('Disconnected from server');
        });
    }

    async createPeerConnection(peerId, isInitiator) {
        try {
            const pc = new RTCPeerConnection(this.pcConfig);

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });

            // Handle remote stream
            pc.ontrack = (event) => {
                console.log('Received remote stream from:', peerId);
                this.addRemoteVideo(peerId, event.streams[0]);
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('signal', {
                        to: peerId,
                        data: {
                            type: 'ice-candidate',
                            candidate: event.candidate
                        }
                    });
                }
            };

            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log(`Connection state with ${peerId}:`, pc.connectionState);
                if (pc.connectionState === 'failed') {
                    console.log('Connection failed, attempting restart');
                    pc.restartIce();
                }
            };

            // Store peer connection
            this.peers.set(peerId, { pc, videoEl: null });

            // If we're the initiator, create an offer
            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                this.socket.emit('signal', {
                    to: peerId,
                    data: {
                        type: 'offer',
                        offer: offer
                    }
                });
            }

        } catch (error) {
            console.error('Error creating peer connection:', error);
            window.showError('Failed to create connection with peer');
        }
    }

    async handleSignal(from, data) {
        const peer = this.peers.get(from);
        if (!peer) {
            console.error('Received signal from unknown peer:', from);
            return;
        }

        const { pc } = peer;

        try {
            switch (data.type) {
                case 'offer':
                    await pc.setRemoteDescription(data.offer);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    this.socket.emit('signal', {
                        to: from,
                        data: {
                            type: 'answer',
                            answer: answer
                        }
                    });
                    break;

                case 'answer':
                    await pc.setRemoteDescription(data.answer);
                    break;

                case 'ice-candidate':
                    await pc.addIceCandidate(data.candidate);
                    break;

                default:
                    console.warn('Unknown signal type:', data.type);
            }
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }

    addRemoteVideo(peerId, stream) {
        // Remove existing video if any
        this.removeRemoteVideo(peerId);

        const videoContainer = document.getElementById('video-container');

        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'video-wrapper';
        videoWrapper.id = `video-wrapper-${peerId}`;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'video-element';

        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = `Peer ${peerId.substring(0, 8)}`;

        videoWrapper.appendChild(video);
        videoWrapper.appendChild(label);
        videoContainer.appendChild(videoWrapper);

        // Store video element reference
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.videoEl = video;
        }

        this.updateParticipantList();
    }

    removeRemoteVideo(peerId) {
        const videoWrapper = document.getElementById(`video-wrapper-${peerId}`);
        if (videoWrapper) {
            videoWrapper.remove();
        }
    }

    removePeer(peerId) {
        const peer = this.peers.get(peerId);
        if (peer) {
            // Close peer connection
            peer.pc.close();

            // Remove video element
            this.removeRemoteVideo(peerId);

            // Remove from peers map
            this.peers.delete(peerId);
        }
    }

    updateParticipantList() {
        const participantList = document.getElementById('participant-list');
        const participants = [`${this.displayName} (You)`];

        this.peers.forEach((peer, peerId) => {
            participants.push(`Peer ${peerId.substring(0, 8)}`);
        });

        participantList.innerHTML = participants.map(name =>
            `<div class="participant">${name}</div>`
        ).join('');
    }

    toggleMute() {
        if (!this.localStream) return this.isMuted;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.isMuted = !audioTrack.enabled;
        }

        return this.isMuted;
    }

    toggleVideo() {
        if (!this.localStream) return !this.isVideoOff;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            this.isVideoOff = !videoTrack.enabled;
        }

        return !this.isVideoOff;
    }

    leaveRoom() {
        // Close all peer connections
        this.peers.forEach(peer => peer.pc.close());
        this.peers.clear();

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global app instance
let app = null;

// Initialize function called from room.html
window.initializeWebRTC = async (roomId, displayName) => {
    app = new WebRTCApp();
    await app.initialize(roomId, displayName);
};

// Control functions called from room.html
window.toggleMute = () => app ? app.toggleMute() : false;
window.toggleVideo = () => app ? app.toggleVideo() : true;
window.leaveRoom = () => app ? app.leaveRoom() : null;