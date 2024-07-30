import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface UserCardProps {
  userName: string;
  onClick: () => void;
}

export default function UserCard({ userName, onClick }: UserCardProps) {
  const [isCalling, setIsCalling] = useState(false);

  const handleClick = () => {
    setIsCalling(true);
    onClick();
    setTimeout(() => setIsCalling(false), 5000);
  };

  return (
    <motion.div
      className="flex flex-col p-3 rounded-xl gap-3 w-48 items-center bg-white shadow-lg"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <h1>{userName}</h1>
      <motion.div
        className='w-full'
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.1 }}
      >
        <Button
          className={`px-3 py-1 rounded-xl w-full text-white ${isCalling ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#03AED2] hover:bg-[#03AED2]/80 hover:text-white'
            }`}
          onClick={handleClick}
          disabled={isCalling}
        >
          {isCalling ? "Calling..." : "Video call"}
        </Button>
      </motion.div>
    </motion.div>
  )
}