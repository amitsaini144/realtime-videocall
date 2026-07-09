import { useCallback, useRef } from 'react';
import { getRtcConfiguration } from '@/lib/rtcConfig';
import { logger } from '@/lib/logger';

const ICE_RESTART_MIN_INTERVAL_MS = 5000;

function usePeerConnection() {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSet = useRef<boolean>(false);
  const lastIceRestartRef = useRef<number>(0);

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
    async (
      onTrack: (stream: MediaStream) => void,
      onIceCandidate: (candidate: RTCIceCandidate) => void,
      onConnectionFailed: () => void,
      onIceDisconnected: () => void,
    ): Promise<RTCPeerConnection> => {
      const config = await getRtcConfiguration();
      const pc = new RTCPeerConnection(config);

      pc.ontrack = (event) => {
        logger.log(`[usePeerConnection] ontrack fired: streams=${event.streams.length}, track kind=${event.track.kind}, streamId=${event.streams[0]?.id}`);
        onTrack(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) onIceCandidate(event.candidate);
      };

      pc.oniceconnectionstatechange = () => {
        logger.log(`ICE connection state: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          const now = Date.now();
          if (now - lastIceRestartRef.current > ICE_RESTART_MIN_INTERVAL_MS) {
            lastIceRestartRef.current = now;
            onIceDisconnected();
          }
        }
      };

      pc.onicegatheringstatechange = () => {
        logger.log(`ICE gathering state: ${pc.iceGatheringState}`);
      };

      pc.onconnectionstatechange = () => {
        logger.log(`Connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') onConnectionFailed();
      };

      peerConnectionRef.current = pc;
      remoteDescriptionSet.current = false;
      lastIceRestartRef.current = 0;
      iceCandidateBuffer.current = [];
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
