'use client'

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';

interface UserCardProps {
  userName: string;
  imageUrl?: string | null;
  onClick: () => void;
}

export default function UserCard({ userName, imageUrl, onClick }: Readonly<UserCardProps>) {
  const [isCalling, setIsCalling] = useState(false);

  const handleClick = () => {
    setIsCalling(true);
    onClick();
    setTimeout(() => setIsCalling(false), 5000);
  };

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-md w-full"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image src={imageUrl} alt={userName} width={40} height={40} className="object-cover" />
          ) : (
            <span className="text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
      </div>

      <div className="flex-grow min-w-0">
        <p className="text-gray-800 font-semibold text-sm truncate">{userName}</p>
        <p className="text-gray-400 text-xs">Online</p>
      </div>

      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.1 }}>
        <Button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium h-auto ${
            isCalling
              ? 'bg-gray-300 cursor-not-allowed hover:bg-gray-300'
              : 'bg-brand hover:bg-brand/80'
          }`}
          onClick={handleClick}
          disabled={isCalling}
        >
          <Video className="h-3.5 w-3.5" />
          {isCalling ? 'Calling...' : 'Call'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
