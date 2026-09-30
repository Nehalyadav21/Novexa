// Socket.IO wrapper with fallback for production deployment
import { io } from 'socket.io-client';

export class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.fallbackMode = false;
    this.eventListeners = new Map();
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  connect(url, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Check if Socket.IO is disabled (production/Vercel deployment)
        const isSocketIODisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKETIO === 'true';
        
        if (isSocketIODisabled) {
          console.log('🚫 Socket.IO is disabled - running in fallback mode');
          this.fallbackMode = true;
          resolve(null); // Return null to indicate fallback mode
          return;
        }

        // Try to connect to Socket.IO
        this.socket = io(url, {
          ...options,
          timeout: 5000,
          autoConnect: false
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket.IO connected successfully');
          this.isConnected = true;
          this.fallbackMode = false;
          resolve(this.socket);
        });

        this.socket.on('connect_error', (error) => {
          console.log('❌ Socket.IO connection failed:', error.message);
          this.connectionAttempts++;
          
          if (this.connectionAttempts >= this.maxRetries) {
            console.log('🔄 Switching to fallback mode (polling)');
            this.fallbackMode = true;
            this.isConnected = false;
            resolve(this); // Return the manager itself as fallback
          }
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Socket.IO disconnected');
          this.isConnected = false;
        });

        // Attempt connection
        this.socket.connect();

        // Fallback timeout
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('⏰ Connection timeout, switching to fallback mode');
            this.fallbackMode = true;
            resolve(this);
          }
        }, 10000);

      } catch (error) {
        console.log('🚨 Socket.IO initialization failed, using fallback mode');
        this.fallbackMode = true;
        resolve(this);
      }
    });
  }

  emit(event, data) {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else if (this.fallbackMode) {
      // Fallback: Use HTTP API calls for critical events
      this.handleFallbackEmit(event, data);
    }
  }

  on(event, handler) {
    if (this.isConnected && this.socket) {
      this.socket.on(event, handler);
    } else {
      // Store event listeners for fallback mode
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(handler);
    }
  }

  off(event, handler) {
    if (this.isConnected && this.socket) {
      this.socket.off(event, handler);
    } else if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.isConnected = false;
    this.fallbackMode = false;
    this.eventListeners.clear();
  }

  async handleFallbackEmit(event, data) {
    // Handle critical events via HTTP API in fallback mode
    try {
      switch (event) {
        case 'join-meeting':
          await fetch(`/api/meetings/${data}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          break;
          
        case 'leave-meeting':
          await fetch(`/api/meetings/${data}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          break;
          
        case 'webrtc-offer':
        case 'webrtc-answer':
        case 'webrtc-ice-candidate':
          // These would need a WebRTC signaling service
          console.log('WebRTC signaling not available in fallback mode');
          break;
          
        default:
          console.log(`Fallback: Event '${event}' not handled`);
      }
    } catch (error) {
      console.error('Fallback emit error:', error);
    }
  }

  // Utility method to check if real-time features are available
  isRealTimeAvailable() {
    return this.isConnected && !this.fallbackMode;
  }

  // Get connection status for UI display
  getConnectionStatus() {
    if (this.isConnected) return 'connected';
    if (this.fallbackMode) return 'fallback';
    return 'disconnected';
  }
}

// Export a singleton instance
export const socketManager = new SocketManager();

// Helper function for creating connections
export const createSocketConnection = async (url, options = {}) => {
  // Check if Socket.IO is disabled (production/Vercel deployment)
  const isSocketIODisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKETIO === 'true';
  
  if (isSocketIODisabled) {
    console.log('🚫 Socket.IO disabled - returning null for fallback mode');
    return null;
  }

  const socketUrl = url || process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
  
  const fullOptions = {
    transports: ['websocket', 'polling'],
    ...options
  };

  return await socketManager.connect(socketUrl, fullOptions);
};
