import { useState, useRef, useCallback } from 'react';

export const useDirectVoiceTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const startDirectRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscribedText('');
      setIsRecording(true);
      chunksRef.current = [];

      console.log('Starting direct recording...');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Audio chunk collected:', event.data.size);
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      console.log('MediaRecorder started');
    } catch (err) {
      console.error('Recording error:', err);
      setError(`Recording error: ${err.message}`);
      setIsRecording(false);
    }
  }, []);

  const stopDirectRecording = useCallback(async () => {
    console.log('Stopping direct recording...');
    
    if (!mediaRecorderRef.current || !isRecording) {
      console.log('No active recording to stop');
      return;
    }

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        console.log('MediaRecorder stopped, starting transcription...');
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          if (chunksRef.current.length === 0) {
            throw new Error('No audio data recorded');
          }

          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          console.log('Audio blob created:', audioBlob.size, 'bytes');
          
          // Convert to WAV for better Watson STT compatibility
          const wavBlob = await convertToWav(audioBlob);
          console.log('WAV blob created:', wavBlob.size, 'bytes');
          
          const formData = new FormData();
          formData.append('audio', wavBlob, 'recording.wav');

          console.log('Sending to STT API...');
          const response = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          console.log('STT API response:', result);

          if (response.ok && result.transcript) {
            const transcript = result.transcript.trim();
            setTranscribedText(transcript);
            console.log('Transcription successful:', transcript);
            resolve(transcript);
          } else {
            throw new Error(result.error || 'Transcription failed');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setError(`Transcription error: ${err.message}`);
          resolve('');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    });
  }, [isRecording]);

  // Convert webm audio to WAV format
  const convertToWav = async (webmBlob) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      return audioBufferToWav(audioBuffer);
    } catch (err) {
      console.warn('WAV conversion failed, using original blob:', err);
      return webmBlob;
    }
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer) => {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  return {
    isRecording,
    isTranscribing,
    transcribedText,
    error,
    startDirectRecording,
    stopDirectRecording
  };
};
