'use client'

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';

interface Props {
    userName: string;
}

function Navbar({ userName }: Props) {
    return (
        <motion.nav className="fixed top-0 left-0 right-0 z-50 border-b w-full backdrop-blur px-3 py-2 bg-background/10"
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
            <div className="mx-auto flex flex-row justify-between items-center px-0">
                <h2 className='text-white'>Welcome, {userName}</h2>
                <UserButton />
            </div>
        </motion.nav>
    );
}
export default Navbar;