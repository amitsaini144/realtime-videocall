import React from 'react';
import { motion } from 'framer-motion';

const Cloud = ({ delay = 0, yPosition = 0, size = 1 }) => (
    <motion.svg
        className="absolute"
        width={128 * size}
        height={64 * size}
        viewBox="0 0 128 64"
        style={{ top: `${yPosition}%` }}
        initial={{ left: '-35%' }}
        animate={{ left: '110%' }}
        transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
            delay
        }}
    >
        <path
            d="M64 16 C64 16, 56 0, 40 0 S16 8, 16 16 S8 32, 8 32 S0 32, 0 48 S16 64, 32 64 H96 C112 64, 128 56, 128 40 S112 24, 112 24 S120 16, 104 8 S80 8, 80 16 S72 8, 64 16"
            fill="white"
            opacity="0.6"
        />
    </motion.svg>
);

const MovingCloudsBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="relative w-full h-full">
                <Cloud delay={0} yPosition={10} size={1.2} />
                <Cloud delay={7} yPosition={30} size={0.8} />
                <Cloud delay={14} yPosition={60} size={1} />
                <Cloud delay={21} yPosition={90} size={0.9} />
            </div>
        </div>
    );
};

export default MovingCloudsBackground;