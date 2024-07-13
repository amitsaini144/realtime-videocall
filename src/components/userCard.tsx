import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface UserCardProps {
  userName: string;
  onPing: () => void;
}

export default function UserCard({ userName, onPing }: UserCardProps) {
  return (
    <motion.div className="flex flex-col border-2 border-red-500 p-3 rounded-xl gap-3 w-48 items-center bg-white/90 shadow-lg"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ rotate: [0, 3, -3, 3, -3, 0], transition: { duration: 0.4 }, }}
      transition={{ duration: 0.6,  }}
    >
      <h1>{userName}</h1>
      <Button className="bg-red-500 px-3 py-1 rounded-xl w-full text-white hover:border-2 border-red-500" onClick={onPing} variant='ghost'>Ping</Button>
    </motion.div>
  )
}