import { useCallback, useRef, useState } from 'react';
import { User } from '@/types';
import { logger } from '@/lib/logger';

type ToastFn = (options: { description: string }) => void;

const RING_TIMEOUT_MS = 30000;

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

export interface PeerConnectionApi {
  peerConnectionRef: React.MutableRefObject<RTCPeerConnection | null>;
  remoteDescriptionSet: React.MutableRefObject<boolean>;
  addBufferedCandidates: () => void;
  createPeerConnection: (
    onTrack: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onConnectionFailed: () => void,
    onIceDisconnected: () => void,
  ) => Promise<RTCPeerConnection>;
  closePeerConnection: () => void;
}

function useCall(
  socketRef: React.RefObject<WebSocket | null>,
  peerConnection: PeerConnectionApi,
  currentUserRef: React.RefObject<User | null>,
  toast: ToastFn,
) {
  const {
    peerConnectionRef,
    remoteDescriptionSet,
    addBufferedCandidates,
    createPeerConnection,
    closePeerConnection,
  } = peerConnection;
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCallRef = useRef<IncomingCallData | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  // True while we're the one who sent the original offer for the current call.
  // Only the original offerer re-offers on ICE restart, so both sides never
  // race to renegotiate at once.
  const isCallerRef = useRef(false);
  // Guards against a call that's never answered — e.g. the offer got
  // dropped by a race with the callee's disconnect, or their client just
  // never responds. Cleared as soon as an answer/decline/callFailed comes
  // in, or the call ends some other way.
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every hangup/decline and every new call attempt. In-flight
  // startCall/acceptCall promise chains capture the id at start and check it
  // after every await — if it no longer matches, this call was superseded
  // (e.g. the user hung up while getUserMedia/ICE gathering was still
  // running) and the chain aborts instead of resurrecting stale state.
  const callGenerationRef = useRef(0);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const handleCallEnded = useCallback(() => {
    logger.log('[useCall] handleCallEnded: cleaning up local call state');
    callGenerationRef.current += 1;
    clearRingTimeout();
    closePeerConnection();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteUserIdRef.current = null;
    isCallerRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    toast({ description: 'Call ended' });
  }, [closePeerConnection, toast, clearRingTimeout]);

  const endCall = useCallback(() => {
    // Nothing to end (e.g. the beforeunload/pagehide handler fires on every
    // reload regardless of call state) — skip the cleanup and toast.
    if (!remoteUserIdRef.current) return;
    logger.log('[useCall] endCall: notifying peer', remoteUserIdRef.current);
    socketRef.current?.send(JSON.stringify({ type: 'endCall', to: remoteUserIdRef.current }));
    handleCallEnded();
  }, [socketRef, handleCallEnded]);

  const handleCallDeclined = useCallback((reason: 'busy' | 'rejected' | 'unavailable' | 'no-answer') => {
    callGenerationRef.current += 1;
    clearRingTimeout();
    closePeerConnection();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteUserIdRef.current = null;
    isCallerRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    const messages = {
      busy: 'User is busy',
      rejected: 'Call declined',
      unavailable: 'User is no longer available',
      'no-answer': 'No answer',
    };
    toast({ description: messages[reason] });
  }, [closePeerConnection, toast, clearRingTimeout]);

  // Aborts a stale call attempt: closes the peer connection this attempt
  // created (only if a newer generation hasn't already replaced it) and
  // stops the local media tracks it acquired.
  const abortStaleCall = useCallback((stream: MediaStream, pc: RTCPeerConnection | null) => {
    logger.log('[useCall] aborting stale call attempt (superseded by hangup or new call)');
    pc?.close();
    if (pc && peerConnectionRef.current === pc) {
      peerConnectionRef.current = null;
    }
    stream.getTracks().forEach(track => track.stop());
  }, [peerConnectionRef]);

  // Re-offers on the existing peer connection when ICE drops (e.g. wifi/cell
  // handoff, brief network blip). Only the original caller does this — the
  // other side just waits for the incoming iceRestartOffer — so both sides
  // never try to renegotiate at the same time.
  const attemptIceRestart = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const targetId = remoteUserIdRef.current;
    if (!isCallerRef.current || !pc || !targetId) return;
    try {
      logger.log('[useCall] attempting ICE restart, offering to', targetId);
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socketRef.current?.send(JSON.stringify({
        type: 'iceRestartOffer',
        offer: pc.localDescription,
        to: targetId,
      }));
    } catch (error) {
      logger.error('Error attempting ICE restart:', error);
    }
  }, [peerConnectionRef, socketRef]);

  const handleIceRestartOffer = useCallback((data: { offer: RTCSessionDescriptionInit; from: string }) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    pc.setRemoteDescription(data.offer)
      .then(() => pc.createAnswer())
      .then(answer => pc.setLocalDescription(answer))
      .then(() => {
        logger.log('[useCall] answering ICE restart offer from', data.from);
        socketRef.current?.send(JSON.stringify({
          type: 'iceRestartAnswer',
          answer: pc.localDescription,
          to: data.from,
        }));
      })
      .catch(e => logger.error('Error handling ICE restart offer:', e));
  }, [peerConnectionRef, socketRef]);

  const handleIceRestartAnswer = useCallback((data: { answer: RTCSessionDescriptionInit }) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    pc.setRemoteDescription(data.answer)
      .catch(e => logger.error('Error applying ICE restart answer:', e));
  }, [peerConnectionRef]);

  const startCall = useCallback(async (targetUser: User) => {
    if (inCall || incomingCall) return;
    const myGeneration = ++callGenerationRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (callGenerationRef.current !== myGeneration) {
        abortStaleCall(stream, null);
        return;
      }
      localStreamRef.current = stream;
      remoteUserIdRef.current = targetUser.id;
      isCallerRef.current = true;
      setLocalStream(stream);
      logger.log('[useCall] startCall: localStream set', stream.id);

      const pc = await createPeerConnection(
        (remStream) => setRemoteStream(remStream),
        (candidate) => {
          socketRef.current?.send(JSON.stringify({
            type: 'iceCandidate',
            candidate,
            to: targetUser.id,
          }));
        },
        endCall,
        attemptIceRestart,
      );
      if (callGenerationRef.current !== myGeneration) {
        abortStaleCall(stream, pc);
        return;
      }

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      if (callGenerationRef.current !== myGeneration) {
        abortStaleCall(stream, pc);
        return;
      }

      socketRef.current?.send(JSON.stringify({
        type: 'videoCallOffer',
        offer: pc.localDescription,
        to: targetUser.id,
      }));

      setInCall(true);
      logger.log('[useCall] startCall: inCall set true');

      // If the callee's client never answers (offer lost to a race with
      // their disconnect, they ignore the ring, etc.) don't leave the
      // caller stuck on the connecting screen forever.
      ringTimeoutRef.current = setTimeout(() => {
        if (callGenerationRef.current === myGeneration) {
          logger.log('[useCall] ring timeout: no answer received');
          handleCallDeclined('no-answer');
        }
      }, RING_TIMEOUT_MS);
    } catch (error) {
      logger.error('Error starting call:', error);
      toast({ description: 'Failed to start call' });
    }
  }, [inCall, incomingCall, socketRef, createPeerConnection, endCall, attemptIceRestart, abortStaleCall, toast, handleCallDeclined]);

  const acceptCall = useCallback(async () => {
    const data = pendingCallRef.current;
    if (!data) return;
    setIncomingCall(null);
    pendingCallRef.current = null;
    const myGeneration = ++callGenerationRef.current;
    // Show the in-call/connecting UI immediately so the callee isn't staring
    // at the chat screen while getUserMedia/ICE negotiation runs in the
    // background — otherwise the call just appears out of nowhere.
    setInCall(true);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
      logger.error('Error accessing media devices:', error);
      toast({ description: 'Failed to access camera/microphone' });
      if (callGenerationRef.current === myGeneration) {
        setInCall(false);
      }
      return;
    }
    if (callGenerationRef.current !== myGeneration) {
      abortStaleCall(stream, null);
      return;
    }
    localStreamRef.current = stream;
    remoteUserIdRef.current = data.from;
    isCallerRef.current = false;
    setLocalStream(stream);
    logger.log('[useCall] acceptCall: localStream set', stream.id);

    try {
      const pc = await createPeerConnection(
        (remStream) => setRemoteStream(remStream),
        (candidate) => {
          socketRef.current?.send(JSON.stringify({
            type: 'iceCandidate',
            candidate,
            to: data.from,
          }));
        },
        endCall,
        attemptIceRestart,
      );
      if (callGenerationRef.current !== myGeneration) {
        abortStaleCall(stream, pc);
        return;
      }

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(data.offer);
      remoteDescriptionSet.current = true;
      addBufferedCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGathering(pc);
      if (callGenerationRef.current !== myGeneration) {
        abortStaleCall(stream, pc);
        return;
      }

      socketRef.current?.send(JSON.stringify({
        type: 'videoCallAnswer',
        answer: pc.localDescription,
        to: data.from,
      }));

      setInCall(true);
      logger.log('[useCall] acceptCall: inCall set true');
    } catch (error) {
      logger.error('Error handling incoming call offer:', error);
      toast({ description: 'Failed to connect call' });
      if (callGenerationRef.current === myGeneration) {
        closePeerConnection();
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        remoteUserIdRef.current = null;
        isCallerRef.current = false;
        setLocalStream(null);
        setInCall(false);
      } else {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [socketRef, createPeerConnection, endCall, attemptIceRestart, remoteDescriptionSet, addBufferedCandidates, closePeerConnection, abortStaleCall, toast]);

  const handleIncomingCall = useCallback((data: IncomingCallData) => {
    if (inCall) {
      socketRef.current?.send(JSON.stringify({ type: 'callBusy', to: data.from }));
      return;
    }

    if (remoteUserIdRef.current === data.from) {
      // Glare: both users called each other at essentially the same moment.
      // Resolve deterministically so exactly one connection survives instead
      // of each side building its own competing peer connection.
      const myId = currentUserRef.current?.id;
      const iBackOff = !!myId && myId < data.from;
      if (!iBackOff) {
        logger.log('[useCall] glare detected: keeping my own outgoing call, ignoring offer from', data.from);
        return;
      }
      logger.log('[useCall] glare detected: backing off, accepting incoming offer from', data.from);
      pendingCallRef.current = data;
      acceptCall();
      return;
    }

    pendingCallRef.current = data;
    setIncomingCall(data);
  }, [inCall, socketRef, currentUserRef, acceptCall]);

  const rejectCall = useCallback(() => {
    const data = pendingCallRef.current;
    if (data) {
      socketRef.current?.send(JSON.stringify({ type: 'callRejected', to: data.from }));
    }
    pendingCallRef.current = null;
    setIncomingCall(null);
  }, [socketRef]);

  const handleCallAccepted = useCallback((data: { answer: RTCSessionDescriptionInit }) => {
    clearRingTimeout();
    if (!peerConnectionRef.current) return;
    peerConnectionRef.current.setRemoteDescription(data.answer)
      .then(() => {
        remoteDescriptionSet.current = true;
        addBufferedCandidates();
      })
      .catch(e => logger.error('Error setting remote description', e));
  }, [peerConnectionRef, remoteDescriptionSet, addBufferedCandidates, clearRingTimeout]);

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
    handleIceRestartOffer,
    handleIceRestartAnswer,
    endCall,
  };
}

export default useCall;
