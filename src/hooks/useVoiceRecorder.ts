import { useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

const MAX_RECORDING_SEC = 60;

function useVoiceRecorder(onStop: (blob: Blob, durationSec: number) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
      setElapsedSec(elapsed);
      if (elapsed >= MAX_RECORDING_SEC) {
        mediaRecorderRef.current?.stop();
      }
    }, 250);
  }, [clearTick]);

  const cleanup = useCallback(() => {
    clearTick();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    pausedDurationRef.current = 0;
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSec(0);
  }, [clearTick]);

  const start = useCallback(async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const durationSec = Math.min(
          MAX_RECORDING_SEC,
          Math.round((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const wasCancelled = cancelledRef.current;
        cleanup();
        if (!wasCancelled && blob.size > 0) onStop(blob, durationSec);
      };

      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      startTick();
    } catch (error) {
      logger.error('Microphone access failed:', error);
      cleanup();
    }
  }, [isRecording, cleanup, onStop, startTick]);

  const stop = useCallback(() => {
    cancelledRef.current = false;
    mediaRecorderRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
  }, []);

  const pause = useCallback(() => {
    if (!isRecording || isPaused || mediaRecorderRef.current?.state !== 'recording') return;
    mediaRecorderRef.current.pause();
    pauseStartRef.current = Date.now();
    clearTick();
    setIsPaused(true);
  }, [isRecording, isPaused, clearTick]);

  const resume = useCallback(() => {
    if (!isRecording || !isPaused || mediaRecorderRef.current?.state !== 'paused') return;
    mediaRecorderRef.current.resume();
    pausedDurationRef.current += Date.now() - pauseStartRef.current;
    setIsPaused(false);
    startTick();
  }, [isRecording, isPaused, startTick]);

  return { isRecording, isPaused, elapsedSec, start, stop, cancel, pause, resume };
}

export default useVoiceRecorder;
