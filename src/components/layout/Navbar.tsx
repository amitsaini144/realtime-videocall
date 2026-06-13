'use client'

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Video, User } from 'lucide-react';

interface NavbarProps {
  userName: string;
}

function Navbar({ userName }: Readonly<NavbarProps>) {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20"
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">PeerLink</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-white/80 text-sm font-medium">
            <User className="h-4 w-4" />
            <span>{userName}</span>
          </div>
          <UserButton />
        </div>
      </div>
    </motion.nav>
  );
}

export default Navbar;
