"use client"
import UserCard from '@/components/userCard';
import { UserButton, useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function Home() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<Array<{ id: string, username: string }>>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast()

  useEffect(() => {
    async function connectWebSocket() {
      if (!user) return;

      const token = await getToken();
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      const newSocket = new WebSocket(`${WS_URL}?token=${token}`);

      newSocket.onopen = () => {
        console.log('Connection established');
      }

      newSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setReceivedMessages(prev => [...prev, data.content]);
          setLatestMessage(data.content);
          toast({
            className: 'text-green-500 text-2xl p-4',
            description: data.content,
          });
        } else if (data.type === 'userList') {
          setConnectedUsers(data.users);
        } else if (data.type === 'userData') {
          setCurrentUser(data.user);
        }
      }

      newSocket.onclose = () => {
        console.log('Connection closed. Attempting to reconnect...');
        setTimeout(connectWebSocket, 5000);
      };

      setSocket(newSocket);
      return () => newSocket.close();
    }

    connectWebSocket();
  }, [user, getToken, toast])

  const handlePing = (targetUser: string) => {
    if (socket && currentUser) {
      socket.send(JSON.stringify({
        type: 'ping',
        from: currentUser.id,
        to: targetUser
      }));
    }
  }

  const handlePingAll = () => {
    if (socket && currentUser) {
      socket.send(JSON.stringify({
        type: 'pingAll',
        from: currentUser.id
      }));
    }
  };

  if (!socket || !currentUser) {
    return (
      <div className='flex flex-col items-center justify-center h-screen'>
        <div>Connecting to server...</div>
      </div>
    )
  }

  const otherConnectedUsers = connectedUsers.filter(user => user.id !== currentUser.id);

  return (
    <>
      <div className='flex flex-col items-center min-h-screen bg-black/90 p-4'>
        <Navbar userName={currentUser.username || 'Unknown'} />

        <div className='w-full max-w-4xl mt-4 flex flex-col items-center'>
          {!otherConnectedUsers.length ? (
            <div className="text-white">No other users connected.</div>
          ) : (
            <>
              <div className='flex flex-wrap justify-center gap-4 mb-4'>
                {otherConnectedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    userName={user.username || 'Unknown'}
                    onPing={() => handlePing(user.id)}
                  />
                ))}
              </div>
              <Button
                className='bg-red-500 rounded-xl text-white'
                variant='ghost'
                onClick={handlePingAll}
              >
                Send ping to all
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}