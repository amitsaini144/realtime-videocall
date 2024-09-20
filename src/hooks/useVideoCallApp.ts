import { useEffect } from "react";
import useMessageHandling from "./useMessageHandling";
import useWebSocket from "./useWebSocket";
import useUserManagement from "./useUserManagement";
import useVideoCalls from "./useVideoCalls";
import { UserResource } from "@clerk/types";

const useVideoCallApp = (user: UserResource | null | undefined, getToken: () => Promise<string | null>, toast: (options: { description: string }) => void) => {
    const { socketRef } = useWebSocket(user, getToken);
    const { receivedMessages, handleMessage } = useMessageHandling(socketRef);
    const { connectedUsers, currentUser, handleUserData } = useUserManagement(socketRef);
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

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
                handleUserData(data);
                switch (data.type) {
                    case 'videoCallOffer':
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
        }
    }, []);

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

export default useVideoCallApp;