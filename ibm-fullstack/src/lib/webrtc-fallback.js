// Fallback WebRTC implementation without Socket.IO dependency
// Uses polling and direct WebRTC connections

export class WebRTCFallback {
  constructor(meetingId, userId) {
    this.meetingId = meetingId;
    this.userId = userId;
    this.peerConnections = new Map();
    this.localStream = null;
    this.isPolling = false;
    this.pollInterval = null;
    
    // WebRTC configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
  }

  async initializeMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return this.localStream;
    } catch (error) {
      console.error('Failed to get media:', error);
      throw error;
    }
  }

  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollInterval = setInterval(async () => {
      try {
        // Poll for meeting participants
        const response = await fetch(`/api/meetings/${this.meetingId}/participants`);
        const data = await response.json();
        
        if (data.participants) {
          this.handleParticipantsUpdate(data.participants);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async joinMeeting() {
    try {
      // Register as participant
      await fetch(`/api/meetings/${this.meetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });
      
      this.startPolling();
      return true;
    } catch (error) {
      console.error('Failed to join meeting:', error);
      return false;
    }
  }

  async leaveMeeting() {
    try {
      // Close all peer connections
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      this.stopPolling();
      
      // Unregister as participant
      await fetch(`/api/meetings/${this.meetingId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });
      
      return true;
    } catch (error) {
      console.error('Failed to leave meeting:', error);
      return false;
    }
  }

  handleParticipantsUpdate(participants) {
    // Implementation for handling participant updates
    // This would create/destroy peer connections as needed
    console.log('Participants updated:', participants);
  }

  async createPeerConnection(participantId) {
    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      this.onRemoteStream?.(participantId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        // Send ICE candidate via API
        await this.sendIceCandidate(participantId, event.candidate);
      }
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  async sendIceCandidate(targetId, candidate) {
    try {
      await fetch(`/api/meetings/${this.meetingId}/webrtc/ice-candidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          senderId: this.userId,
          candidate: candidate
        })
      });
    } catch (error) {
      console.error('Failed to send ICE candidate:', error);
    }
  }

  async sendOffer(targetId, offer) {
    try {
      await fetch(`/api/meetings/${this.meetingId}/webrtc/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          senderId: this.userId,
          offer: offer
        })
      });
    } catch (error) {
      console.error('Failed to send offer:', error);
    }
  }

  async sendAnswer(targetId, answer) {
    try {
      await fetch(`/api/meetings/${this.meetingId}/webrtc/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          senderId: this.userId,
          answer: answer
        })
      });
    } catch (error) {
      console.error('Failed to send answer:', error);
    }
  }

  // Event handlers to be set by the component
  onRemoteStream = null;
  onParticipantJoined = null;
  onParticipantLeft = null;
}
