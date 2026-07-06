import { useCallback, useRef, useState } from 'react';
import { User } from '@/types';
import { logger } from '@/lib/logger';

type ToastFn = (options: { description: string }) => void;

export interface IncomingCallData {
  from: string;
  fromUsername: string;
  offer: RTCSessionDescriptionInit;
}

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
  ) => Promise<RTCPeerConnection>,
  closePeerConnection: () => void,
  toast: ToastFn,
) {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCallRef = useRef<IncomingCallData | null>(null);

  const handleCallEnded = useCallback(() => {
    closePeerConnection();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    toast({ description: 'Call ended' });
  }, [closePeerConnection, toast]);

  const handleCallDeclined = useCallback((reason: 'busy' | 'rejected') => {
    closePeerConnection();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    toast({ description: reason === 'busy' ? 'User is busy' : 'Call declined' });
  }, [closePeerConnection, toast]);

  const startCall = useCallback(async (targetUser: User) => {
    if (inCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = await createPeerConnection(
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

  const handleIncomingCall = useCallback((data: IncomingCallData) => {
    if (inCall) {
      socketRef.current?.send(JSON.stringify({ type: 'callBusy', to: data.from }));
      return;
    }
    pendingCallRef.current = data;
    setIncomingCall(data);
  }, [inCall, socketRef]);

  const acceptCall = useCallback(() => {
    const data = pendingCallRef.current;
    if (!data) return;
    setIncomingCall(null);
    pendingCallRef.current = null;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(async stream => {
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = await createPeerConnection(
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
          })
          .catch(error => {
            logger.error('Error handling incoming call offer:', error);
            toast({ description: 'Failed to connect call' });
            closePeerConnection();
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
            setInCall(false);
          });

        setInCall(true);
      })
      .catch(error => {
        logger.error('Error accessing media devices:', error);
        toast({ description: 'Failed to access camera/microphone' });
      });
  }, [socketRef, createPeerConnection, handleCallEnded, remoteDescriptionSet, addBufferedCandidates, closePeerConnection, toast]);

  const rejectCall = useCallback(() => {
    const data = pendingCallRef.current;
    if (data) {
      socketRef.current?.send(JSON.stringify({ type: 'callRejected', to: data.from }));
    }
    pendingCallRef.current = null;
    setIncomingCall(null);
  }, [socketRef]);

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
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    handleIncomingCall,
    handleCallAccepted,
    handleCallEnded,
    handleCallDeclined,
  };
}

export default useCall;
