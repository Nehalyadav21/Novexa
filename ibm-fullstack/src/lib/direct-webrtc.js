// Production WebRTC implementation without Socket.IO dependency
// Uses direct peer-to-peer connections for Vercel deployment

export class DirectWebRTC {
  constructor(meetingId, userId, userName, meetingPassword = '') {
    this.meetingId = meetingId;
    this.userId = userId;
    this.userName = userName;
    this.meetingPassword = meetingPassword;
    this.localStream = null;
    this.peerConnections = new Map();
    this.isInitialized = false;
    this.participants = new Map(); // Changed from Set to Map to store participant objects
    
    // WebRTC configuration with public STUN servers
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.stunprotocol.org:3478' }
      ],
      iceCandidatePoolSize: 10
    };
    
    // Event callbacks
    this.onRemoteStream = null;
    this.onParticipantJoined = null;
    this.onParticipantLeft = null;
    this.onConnectionStatus = null;
    this.onLocalStream = null;
  }

  async initializeMedia() {
    try {
      console.log('🎥 Initializing media devices...');
      
      // Request media permissions
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Media devices initialized successfully');
      this.onConnectionStatus?.('media-ready');
      
      // Notify React component about local stream
      this.onLocalStream?.(this.localStream);
      
      return this.localStream;
      
    } catch (error) {
      console.error('❌ Failed to get media devices:', error);
      this.onConnectionStatus?.('media-error');
      throw error;
    }
  }

  async joinMeeting() {
    try {
      console.log(`🚀 Joining meeting ${this.meetingId} as ${this.userName}...`);
      
      if (!this.localStream) {
        await this.initializeMedia();
      }
      
      // Prepare request body
      const requestBody = { 
        userId: this.userId, 
        userName: this.userName,
        joinMethod: 'direct-webrtc'
      };
      
      // Only include password if provided
      if (this.meetingPassword && this.meetingPassword.trim() !== '') {
        requestBody.password = this.meetingPassword;
      }
      
      console.log('📡 Joining meeting with:', { 
        meetingId: this.meetingId, 
        userId: this.userId,
        userName: this.userName,
        hasPassword: !!this.meetingPassword
      });
      
      // Register with the server
      const response = await fetch(`/api/meetings/${this.meetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('❌ Join meeting failed:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('Unauthorized');
        } else if (response.status === 403) {
          throw new Error(errorData.error || 'Access denied');
        } else if (response.status === 404) {
          throw new Error('Meeting not found');
        } else {
          throw new Error(errorData.error || `Failed to join meeting: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Successfully joined meeting:', data);
      
      this.isInitialized = true;
      this.onConnectionStatus?.('connected');
      
      // Start polling for other participants
      this.startParticipantPolling();
      
      return data;
      
    } catch (error) {
      console.error('❌ Failed to join meeting:', error);
      this.onConnectionStatus?.('connection-error');
      throw error;
    }
  }

  startParticipantPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.signalPollInterval) {
      clearInterval(this.signalPollInterval);
    }
    
    console.log('🔍 Starting participant polling...');
    
    // Initial poll immediately
    this.pollParticipants();
    
    this.pollInterval = setInterval(async () => {
      await this.pollParticipants();
    }, 3000); // Poll every 3 seconds
    
    // Poll for signaling messages more frequently
    this.signalPollInterval = setInterval(async () => {
      await this.pollSignals();
    }, 1000); // Poll every 1 second
  }

  async pollParticipants() {
    try {
      console.log(`🔍 Polling for participants in meeting ${this.meetingId}...`);
      const response = await fetch(`/api/meetings/${this.meetingId}/participants`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Participants response:', data);
        console.log('📊 Raw participants from API:', data.participants);
        this.updateParticipants(data.participants || []);
      } else {
        console.error('❌ Failed to fetch participants:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }

  updateParticipants(newParticipants) {
    const currentParticipantIds = new Set(this.participants.keys());
    
    // Extract user IDs from participant objects and filter out current user
    const incomingParticipants = newParticipants.filter(p => p.userId && p.userId !== this.userId);
    const incomingParticipantIds = new Set(incomingParticipants.map(p => p.userId));
    
    console.log('👥 Updating participants:', {
      current: Array.from(currentParticipantIds),
      incoming: Array.from(incomingParticipantIds),
      myUserId: this.userId,
      rawParticipants: newParticipants
    });
    
    // Debug: Check if there are any participants to connect to
    if (incomingParticipants.length === 0) {
      console.log('ℹ️ No other participants in meeting yet - waiting for someone to join...');
      console.log('📝 To test WebRTC: Open this meeting in another browser/tab with a different user');
    } else {
      console.log(`🎯 Found ${incomingParticipants.length} other participants to potentially connect to`);
    }
    
    // Find new participants
    console.log(`🔍 Checking for new participants - Current: [${Array.from(currentParticipantIds)}], Incoming: [${Array.from(incomingParticipantIds)}]`);
    
    let newConnectionsToMake = 0;
    incomingParticipants.forEach(participant => {
      if (!currentParticipantIds.has(participant.userId)) {
        newConnectionsToMake++;
      }
    });
    
    if (newConnectionsToMake > 0) {
      console.log(`🚀 About to create ${newConnectionsToMake} new WebRTC connections`);
    }
    
    incomingParticipants.forEach(participant => {
      if (!currentParticipantIds.has(participant.userId)) {
        console.log(`👋 New participant joined:`, participant);
        this.participants.set(participant.userId, participant);
        this.onParticipantJoined?.(participant);
        
        // Wait a bit to ensure local stream is ready
        setTimeout(() => {
          console.log(`🔗 Attempting to create peer connection with ${participant.userId}...`);
          console.log(`📹 Local stream status:`, this.localStream ? `Available with ${this.localStream.getTracks().length} tracks` : 'Not available');
          
          if (!this.localStream) {
            console.error(`❌ Cannot create peer connection with ${participant.userId} - no local stream`);
            return;
          }
          
          // Create peer connection
          this.createPeerConnection(participant.userId).then(() => {
            // Initiate connection if we have the higher user ID (deterministic)
            // Use string comparison to ensure consistent behavior
            const shouldInitiate = String(this.userId) > String(participant.userId);
            console.log(`🤔 Connection initiation check: ${this.userId} > ${participant.userId} = ${shouldInitiate}`);
            
            if (shouldInitiate) {
              console.log(`🎯 I will initiate connection with ${participant.userId}`);
              this.initiateConnection(participant.userId);
            } else {
              console.log(`⏳ Waiting for ${participant.userId} to initiate connection`);
            }
          }).catch(error => {
            console.error(`❌ Failed to create peer connection with ${participant.userId}:`, error);
            // Retry connection after a short delay
            setTimeout(() => {
              console.log(`🔄 Retrying connection with ${participant.userId}...`);
              this.createPeerConnection(participant.userId).catch(retryError => {
                console.error(`❌ Retry also failed for ${participant.userId}:`, retryError);
              });
            }, 2000);
          });
        }, 100); // Small delay to ensure local stream is ready
      }
    });
    
    // Find participants who left
    currentParticipantIds.forEach(participantId => {
      if (!incomingParticipantIds.has(participantId)) {
        console.log(`👋 Participant left: ${participantId}`);
        this.participants.delete(participantId);
        this.onParticipantLeft?.(participantId);
        this.closePeerConnection(participantId);
      }
    });
  }

  async createPeerConnection(participantId) {
    try {
      console.log(`🔗 Creating peer connection with ${participantId}`);
      
      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      
      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log(`➕ Adding ${track.kind} track to peer connection for ${participantId}`);
          peerConnection.addTrack(track, this.localStream);
        });
      } else {
        console.warn(`⚠️ No local stream available when creating peer connection for ${participantId}`);
      }
      
      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        console.log(`📺 Received remote ${event.track.kind} track from ${participantId}`);
        const remoteStream = event.streams[0];
        if (remoteStream) {
          console.log(`🎯 Setting remote stream for ${participantId} with ${remoteStream.getTracks().length} tracks`);
          this.onRemoteStream?.(participantId, remoteStream);
        } else {
          console.error(`❌ No remote stream in track event from ${participantId}`);
        }
      };
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 Sending ICE candidate to ${participantId}`);
          this.sendSignal(participantId, 'ice-candidate', event.candidate);
        } else {
          console.log(`🧊 ICE gathering complete for ${participantId}`);
        }
      };
      
      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔄 Peer connection state with ${participantId}: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'connected') {
          console.log(`✅ Peer connection established with ${participantId}`);
          this.onConnectionStatus?.('peer-connected');
        } else if (peerConnection.connectionState === 'failed') {
          console.error(`❌ Peer connection failed with ${participantId}, attempting restart`);
          peerConnection.restartIce();
        } else if (peerConnection.connectionState === 'disconnected') {
          console.warn(`🔌 Peer connection disconnected with ${participantId}`);
        }
      };
      
      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state with ${participantId}: ${peerConnection.iceConnectionState}`);
      };
      
      this.peerConnections.set(participantId, peerConnection);
      console.log(`💾 Stored peer connection for ${participantId}. Total connections: ${this.peerConnections.size}`);
      
      return peerConnection;
      
    } catch (error) {
      console.error(`❌ Error creating peer connection with ${participantId}:`, error);
      throw error;
    }
  }

  async initiateConnection(participantId) {
    try {
      const peerConnection = this.peerConnections.get(participantId);
      if (!peerConnection) {
        console.error(`❌ No peer connection found for ${participantId}`);
        return;
      }

      console.log(`📤 Creating offer for ${participantId} (I am initiator: ${this.userId} > ${participantId})`);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);
      await this.sendSignal(participantId, 'offer', offer);
      console.log(`📡 Sent offer to ${participantId}`);
    } catch (error) {
      console.error(`❌ Error initiating connection with ${participantId}:`, error);
    }
  }

  closePeerConnection(participantId) {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
  }

  async leaveMeeting() {
    try {
      console.log('👋 Leaving meeting...');
      
      // Stop polling
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
      if (this.signalPollInterval) {
        clearInterval(this.signalPollInterval);
      }
      
      // Close all peer connections
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      
      // Clear participants
      this.participants.clear();
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Notify server
      await fetch(`/api/meetings/${this.meetingId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });
      
      this.isInitialized = false;
      this.onConnectionStatus?.('disconnected');
      
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }

  // Media controls
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return muted state
      }
    }
    return true;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Return video off state
      }
    }
    return true;
  }

  // Get connection status for UI
  getConnectionStatus() {
    if (!this.isInitialized) return 'disconnected';
    if (this.peerConnections.size === 0) return 'waiting';
    return 'connected';
  }

  // Send signaling message
  async sendSignal(toUserId, type, signal) {
    try {
      const response = await fetch(`/api/meetings/${this.meetingId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          fromUserId: this.userId,
          toUserId,
          signal
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send signal:', response.status);
      }
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  // Poll for incoming signaling messages
  async pollSignals() {
    try {
      const response = await fetch(`/api/meetings/${this.meetingId}/signal?userId=${this.userId}`);
      if (response.ok) {
        const data = await response.json();
        for (const signal of data.signals || []) {
          await this.handleSignal(signal);
        }
      }
    } catch (error) {
      console.error('Error polling signals:', error);
    }
  }

  // Handle incoming signaling message
  async handleSignal(signal) {
    const { type, fromUserId, signal: signalData } = signal;
    console.log(`📡 Received ${type} from ${fromUserId}`);
    
    const peerConnection = this.peerConnections.get(fromUserId);
    
    if (!peerConnection) {
      console.warn(`⚠️ No peer connection found for ${fromUserId} when handling ${type}`);
      // Only create peer connection for offers (initial contact)
      if (type === 'offer') {
        console.log(`🔗 Creating peer connection for incoming offer from ${fromUserId}`);
        try {
          await this.createPeerConnection(fromUserId);
        } catch (error) {
          console.error(`❌ Failed to create peer connection for ${fromUserId}:`, error);
          return;
        }
      } else {
        return;
      }
    }

    const pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      console.error(`❌ Still no peer connection for ${fromUserId} after creation attempt`);
      return;
    }

    try {
      switch (type) {
        case 'offer':
          console.log(`📥 Handling offer from ${fromUserId}`);
          await pc.setRemoteDescription(signalData);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await this.sendSignal(fromUserId, 'answer', answer);
          console.log(`📤 Sent answer to ${fromUserId}`);
          break;
          
        case 'answer':
          console.log(`📥 Handling answer from ${fromUserId}`);
          await pc.setRemoteDescription(signalData);
          console.log(`✅ Answer processed for ${fromUserId}`);
          break;
          
        case 'ice-candidate':
          console.log(`🧊 Adding ICE candidate from ${fromUserId}`);
          await pc.addIceCandidate(signalData);
          break;
          
        default:
          console.warn(`❓ Unknown signal type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling ${type} from ${fromUserId}:`, error);
    }
  }
}
