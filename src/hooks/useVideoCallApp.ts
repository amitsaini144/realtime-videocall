import { useCallback, useRef, useState } from 'react';
import { UserResource } from '@clerk/types';
import { User, ChatMessage, InboundWsMessage } from '@/types';
import useWebSocketConnection from './useWebSocketConnection';
import usePeerConnection from './usePeerConnection';
import useCall from './useCall';

type ToastFn = (options: { description: string }) => void;

function useVideoCallApp(
  user: UserResource | null | undefined,
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
  toast: ToastFn,
) {
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<ChatMessage[]>([]);

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

  const { socketRef, connectionState } = useWebSocketConnection(user, getToken, onMessageRef);

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
  } = useCall(
    socketRef,
    peerConnectionRef,
    remoteDescriptionSet,
    addBufferedCandidates,
    createPeerConnection,
    closePeerConnection,
    toast,
  );

  // Update the ref synchronously every render — WS handler always uses current callbacks.
  onMessageRef.current = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data) as InboundWsMessage;
    switch (data.type) {
      case 'message':
        setReceivedMessages(prev => [...prev, { id: crypto.randomUUID(), content: data.content, sender: data.sender, senderImageUrl: data.senderImageUrl, isOwn: false }]);
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
      case 'endCall':
        handleCallEnded();
        break;
      case 'callBusy':
        handleCallDeclined('busy');
        break;
      case 'callRejected':
        handleCallDeclined('rejected');
        break;
    }
  }, [handleIncomingCall, handleCallAccepted, handleCallEnded, handleCallDeclined, handleNewICECandidate]);

  const displayName = user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'Unknown';

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && currentUserRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        content,
        sender: displayName,
      }));
      // Add own message immediately with isOwn: true — no server echo needed.
      setReceivedMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content,
        sender: displayName,
        senderImageUrl: currentUserRef.current?.imageUrl ?? null,
        isOwn: true,
      }]);
    }
  }, [socketRef, displayName]);

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
    sendMessage,
  };
}

export default useVideoCallApp;
