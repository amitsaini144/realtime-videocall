import { useCallback, useState } from "react";

const useMessageHandling = (socketRef: React.RefObject<WebSocket>) => {
    const [receivedMessages, setReceivedMessages] = useState<Array<{ content: string, sender: string }>>([]);

    const handleMessage = useCallback((data: any) => {
        if (data.type === 'message') {
            setReceivedMessages(prev => [...prev, { content: data.content, sender: data.sender }]);
        }
    }, []);
    console.log("handleMessage");
    return { receivedMessages, handleMessage };
};

export default useMessageHandling;