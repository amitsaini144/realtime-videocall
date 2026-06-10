"use client"
import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useCallback } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { motion } from 'framer-motion';
import useVideoCallApp from '@/hooks/useVideoCallApp';
import Navbar from '@/components/layout/Navbar';
import LoadingScreen from '@/components/layout/LoadingScreen';
import MovingCloudsBackground from '@/components/background/MovingCloudsBackground';
import UserCard from '@/components/users/UserCard';
import MessageSection from '@/components/chat/MessageSection';
import MessageInput from '@/components/chat/MessageInput';
import VideoCallOverlay from '@/components/call/VideoCallOverlay';

export default function Home() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    connectedUsers,
    currentUser,
    receivedMessages,
    socketRef,
    startCall,
    handleCallEnded,
    localStream,
    remoteStream,
    inCall,
  } = useVideoCallApp(user, getToken, toast);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [receivedMessages, scrollToBottom]);

  const handleSendMessage = useCallback((message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && currentUser) {
      socketRef.current.send(JSON.stringify({ type: 'message', content: message, sender: currentUser.username }));
    }
  }, [currentUser, socketRef]);

  if (!currentUser || !socketRef.current) {
    return (
      <div className='relative flex flex-col min-h-screen bg-gradient-to-bl from-sky-600 via-sky-400 to-sky-200'>
        <MovingCloudsBackground />
        <LoadingScreen />
      </div>
    );
  }

  const otherConnectedUsers = connectedUsers.filter(u => u.id !== currentUser.id);

  return (
    <div className='relative flex flex-col min-h-screen bg-gradient-to-bl from-sky-600 via-sky-400 to-sky-200'>
      <MovingCloudsBackground />
      <div className='relative z-10 flex flex-col min-h-screen bg-white/10 backdrop-blur-[2px]'>
        <Navbar userName={currentUser.username || 'Unknown'} />

        <div className='w-full max-w-4xl mx-auto mt-20 px-4 flex flex-col items-center justify-center flex-grow'>
          {otherConnectedUsers.length === 0 ? (
            <motion.div
              className="text-white text-xl md:text-base"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              No other users connected.
            </motion.div>
          ) : (
            <div className='w-full flex flex-col justify-between h-full min-h-screen'>
              <div className='flex flex-col items-center justify-center'>
                <div className='flex flex-wrap justify-center gap-4 mb-4'>
                  {otherConnectedUsers.map((u) => (
                    <UserCard key={u.id} userName={u.username || 'Unknown'} onClick={() => startCall(u)} />
                  ))}
                </div>
              </div>

              <div className='w-full'>
                <MessageSection receivedMessages={receivedMessages} messagesEndRef={messagesEndRef} currentUser={currentUser} />
                <MessageInput onSend={handleSendMessage} />
              </div>
            </div>
          )}
        </div>
      </div>

      <VideoCallOverlay inCall={inCall} localStream={localStream} remoteStream={remoteStream} handleCallEnded={handleCallEnded} />
    </div>
  );
}
