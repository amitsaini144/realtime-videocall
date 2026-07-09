"use client"
import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useCallback, useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import useVideoCallApp from '@/hooks/useVideoCallApp';
import useUnfocusedTabNotifications from '@/hooks/useUnfocusedTabNotifications';
import { getDisplayName } from '@/lib/user';
import { ChatMessage } from '@/types';
import Navbar from '@/components/layout/Navbar';
import LoadingScreen from '@/components/layout/LoadingScreen';
import MovingCloudsBackground from '@/components/background/MovingCloudsBackground';
import UserCard from '@/components/users/UserCard';
import MessageSection from '@/components/chat/MessageSection';
import MessageInput from '@/components/chat/MessageInput';
import VideoCallOverlay from '@/components/call/VideoCallOverlay';
import IncomingCallDialog from '@/components/call/IncomingCallDialog';

export default function Home() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    connectedUsers,
    currentUser,
    receivedMessages,
    startCall,
    endCall,
    localStream,
    remoteStream,
    inCall,
    incomingCall,
    acceptCall,
    rejectCall,
    sendMessage,
    sendImageMessage,
    sendVoiceMessage,
    sendReaction,
    sendEditMessage,
    sendDeleteMessage,
    sendTyping,
    typingUsers,
    connectionState,
  } = useVideoCallApp(user, getToken, toast);

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [receivedMessages, scrollToBottom]);

  useUnfocusedTabNotifications(receivedMessages);

  const handleReply = useCallback((message: ChatMessage) => {
    setEditingMessage(null);
    setReplyingTo(message);
  }, []);

  const handleEdit = useCallback((message: ChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(message);
  }, []);

  if (!currentUser || connectionState !== 'connected') {
    return (
      <div className='relative flex flex-col min-h-dvh bg-gradient-to-bl from-sky-700 via-sky-500 to-sky-300'>
        <MovingCloudsBackground />
        <LoadingScreen
          message={currentUser ? 'Reconnecting to server...' : 'Connecting to server...'}
        />
      </div>
    );
  }

  const otherConnectedUsers = connectedUsers.filter(u => u.id !== currentUser.id);

  return (
    <div className='relative flex flex-col min-h-dvh bg-gradient-to-bl from-sky-700 via-sky-500 to-sky-300'>
      <MovingCloudsBackground />
      <div className='relative z-10 flex flex-col min-h-dvh bg-white/10 backdrop-blur-[2px]'>
        <Navbar userName={getDisplayName(user)} />

        <div className='flex flex-col flex-grow pt-16'>
          {otherConnectedUsers.length === 0 ? (
            <div className='flex flex-grow items-center justify-center'>
              <motion.div
                className='flex flex-col items-center gap-3 text-white'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                <div className='bg-white/20 p-4 rounded-2xl'>
                  <Video className='h-10 w-10 text-white' />
                </div>
                <p className='text-xl font-semibold'>No one else is here yet</p>
                <p className='text-white/60 text-sm'>Share the app link to start a call</p>
              </motion.div>
            </div>
          ) : (
            <div className='flex flex-col md:flex-row flex-grow min-h-0 gap-4 p-4' style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <aside className='md:w-64 lg:w-72 flex-shrink-0'>
                <div className='bg-white/15 backdrop-blur-2xl rounded-2xl p-4 border border-white/25 h-full'>
                  <p className='text-white/60 text-xs font-semibold uppercase tracking-widest mb-3'>
                    Online — {otherConnectedUsers.length}
                  </p>
                  <div className='flex flex-row md:flex-col gap-3 flex-wrap md:flex-nowrap'>
                    {otherConnectedUsers.map((u) => (
                      <UserCard
                        key={u.id}
                        userName={u.username || 'Unknown'}
                        imageUrl={u.imageUrl}
                        onClick={() => startCall(u)}
                        disabled={inCall || !!incomingCall}
                      />
                    ))}
                  </div>
                </div>
              </aside>

              <main className='flex flex-col flex-grow min-h-0'>
                <MessageSection
                  receivedMessages={receivedMessages}
                  messagesEndRef={messagesEndRef}
                  currentUser={currentUser}
                  typingUsers={typingUsers}
                  onReact={sendReaction}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={sendDeleteMessage}
                />
                <MessageInput
                  onSend={sendMessage}
                  onSendImage={sendImageMessage}
                  onSendVoice={sendVoiceMessage}
                  onTyping={sendTyping}
                  mentionCandidates={otherConnectedUsers.map(u => u.username).filter((name): name is string => !!name)}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  editingMessage={editingMessage}
                  onCancelEdit={() => setEditingMessage(null)}
                  onSaveEdit={sendEditMessage}
                />
              </main>
            </div>
          )}
        </div>
      </div>

      <VideoCallOverlay inCall={inCall} localStream={localStream} remoteStream={remoteStream} handleCallEnded={endCall} />
      {incomingCall && (
        <IncomingCallDialog
          callerName={incomingCall.fromUsername}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
    </div>
  );
}
