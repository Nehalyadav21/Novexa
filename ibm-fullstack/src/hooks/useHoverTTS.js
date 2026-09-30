import { useState, useRef, useCallback } from 'react';

export const useHoverTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const audioRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const playText = useCallback(async (text) => {
    if (!text || isPlaying) return;

    try {
      setIsPlaying(true);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 500) }) // Limit length
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setCurrentAudio(audio);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  }, [isPlaying]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentAudio(null);
  }, []);

  const handleMouseEnter = useCallback((text) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Start playing after a short delay to avoid accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      playText(text);
    }, 500); // 500ms delay
  }, [playText]);

  const handleMouseLeave = useCallback(() => {
    // Clear the timeout if user moves away quickly
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Stop audio immediately when leaving hover area
    stopAudio();
  }, [stopAudio]);

  return {
    isPlaying,
    currentAudio,
    playText,
    stopAudio,
    handleMouseEnter,
    handleMouseLeave
  };
};
