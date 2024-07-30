import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VideoCallComponentProps {
    inCall: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    handleCallEnded: () => void;
}

const VideoCallComponent: React.FC<VideoCallComponentProps> = ({ inCall, localStream, remoteStream, handleCallEnded }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <AnimatePresence>
            {inCall && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-sky-900 bg-opacity-20 backdrop-blur-sm"
                >
                    <div
                        ref={containerRef}
                        className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-4xl mx-4"
                    >
                        <div className="relative aspect-video ">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-[90vh] object-cover "
                            />
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="absolute bottom-4 right-4 w-1/4 h-1/4 object-cover rounded-lg"
                            />
                            <button
                                onClick={handleCallEnded}
                                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VideoCallComponent;