'use client'

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SendHorizontal } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
}

export default function MessageInput({ onSend }: Readonly<MessageInputProps>) {
  const [messageInput, setMessageInput] = useState('');

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessageInput('');
  };

  return (
    <motion.div
      className="mt-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100">
        <input
          className="flex-grow text-sm text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
          placeholder="Say hi to everyone..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={100}
        />
        <button
          onClick={handleSend}
          disabled={!messageInput.trim()}
          className="p-2 rounded-xl bg-brand text-white hover:bg-brand/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
