'use client'

import { motion } from 'framer-motion';
import { Video } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-white gap-6">
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white/20 p-3 rounded-2xl">
          <Video className="h-8 w-8 text-white" />
        </div>
        <span className="text-3xl font-bold tracking-tight">PeerLink</span>
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-t-white border-white/20"
        style={{ borderWidth: '3px', borderStyle: 'solid' }}
      />

      <motion.p
        className="text-white/70 text-sm font-medium tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Connecting to server...
      </motion.p>
    </div>
  );
};

export default LoadingScreen;
