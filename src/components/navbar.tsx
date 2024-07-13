'use client'

import React from 'react';
import { UserButton } from '@clerk/nextjs';

interface Props {
    userName: string;
}

function Navbar({ userName }: Props) {

    return (
        <nav className="sticky top-0 z-50 border-b w-full backdrop-blur px-3 py-2 bg-background/10">
            <div className="mx-auto flex flex-row justify-between items-center px-0">
                <h2 className='text-white'>Welcome, {userName}!</h2>
                <UserButton />
            </div>
        </nav>
    );
}

export default Navbar;