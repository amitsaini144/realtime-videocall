import { useCallback, useRef, useState } from 'react';
import { User } from '@/types';
import { logger } from '@/lib/logger';

type ToastFn = (options: { description: string }) => void;

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    const check = () => { if (pc.iceGatheringState === 'complete') resolve(); };
    pc.onicegatheringstatechange = check;
    check();
    setTimeout(resolve, 5000);
  });
}

function useCall(
  socketRef: React.RefObject<WebSocket | null>,
  peerConnectionRef: React.RefObject<RTCPeerConnection | null>,
  remoteDescriptionSet: React.MutableRefObject<boolean>,
  addBufferedCandidates: () => void,
  createPeerConnection: (
    onTrack: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onConnectionFailed: () => void,
  ) => RTCPeerConnection,
  closePeerConnection: () => void,
  toast: ToastFn,
) {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleCallEnded = useCallback(() => {
    closePeerConnection();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    toast({ description: 'Call ended' });
  }, [closePeerConnection, toast]);

  const startCall = useCallback(async (targetUser: User) => {
    if (inCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(
        (remStream) => setRemoteStream(remStream),
        (candidate) => {
          socketRef.current?.send(JSON.stringify({
            type: 'iceCandidate',
            candidate,
            to: targetUser.id,
          }));
        },
        handleCallEnded,
      );

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      socketRef.current?.send(JSON.stringify({
        type: 'videoCallOffer',
        offer: pc.localDescription,
        to: targetUser.id,
      }));

      setInCall(true);
    } catch (error) {
      logger.error('Error starting call:', error);
      toast({ description: 'Failed to start call' });
    }
  }, [inCall, socketRef, createPeerConnection, handleCallEnded, toast]);

  const handleIncomingCall = useCallback((data: {
    from: string;
    fromUsername: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    if (inCall) {
      socketRef.current?.send(JSON.stringify({ type: 'callBusy', to: data.from }));
      return;
    }

    const confirmed = globalThis.confirm(`Incoming call from ${data.fromUsername}. Accept?`);
    if (!confirmed) {
      socketRef.current?.send(JSON.stringify({ type: 'callRejected', to: data.from }));
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = createPeerConnection(
          (remStream) => setRemoteStream(remStream),
          (candidate) => {
            socketRef.current?.send(JSON.stringify({
              type: 'iceCandidate',
              candidate,
              to: data.from,
            }));
          },
          handleCallEnded,
        );

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.setRemoteDescription(data.offer)
          .then(() => {
            remoteDescriptionSet.current = true;
            addBufferedCandidates();
            return pc.createAnswer();
          })
          .then(answer => pc.setLocalDescription(answer))
          .then(() => waitForIceGathering(pc))
          .then(() => {
            socketRef.current?.send(JSON.stringify({
              type: 'videoCallAnswer',
              answer: pc.localDescription,
              to: data.from,
            }));
          });

        setInCall(true);
      })
      .catch(error => {
        logger.error('Error accessing media devices:', error);
        toast({ description: 'Failed to access camera/microphone' });
      });
  }, [inCall, socketRef, createPeerConnection, handleCallEnded, remoteDescriptionSet, addBufferedCandidates, toast]);

  const handleCallAccepted = useCallback((data: { answer: RTCSessionDescriptionInit }) => {
    if (!peerConnectionRef.current) return;
    peerConnectionRef.current.setRemoteDescription(data.answer)
      .then(() => {
        remoteDescriptionSet.current = true;
        addBufferedCandidates();
      })
      .catch(e => logger.error('Error setting remote description', e));
  }, [peerConnectionRef, remoteDescriptionSet, addBufferedCandidates]);

  return {
    inCall,
    localStream,
    remoteStream,
    startCall,
    handleIncomingCall,
    handleCallAccepted,
    handleCallEnded,
  };
}

export default useCall;
