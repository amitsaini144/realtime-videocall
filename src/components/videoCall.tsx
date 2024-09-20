import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface VideoCallComponentProps {
    inCall: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    handleCallEnded: () => void;
}

export default function VideoCallComponent({ inCall, localStream, remoteStream, handleCallEnded }: VideoCallComponentProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
            console.log("local stream", localStream);
        }
    }, [localStream])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
            console.log("remote stream", remoteStream);
        } else {
            setIsLoading(false)
        }
    }, [remoteStream])

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
            setIsMuted(!isMuted)
        }
    }

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
            setIsVideoOff(!isVideoOff)
        }
    }

    return (
        <AnimatePresence>
            {inCall && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-600 via-sky-400 to-sky-200 bg-opacity-90 backdrop-blur-sm"
                >
                    <div
                        ref={containerRef}
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl mx-4 aspect-video"
                    >
                        <div className="relative aspect-video ">
                            {isLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#03AED2] text-white">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mb-4"
                                    />
                                    <p className="text-xl font-semibold">Connecting to call...</p>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="absolute bottom-4 right-4 w-1/4 aspect-video"
                                    >
                                        <video
                                            ref={localVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover rounded-lg shadow-lg"
                                        />
                                    </motion.div>
                                </>
                            )}
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    onClick={toggleMute}
                                    className="bg-white/20 hover:bg-white/30 text-white rounded-full p-4"
                                >
                                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    onClick={toggleVideo}
                                    className="bg-white/20 hover:bg-white/30 text-white rounded-full p-4"
                                >
                                    {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    onClick={handleCallEnded}
                                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4"
                                >
                                    <Phone className="h-6 w-6 transform rotate-135" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}