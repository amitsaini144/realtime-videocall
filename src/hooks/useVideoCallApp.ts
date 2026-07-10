import { useCallback, useEffect, useRef, useState } from 'react';
import { User, InboundWsMessage } from '@/types';
import useWebSocketConnection from './useWebSocketConnection';
import usePeerConnection from './usePeerConnection';
import useCall from './useCall';
import useChatMessages from './useChatMessages';
import { Identity } from './useIdentity';

type ToastFn = (options: { description: string }) => void;

function useVideoCallApp(
  identity: Identity,
  toast: ToastFn,
  roomId: string,
) {
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Always-current ref so the WS handler (which has a stale closure) can still
  // read the latest username without needing to be re-created on every render.
  const currentUserRef = useRef<User | null>(null);
  currentUserRef.current = currentUser;

  const {
    peerConnectionRef,
    remoteDescriptionSet,
    addBufferedCandidates,
    handleNewICECandidate,
    createPeerConnection,
    closePeerConnection,
  } = usePeerConnection();

  // Stable ref so the WS handler always calls the latest version of call callbacks
  // without requiring reconnection when those callbacks change.
  const onMessageRef = useRef<(event: MessageEvent) => void>(() => {});

  const { socketRef, connectionState } = useWebSocketConnection(identity, onMessageRef, roomId);

  const displayName = identity.mode === 'clerk' || identity.mode === 'guest' ? identity.displayName : '';

  const {
    receivedMessages,
    typingUsers,
    handleChatWsMessage,
    sendMessage,
    sendVoiceMessage,
    sendImageMessage,
    sendTyping,
    sendReaction,
    sendEditMessage,
    sendDeleteMessage,
  } = useChatMessages(socketRef, currentUserRef, displayName);

  const {
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
  } = useCall(
    socketRef,
    { peerConnectionRef, remoteDescriptionSet, addBufferedCandidates, createPeerConnection, closePeerConnection },
    currentUserRef,
    toast,
  );

  // Update the ref synchronously every render — WS handler always uses current callbacks.
  onMessageRef.current = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data) as InboundWsMessage;
    switch (data.type) {
      case 'message':
      case 'typing':
      case 'reaction':
      case 'edit':
      case 'delete':
        handleChatWsMessage(data);
        break;
      case 'userList':
        setConnectedUsers(data.users.map(u => ({ ...u, imageUrl: u.imageUrl ?? null })));
        break;
      case 'userData':
        setCurrentUser(data.user);
        break;
      case 'videoCallOffer':
        handleIncomingCall(data);
        break;
      case 'videoCallAnswer':
        handleCallAccepted(data);
        break;
      case 'iceCandidate':
        handleNewICECandidate(data);
        break;
      case 'iceRestartOffer':
        handleIceRestartOffer(data);
        break;
      case 'iceRestartAnswer':
        handleIceRestartAnswer(data);
        break;
      case 'endCall':
        handleCallEnded();
        break;
      case 'callBusy':
        handleCallDeclined('busy');
        break;
      case 'callRejected':
        handleCallDeclined('rejected');
        break;
      case 'callFailed':
        handleCallDeclined('unavailable');
        break;
    }
  }, [handleChatWsMessage, handleIncomingCall, handleCallAccepted, handleCallEnded, handleCallDeclined, handleNewICECandidate, handleIceRestartOffer, handleIceRestartAnswer]);

  // Notify the peer immediately if the tab is closed/refreshed mid-call,
  // instead of leaving them stuck on the call screen until their own
  // connection eventually times out.
  useEffect(() => {
    const handleUnload = () => endCall();
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [endCall]);

  return {
    connectedUsers,
    currentUser,
    receivedMessages,
    socketRef,
    connectionState,
    inCall,
    localStream,
    remoteStream,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    handleCallEnded,
    endCall,
    sendMessage,
    sendVoiceMessage,
    sendImageMessage,
    sendReaction,
    sendEditMessage,
    sendDeleteMessage,
    sendTyping,
    typingUsers,
  };
}

export default useVideoCallApp;
