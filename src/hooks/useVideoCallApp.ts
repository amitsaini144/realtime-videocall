import { useCallback, useEffect, useRef, useState } from 'react';
import { UserResource } from '@clerk/types';
import { User, ChatMessage, InboundWsMessage, MessageKind, ReplyToRef } from '@/types';
import useWebSocketConnection from './useWebSocketConnection';
import usePeerConnection from './usePeerConnection';
import useCall from './useCall';

type ToastFn = (options: { description: string }) => void;

function buildReplyPreview(message: ChatMessage): string {
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'voice') return '🎤 Voice message';
  return (message.content ?? '').slice(0, 100);
}

function useVideoCallApp(
  user: UserResource | null | undefined,
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
  toast: ToastFn,
) {
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
        setReceivedMessages(prev => [...prev, {
          id: data.id,
          kind: data.kind,
          content: data.content,
          mediaData: data.mediaData,
          mediaMimeType: data.mediaMimeType,
          durationSec: data.durationSec,
          sender: data.sender,
          senderImageUrl: data.senderImageUrl,
          isOwn: false,
        }]);
        break;
      case 'typing': {
        const timeouts = typingTimeoutsRef.current;
        const existing = timeouts.get(data.sender);
        if (existing) clearTimeout(existing);

        if (data.isTyping) {
          setTypingUsers(prev => new Set(prev).add(data.sender));
          timeouts.set(data.sender, setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(data.sender);
              return next;
            });
            timeouts.delete(data.sender);
          }, 5000));
        } else {
          timeouts.delete(data.sender);
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.sender);
            return next;
          });
        }
        break;
      }
      case 'reaction':
        setReceivedMessages(prev => prev.map(message => {
          if (message.id !== data.messageId) return message;
          const reactions = { ...message.reactions };
          let users = reactions[data.emoji] ? [...reactions[data.emoji]] : [];
          if (data.remove) {
            users = users.filter(u => u !== data.sender);
          } else if (!users.includes(data.sender)) {
            users.push(data.sender);
          }
          if (users.length > 0) {
            reactions[data.emoji] = users;
          } else {
            delete reactions[data.emoji];
          }
          return { ...message, reactions };
        }));
        break;
      case 'edit':
        // Only apply if the editor is the original sender — the server
        // stamps `sender` from the authenticated connection, so this can't
        // be spoofed by another client, but it prevents editing a message
        // whose `id` happens to collide (defense in depth).
        setReceivedMessages(prev => prev.map(message => (
          message.id === data.messageId && message.sender === data.sender
            ? { ...message, content: data.content, edited: true }
            : message
        )));
        break;
      case 'delete':
        setReceivedMessages(prev => prev.map(message => (
          message.id === data.messageId && message.sender === data.sender
            ? { ...message, deleted: true, content: undefined, mediaData: undefined, mediaMimeType: undefined, durationSec: undefined, reactions: undefined }
            : message
        )));
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
  }, [handleIncomingCall, handleCallAccepted, handleCallEnded, handleCallDeclined, handleNewICECandidate, handleIceRestartOffer, handleIceRestartAnswer]);

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

  const displayName = user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'Unknown';

  // Cleanup pending typing-indicator timeouts on unmount.
  useEffect(() => {
    const timeouts = typingTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  const sendChatPayload = useCallback((payload: {
    kind: MessageKind;
    content?: string;
    mediaData?: string;
    mediaMimeType?: string;
    durationSec?: number;
    replyTo?: ReplyToRef;
  }) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && currentUserRef.current) {
      const id = crypto.randomUUID();
      socketRef.current.send(JSON.stringify({
        type: 'message',
        id,
        sender: displayName,
        ...payload,
      }));
      // Add own message immediately with isOwn: true — no server echo needed.
      setReceivedMessages(prev => [...prev, {
        id,
        sender: displayName,
        senderImageUrl: currentUserRef.current?.imageUrl ?? null,
        isOwn: true,
        ...payload,
      }]);
    }
  }, [socketRef, displayName]);

  const sendMessage = useCallback((content: string, replyTarget?: ChatMessage) => {
    const replyTo: ReplyToRef | undefined = replyTarget ? {
      id: replyTarget.id,
      sender: replyTarget.sender,
      preview: buildReplyPreview(replyTarget),
    } : undefined;
    sendChatPayload({ kind: 'text', content, replyTo });
  }, [sendChatPayload]);

  const sendVoiceMessage = useCallback((mediaData: string, mediaMimeType: string, durationSec: number) => {
    sendChatPayload({ kind: 'voice', mediaData, mediaMimeType, durationSec });
  }, [sendChatPayload]);

  const sendImageMessage = useCallback((mediaData: string, mediaMimeType: string) => {
    sendChatPayload({ kind: 'image', mediaData, mediaMimeType });
  }, [sendChatPayload]);

  const typingStateRef = useRef(false);
  const sendTyping = useCallback((isTyping: boolean) => {
    if (typingStateRef.current === isTyping) return;
    typingStateRef.current = isTyping;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'typing', isTyping }));
    }
  }, [socketRef]);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || !currentUserRef.current) return;

    const alreadyReacted = receivedMessages.some(
      message => message.id === messageId && message.reactions?.[emoji]?.includes(displayName),
    );
    const remove = alreadyReacted;

    socketRef.current.send(JSON.stringify({ type: 'reaction', messageId, emoji, remove }));
    setReceivedMessages(prev => prev.map(message => {
      if (message.id !== messageId) return message;
      const reactions = { ...message.reactions };
      let users = reactions[emoji] ? [...reactions[emoji]] : [];
      if (remove) {
        users = users.filter(u => u !== displayName);
      } else if (!users.includes(displayName)) {
        users.push(displayName);
      }
      if (users.length > 0) {
        reactions[emoji] = users;
      } else {
        delete reactions[emoji];
      }
      return { ...message, reactions };
    }));
  }, [socketRef, displayName, receivedMessages]);

  const sendEditMessage = useCallback((messageId: string, content: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: 'edit', messageId, content }));
    setReceivedMessages(prev => prev.map(message => (
      message.id === messageId ? { ...message, content, edited: true } : message
    )));
  }, [socketRef]);

  const sendDeleteMessage = useCallback((messageId: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: 'delete', messageId }));
    setReceivedMessages(prev => prev.map(message => (
      message.id === messageId
        ? { ...message, deleted: true, content: undefined, mediaData: undefined, mediaMimeType: undefined, durationSec: undefined, reactions: undefined }
        : message
    )));
  }, [socketRef]);

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
