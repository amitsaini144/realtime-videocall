import { useCallback, useRef, useState } from 'react';
import { UserResource } from '@clerk/types';
import { User, ChatMessage, InboundWsMessage } from '@/types';
import useWebSocketConnection from './useWebSocketConnection';
import usePeerConnection from './usePeerConnection';
import useCall from './useCall';

type ToastFn = (options: { description: string }) => void;

function useVideoCallApp(
  user: UserResource | null | undefined,
  getToken: () => Promise<string | null>,
  toast: ToastFn,
) {
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<ChatMessage[]>([]);

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
    startCall,
    handleIncomingCall,
    handleCallAccepted,
    handleCallEnded,
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
        setReceivedMessages(prev => [...prev, { content: data.content, sender: data.sender }]);
        break;
      case 'userList':
        setConnectedUsers(data.users);
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
    }
  }, [handleIncomingCall, handleCallAccepted, handleCallEnded, handleNewICECandidate]);

  return {
    connectedUsers,
    currentUser,
    receivedMessages,
    socketRef,
    connectionState,
    inCall,
    localStream,
    remoteStream,
    startCall,
    handleCallEnded,
  };
}

export default useVideoCallApp;
