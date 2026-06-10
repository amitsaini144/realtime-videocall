'use client'

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface MessageInputProps {
  onSend: (message: string) => void;
}

export default function MessageInput({ onSend }: MessageInputProps) {
  const [messageInput, setMessageInput] = useState('');

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessageInput('');
  };

  return (
    <motion.div
      className='w-full py-4'
      initial={{ opacity: 0, y: 100, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className='max-w-4xl mx-auto flex items-center'>
        <input
          className='flex-grow mr-2 p-2 rounded-xl focus:outline-none'
          placeholder='Say hi to everyone'
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={100}
        />
        <Button
          className='bg-brand rounded-xl text-white hover:text-white/90 hover:bg-brand/70 shadow-sm'
          variant='ghost'
          onClick={handleSend}
        >
          Send
        </Button>
      </div>
    </motion.div>
  );
}
