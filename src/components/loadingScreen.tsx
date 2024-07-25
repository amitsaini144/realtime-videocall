import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className='flex flex-col items-center justify-center h-screen bg-gradient-to-bl from-sky-600 via-sky-400 to-sky-200 text-white'>
      <div className="flex items-center">
        <span>Connecting to server</span>
        <div className="ml-1 flex">
          <motion.span
            className="text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }}
          >
            .
          </motion.span>
          <motion.span
            className="text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1], delay: 0.2 }}
          >
            .
          </motion.span>
          <motion.span
            className="text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1], delay: 0.4 }}
          >
            .
          </motion.span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;