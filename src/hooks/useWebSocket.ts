import { useState, useRef, useCallback, useEffect } from 'react';
import { UserResource } from "@clerk/types";
import useVideoCalls from "./useVideoCalls";
import { User } from '@/types';
import { useToast } from "@/components/ui/use-toast"

const useWebSocket = (user: UserResource | null | undefined, getToken: () => Promise<string | null>) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [receivedMessages, setReceivedMessages] = useState<Array<{ content: string, sender: string }>>([]);
    const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();
    const {
        inCall,
        localStream,
        remoteStream,
        startCall,
        handleIncomingCall,
        handleCallAccepted,
        handleNewICECandidate,
        handleCallEnded
    } = useVideoCalls(socketRef, toast);

    const connectWebSocket = useCallback(async () => {
        if (!user || isConnecting || socketRef.current) return;
        if (socketRef.current) {
            socketRef.current = null;
        }

        setIsConnecting(true);

        try {
            const token = await getToken();
            const WS_URL = "ws://localhost:8080";
            const ws = new WebSocket(`${WS_URL}?token=${token}`);

            ws.onopen = () => {
                socketRef.current = ws;
                console.log(socketRef.current);
                setIsConnecting(false);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
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
                    case `videoCallOffer`:
                        handleIncomingCall(data);
                        break;
                    case 'videoCallAnswer':
                        handleCallAccepted(data);
                        break;
                    case 'iceCandidate':
                        handleNewICECandidate(data);
                        break;
                    case 'handleEndCall':
                        handleCallEnded();
                        break;
                }
            };

            ws.onclose = () => {
                console.log("WebSocket disconnected. Attempting to reconnect...");
                setIsConnecting(false);

                if( reconnectTimeout.current ) {
                    clearTimeout(reconnectTimeout.current);
                }

                reconnectTimeout.current = setTimeout(connectWebSocket, 10000);
            };

            ws.onerror = (error) => {
                console.log("Websocket error", error);
                setIsConnecting(false);
            };

        } catch (error) {
            setIsConnecting(false);
        }
    }, [user, getToken, isConnecting]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            socketRef.current?.close();
            if( reconnectTimeout.current ) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [connectWebSocket]);

    return {
        connectedUsers,
        currentUser,
        receivedMessages,
        socketRef,
        startCall,
        handleCallEnded,
        localStream,
        remoteStream,
        inCall
    };
};

export default useWebSocket;