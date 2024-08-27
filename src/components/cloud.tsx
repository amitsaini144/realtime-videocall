import { motion } from 'framer-motion';

export const Cloud = ({ delay = 0, yPosition = 0, size = 1 }) => (
    <motion.svg
        className="absolute"
        width={128 * size}
        height={64 * size}
        viewBox="0 0 128 64"
        style={{
            top: `${yPosition}%`
        }}
        initial={{ left: '-35%' }}
        animate={{ left: '100vw' }}
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
            opacity="0.7"
        />
    </motion.svg>
);