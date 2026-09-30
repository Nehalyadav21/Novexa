/**
 * Audio Processor Worklet for Watson STT
 * Replaces deprecated ScriptProcessorNode with modern AudioWorkletNode
 * Ensures minimum 100-byte chunks for Watson STT
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Use larger buffer to ensure we meet Watson STT's 100-byte minimum
    this.bufferSize = 8192; // Increased from 4096
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.samplesSent = 0;
    this.isActive = false;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const inputChannel = input[0];
      
      // Check if we have actual audio data (not silence)
      let hasAudio = false;
      for (let i = 0; i < inputChannel.length; i++) {
        if (Math.abs(inputChannel[i]) > 0.001) { // Threshold for detecting audio
          hasAudio = true;
          break;
        }
      }
      
      if (hasAudio) {
        this.isActive = true;
      }
      
      // Only process if we have active audio or recently had audio
      if (this.isActive) {
        // Process audio in chunks
        for (let i = 0; i < inputChannel.length; i++) {
          this.buffer[this.bufferIndex] = inputChannel[i];
          this.bufferIndex++;
          
          // When buffer is full, convert and send
          if (this.bufferIndex >= this.bufferSize) {
            // Convert float32 to int16 for Watson STT
            const int16Array = new Int16Array(this.bufferSize);
            for (let j = 0; j < this.bufferSize; j++) {
              int16Array[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
            }
            
            // Ensure we have minimum bytes required by Watson STT (100 bytes minimum)
            // int16Array.buffer will be 8192 * 2 = 16384 bytes, well above 100
            if (int16Array.buffer.byteLength >= 100) {
              this.port.postMessage(int16Array.buffer);
              this.samplesSent += this.bufferSize;
              
              // Debug log every 10 chunks
              if (this.samplesSent % (this.bufferSize * 10) === 0) {
                console.log(`🎤 Audio chunks sent: ${Math.floor(this.samplesSent / this.bufferSize)}, bytes: ${int16Array.buffer.byteLength}`);
              }
            }
            
            // Reset buffer
            this.bufferIndex = 0;
          }
        }
      }
    }
    
    // Keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
