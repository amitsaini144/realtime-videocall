import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "../app/page";
import { UserResource } from "@clerk/types";

function useVideoCall(user: UserResource | null | undefined, getToken: () => Promise<string | null>, toast: (options: { description: string }) => void) {
    const [inCall, setInCall] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [receivedMessages, setReceivedMessages] = useState<Array<{ content: string, sender: string }>>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    const configuration = {
        iceServers: [
            {
                urls: "stun:stun.relay.metered.ca:80",
            },
            {
                urls: "turn:global.relay.metered.ca:80",
                username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
            },
            {
                urls: "turn:global.relay.metered.ca:80?transport=tcp",
                username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
            },
            {
                urls: "turn:global.relay.metered.ca:443",
                username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
            },
            {
                urls: "turns:global.relay.metered.ca:443?transport=tcp",
                username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
            },
        ],
    };

    const startCall = useCallback(async (targetUser: User) => {
        if (inCall) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            const pc = new RTCPeerConnection(configuration);

            pc.onicecandidate = (event) => {
                if (event.candidate && socketRef.current && targetUser) {
                    socketRef.current.send(JSON.stringify({
                        type: 'iceCandidate',
                        candidate: event.candidate,
                        to: targetUser.id
                    }));
                }
            };
            pc.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', pc.iceConnectionState);
                if (pc.iceConnectionState === 'failed') {
                    console.log('ICE connection failed. Attempting to restart ICE.');
                    pc.restartIce();
                }
            };

            pc.onicegatheringstatechange = () => {
                console.log('ICE gathering state:', pc.iceGatheringState);
            }

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socketRef.current?.send(JSON.stringify({
                type: 'videoCallOffer',
                offer: offer,
                to: targetUser.id
            }));

            peerConnectionRef.current = pc;
            setInCall(true);
        } catch (error) {
            console.error('Error starting call:', error);
            toast({ description: 'Failed to start call' });
        }
    }, [inCall, toast]);

    const handleIncomingCall = useCallback((data: { from: string, offer: RTCSessionDescriptionInit }) => {
        if (inCall) {
            socketRef.current?.send(JSON.stringify({ type: 'callBusy', to: data.from }));
            return;
        }
        console.log('data', data.from);
        const confirmed = window.confirm(`Incoming call from ${data.from}. Accept?`);
        if (!confirmed) {
            socketRef.current?.send(JSON.stringify({ type: 'callRejected', to: data.from }));
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                setLocalStream(stream);

                const pc = new RTCPeerConnection(configuration);
                pc.onicecandidate = (event) => {
                    if (event.candidate && socketRef.current) {
                        socketRef.current.send(JSON.stringify({
                            type: 'iceCandidate',
                            candidate: event.candidate,
                            to: data.from
                        }));
                    }
                };

                pc.ontrack = (event) => {
                    setRemoteStream(event.streams[0]);
                };

                pc.oniceconnectionstatechange = () => {
                    console.log('ICE connection state:', pc.iceConnectionState);
                    if (pc.iceConnectionState === 'failed') {
                        console.log('ICE connection failed. Attempting to restart ICE.');
                        pc.restartIce();
                    }
                };

                pc.onicegatheringstatechange = () => {
                    console.log('ICE gathering state:', pc.iceGatheringState);
                };

                peerConnectionRef.current = pc;
                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                    .then(() => pc.createAnswer())
                    .then(answer => pc.setLocalDescription(answer))
                    .then(() => {
                        socketRef.current?.send(JSON.stringify({
                            type: 'videoCallAnswer',
                            answer: pc.localDescription,
                            to: data.from
                        }));
                    });

                const incomingUser: User | null = connectedUsers.find(user => user.id === data.from) || null;
                console.log('incoming user', incomingUser, connectedUsers);
                setInCall(true);
            })
            .catch(error => {
                console.error('Error accessing media devices.', error);
                toast({ description: 'Failed to access camera/microphone' });
            });
    }, [inCall]);

    const handleNewICECandidate = useCallback((data: { candidate: RTCIceCandidateInit | null }) => {
        if (data.candidate) {
            console.log('Received ICE candidate:', data.candidate);
            peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate))
                .catch(e => console.error('Error adding received ice candidate', e));
        }
    }, []);

    const handleCallAccepted = useCallback((data: { answer: RTCSessionDescriptionInit }) => {
        peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
    }, []);

    const handleCallEnded = useCallback(() => {
        console.log('call ended');
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        setLocalStream(null);
        setRemoteStream(null);

        setInCall(false);

        toast({ description: 'Call ended' });
    }, [toast, localStream]);

    const connectWebSocket = useCallback(async () => {
        if (!user || isConnecting || socketRef.current) return;

        setIsConnecting(true);

        try {
            const token = await getToken();
            const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
            const ws = new WebSocket(`${WS_URL}?token=${token}`);

            ws.onopen = () => {
                console.log('WebSocket connected');
                socketRef.current = ws;
                setIsConnecting(true);
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
                setTimeout(connectWebSocket, 10000);
                console.log('WebSocket closed. Attempting to reconnect...');
                socketRef.current = null;
                setIsConnecting(false);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnecting(false);
            };

        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            setIsConnecting(false);
        }

    }, [user, getToken, isConnecting]);

    const checkAndRestartIce = useCallback(() => {
        if (peerConnectionRef.current && peerConnectionRef.current.iceConnectionState === 'failed') {
            console.log('ICE connection failed. Restarting...');
            peerConnectionRef.current.restartIce();
        }

    }, []);

    useEffect(() => {
        const interval = setInterval(checkAndRestartIce, 5000);
        return () => clearInterval(interval);
    }, [checkAndRestartIce]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            socketRef.current?.close();
        };
    }, [connectWebSocket]);

    return {
        connectedUsers,
        currentUser,
        receivedMessages,
        socketRef,
        handleIncomingCall,
        startCall,
        handleCallAccepted,
        handleNewICECandidate,
        handleCallEnded,
        localStream,
        remoteStream,
        inCall
    };
}

export default useVideoCall;