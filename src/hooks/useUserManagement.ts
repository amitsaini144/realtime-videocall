import { useCallback, useState } from "react";
import { User } from "@/types";

const useUserManagement = (socketRef: React.RefObject<WebSocket>) => {
    const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const handleUserData = useCallback((data: any) => {
        if (data.type === 'userList') {
            setConnectedUsers(data.users);
        } else if (data.type === 'userData') {
            setCurrentUser(data.user);
        }
    }, []);
    console.log("handleUserData");
    return { connectedUsers, currentUser, handleUserData };
};

export default useUserManagement;