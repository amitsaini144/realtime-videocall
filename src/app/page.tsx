"use client"
import UserCard from '@/components/userCard';
import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState, useRef, useCallback } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingScreen from '@/components/loadingScreen';
import MessageSection from '@/components/messageSection';
import MovingCloudsBackground from '@/components/MovingCloudsBg';
import useVideoCall from '@/hooks/useVideoCall';
import VideoCallComponent from '@/components/videoCall';
import useVideoCallApp from '@/hooks/useVideoCallApp';
import useWebSocket from '@/hooks/useWebSocket';

export default function Home() {
  const [messageInput, setMessageInput] = useState('');
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const {
  //   connectedUsers,
  //   currentUser,
  //   receivedMessages,
  //   socketRef,
  //   startCall,
  //   handleCallEnded,
  //   localStream,
  //   remoteStream,
  //   inCall
  // } = useWebSocket(user, getToken);

  const {
    connectedUsers,
    currentUser,
    receivedMessages,
    socketRef,
    startCall,
    handleCallEnded,
    localStream,
    remoteStream,
    inCall
  } = useVideoCall(user, getToken, toast);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [receivedMessages, scrollToBottom]);

  const handleSendMessage = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentUser && messageInput.trim()) {
      const message = {
        type: 'message',
        content: messageInput.trim(),
        sender: currentUser.username
      };
      socketRef.current.send(JSON.stringify(message));
      setMessageInput('');
    }
  }, [currentUser, messageInput, socketRef]);

  if (!currentUser || !socketRef.current) {
    return (
      <div className='relative flex flex-col min-h-screen bg-gradient-to-bl from-sky-600 via-sky-400 to-sky-200'>
        <MovingCloudsBackground />
        <LoadingScreen />
      </div>
    );
  }
  const otherConnectedUsers = connectedUsers.filter(user => user.id !== currentUser.id);


  return (
    <div className='relative flex flex-col min-h-screen bg-gradient-to-bl from-sky-600 via-sky-400 to-sky-200'>
      <MovingCloudsBackground />
      <div className='relative z-10 flex flex-col min-h-screen bg-white/10 backdrop-blur-[2px]'>
        <Navbar userName={currentUser.username || 'Unknown'} />

        <div className='w-full max-w-4xl mx-auto mt-20 px-4 flex flex-col items-center justify-center flex-grow'>
          {!otherConnectedUsers.length ? (
            <motion.div className="text-white text-xl md:text-base"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              No other users connected.
            </motion.div>
          ) : (
            <div className='w-full flex flex-col justify-between h-full min-h-screen'>
              <div className='flex flex-col items-center justify-center '>
                <div className='flex flex-wrap justify-center gap-4 mb-4'>
                  {otherConnectedUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      userName={user.username || 'Unknown'}
                      onClick={() => startCall(user)}
                    />
                  ))}
                </div>

              </div>

              <div className='w-full'>
                <MessageSection messagesEndRef={messagesEndRef} recivedMessages={receivedMessages} currentUser={currentUser} />
                <motion.div className='w-full py-4'
                  initial={{ opacity: 0, y: 100, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className='max-w-4xl mx-auto flex items-center'>
                    <input
                      className='flex-grow mr-2 p-2 rounded-xl focus:outline-none'
                      placeholder='Say hi to everyone'
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      maxLength={100}
                    />
                    <Button
                      className='bg-[#03AED2] rounded-xl text-white hover:text-white/90 hover:bg-[#03AED2]/70 shadow-sm' variant='ghost'
                      onClick={handleSendMessage}>
                      Send
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
      <VideoCallComponent
        inCall={inCall}
        localStream={localStream}
        remoteStream={remoteStream}
        handleCallEnded={handleCallEnded}
      />
    </div>

  )
}