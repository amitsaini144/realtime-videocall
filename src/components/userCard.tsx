import { Button } from '@/components/ui/button';

interface UserCardProps {
    userName: string;
    onPing: () => void;
  }
  
  export default function UserCard({userName, onPing}: UserCardProps) {
    return (
      <div className="flex flex-col border-2 border-red-500 p-3 rounded-xl gap-3 w-48 items-center bg-white/90 shadow-lg">
          <h1>{userName}</h1>
          <Button className="bg-red-500 px-3 py-1 rounded-xl w-full text-white hover:border-2 border-red-500" onClick={onPing} variant='ghost'>Ping</Button>
      </div>
     )
  }