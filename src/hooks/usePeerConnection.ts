import { useCallback, useEffect, useRef } from 'react';
import { RTC_CONFIGURATION } from '@/lib/rtcConfig';
import { logger } from '@/lib/logger';

function usePeerConnection() {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSet = useRef<boolean>(false);

  const addBufferedCandidates = useCallback(() => {
    if (!peerConnectionRef.current || !remoteDescriptionSet.current) return;
    iceCandidateBuffer.current.forEach(candidate => {
      peerConnectionRef.current!.addIceCandidate(candidate)
        .catch(e => logger.error('Error adding buffered ICE candidate', e));
    });
    iceCandidateBuffer.current = [];
  }, []);

  const handleNewICECandidate = useCallback((data: { candidate: RTCIceCandidateInit }) => {
    if (!data.candidate) return;
    if (peerConnectionRef.current && remoteDescriptionSet.current) {
      peerConnectionRef.current.addIceCandidate(data.candidate)
        .catch(e => logger.error('Error adding ICE candidate', e));
    } else {
      iceCandidateBuffer.current.push(data.candidate);
    }
  }, []);

  const createPeerConnection = useCallback(
    (
      onTrack: (stream: MediaStream) => void,
      onIceCandidate: (candidate: RTCIceCandidate) => void,
      onConnectionFailed: () => void,
    ): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);

      pc.ontrack = (event) => onTrack(event.streams[0]);

      pc.onicecandidate = (event) => {
        if (event.candidate) onIceCandidate(event.candidate);
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') onConnectionFailed();
      };

      peerConnectionRef.current = pc;
      remoteDescriptionSet.current = false;
      return pc;
    },
    [],
  );

  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    iceCandidateBuffer.current = [];
    remoteDescriptionSet.current = false;
  }, []);

  const checkAndRestartIce = useCallback(() => {
    if (peerConnectionRef.current?.iceConnectionState === 'failed') {
      peerConnectionRef.current.restartIce();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(checkAndRestartIce, 5000);
    return () => clearInterval(interval);
  }, [checkAndRestartIce]);

  return {
    peerConnectionRef,
    remoteDescriptionSet,
    addBufferedCandidates,
    handleNewICECandidate,
    createPeerConnection,
    closePeerConnection,
  };
}

export default usePeerConnection;
