/**
 * Watson Speech-to-Text Service (Client-side)
 * Handles real-time audio transcription for meeting participants
 */

let sttTokenCache = { token: null, expiresAt: 0, websocketUrl: null };

/**
 * Get Watson STT token from our API route
 */
export async function getSTTToken(force = false) {
  const now = Date.now() / 1000;
  if (!force && sttTokenCache.token && sttTokenCache.expiresAt - 30 > now) {
    return sttTokenCache;
  }
  
  try {
    const response = await fetch('/api/watson-stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getToken' })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get STT token');
    }
    
    const data = await response.json();
    
    sttTokenCache = {
      token: data.token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expiresIn || 3600),
      websocketUrl: data.websocketUrl
    };
    
    return sttTokenCache;
    
  } catch (error) {
    console.error('Failed to get STT token:', error);
    throw error;
  }
}

/**
 * Watson Speech-to-Text WebSocket Connection Class
 */
export class WatsonSTTConnection {
  constructor(options = {}) {
    this.onTranscript = options.onTranscript || (() => {});
    this.onError = options.onError || console.error;
    this.onClose = options.onClose || (() => {});
    this.onOpen = options.onOpen || (() => {});
    
    this.websocket = null;
    this.isConnected = false;
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    
    // Watson STT configuration
    this.config = {
      content_type: 'audio/l16;rate=16000;channels=1',
      interim_results: true,
      inactivity_timeout: -1,
      smart_formatting: true,
      speaker_labels: false,
      timestamps: true,
      profanity_filter: false,
      word_confidence: true,
      ...options.config
    };
  }

  /**
   * Connect to Watson STT WebSocket
   */
  async connect() {
    try {
      if (this.isConnected) {
        console.warn('STT already connected');
        return;
      }

      console.log('🎤 Connecting to Watson STT...');
      
      const tokenData = await getSTTToken();
      if (!tokenData.websocketUrl) {
        throw new Error('Watson STT WebSocket URL not available');
      }
      
      const wsUrl = tokenData.websocketUrl + '?access_token=' + encodeURIComponent(tokenData.token);

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('✅ Watson STT connected');
        this.isConnected = true;
        
        // Wait a moment before sending start message to ensure connection is stable
        setTimeout(() => {
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const startMessage = {
              action: 'start',
              ...this.config
            };
            
            console.log('📤 Sending start message:', startMessage);
            this.websocket.send(JSON.stringify(startMessage));
            this.onOpen();
          }
        }, 100);
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const transcript = result.alternatives[0].transcript;
            const confidence = result.alternatives[0].confidence;
            const isFinal = result.final;
            
            this.onTranscript({
              transcript: transcript.trim(),
              confidence,
              isFinal,
              timestamp: Date.now(),
              speakerLabel: data.speaker_labels?.[0]?.speaker || null
            });
          }
          
          if (data.error) {
            console.error('Watson STT error:', data.error);
            this.onError(new Error(data.error));
          }
        } catch (error) {
          console.error('Error parsing STT message:', error);
          this.onError(error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('Watson STT WebSocket error:', error);
        this.onError(error);
      };

      this.websocket.onclose = (event) => {
        console.log('Watson STT connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.onClose(event);
      };

    } catch (error) {
      console.error('Failed to connect to Watson STT:', error);
      this.onError(error);
    }
  }

  /**
   * Start audio capture and streaming with AudioWorkletNode
   */
  async startTranscription(mediaStream) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      console.log('🎙️ Starting audio transcription...');
      
      // Set up audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Watson STT prefers 16kHz
      });
      
      this.source = this.audioContext.createMediaStreamSource(mediaStream);
      
      // Use AudioWorkletNode instead of deprecated ScriptProcessorNode
      try {
        // Try to add the audio worklet processor
        await this.audioContext.audioWorklet.addModule('/audio-processor.js');
        this.processor = new AudioWorkletNode(this.audioContext, 'audio-processor');
        
        this.processor.port.onmessage = (event) => {
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const audioData = event.data;
            
            // Debug log for troubleshooting
            if (audioData.byteLength < 100) {
              console.warn(`⚠️ Audio chunk too small: ${audioData.byteLength} bytes (need 100+)`);
              return; // Don't send chunks that are too small
            }
            
            // Log successful sends periodically
            if (Math.random() < 0.01) { // 1% of chunks
              console.log(`🎤 Sending audio chunk: ${audioData.byteLength} bytes`);
            }
            
            // Send as binary data
            this.websocket.send(audioData);
          }
        };
        
      } catch (workletError) {
        console.warn('AudioWorklet not supported, falling back to ScriptProcessor:', workletError);
        
        // Fallback to ScriptProcessorNode for older browsers
        this.processor = this.audioContext.createScriptProcessor(8192, 1, 1); // Increased buffer size
        
        this.processor.onaudioprocess = (event) => {
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const audioData = event.inputBuffer.getChannelData(0);
            
            // Convert float32 to int16 for Watson STT
            const int16Array = new Int16Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              int16Array[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
            }
            
            // Ensure minimum size requirement
            if (int16Array.buffer.byteLength >= 100) {
              // Log successful sends periodically
              if (Math.random() < 0.01) { // 1% of chunks
                console.log(`🎤 Sending audio chunk (fallback): ${int16Array.buffer.byteLength} bytes`);
              }
              
              // Send audio data as binary
              this.websocket.send(int16Array.buffer);
            } else {
              console.warn(`⚠️ Audio chunk too small (fallback): ${int16Array.buffer.byteLength} bytes (need 100+)`);
            }
          }
        };
        
        // Connect to destination to prevent garbage collection
        this.processor.connect(this.audioContext.destination);
      }
      
      // Connect audio nodes
      this.source.connect(this.processor);
      
      console.log('✅ Audio transcription started');
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.onError(error);
    }
  }

  /**
   * Stop transcription
   */
  stopTranscription() {
    console.log('🛑 Stopping transcription...');
    
    // Clean up audio processing
    if (this.processor) {
      if (this.processor.port) {
        // AudioWorkletNode cleanup
        this.processor.port.close();
      }
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Send stop message to Watson STT
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ action: 'stop' }));
    }
  }

  /**
   * Disconnect from Watson STT
   */
  disconnect() {
    console.log('🔌 Disconnecting from Watson STT...');
    
    this.stopTranscription();
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.isConnected = false;
  }
}

/**
 * Simple transcription for audio files
 */
export async function transcribeAudioFile(audioBlob, options = {}) {
  try {
    const tokenData = await getSTTToken();
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    
    const params = new URLSearchParams({
      model: options.model || 'en-US_BroadbandModel',
      smart_formatting: 'true',
      timestamps: 'true',
      ...options
    });
    
    // Extract base URL from websocket URL
    const baseUrl = tokenData.websocketUrl.replace('wss://', 'https://').replace('ws://', 'http://').replace('/v1/recognize', '');
    
    const response = await fetch(`${baseUrl}/v1/recognize?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to transcribe audio: ' + await response.text());
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Audio transcription error:', error);
    throw error;
  }
}
