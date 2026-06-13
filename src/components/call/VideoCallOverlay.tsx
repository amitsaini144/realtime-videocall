import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react'

interface VideoCallOverlayProps {
  inCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  handleCallEnded: () => void;
}

export default function VideoCallOverlay({ inCall, localStream, remoteStream, handleCallEnded }: Readonly<VideoCallOverlayProps>) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    setIsLoading(!remoteStream)
  }, [remoteStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, isLoading])

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled })
      setIsMuted(prev => !prev)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled })
      setIsVideoOff(prev => !prev)
    }
  }

  return (
    <AnimatePresence>
      {inCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-gray-950"
        >
          {/* Remote video — fills entire screen */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          >
            <track kind="captions" />
          </video>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 gap-6">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/10 p-3 rounded-2xl">
                  <Video className="h-7 w-7 text-white" />
                </div>
                <span className="text-2xl font-bold">PeerLink</span>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-t-white border-white/20"
                style={{ borderWidth: '3px', borderStyle: 'solid' }}
              />
              <p className="text-white/60 font-medium">Connecting to call...</p>
            </div>
          )}

          {/* Local video pip — bottom right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-24 right-4 w-36 md:w-48 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20"
          >
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] text-center py-0.5 font-medium">
              You
            </div>
          </motion.div>

          {/* Status pill — top left */}
          {!isLoading && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>In call</span>
            </div>
          )}

          {/* Controls bar */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-6 py-5 bg-gradient-to-t from-black/60 to-transparent">
            <button onClick={toggleMute} className="flex flex-col items-center gap-1">
              <div className={`p-3.5 rounded-full transition-colors ${isMuted ? 'bg-white text-gray-900' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </div>
              <span className="text-white/70 text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button onClick={toggleVideo} className="flex flex-col items-center gap-1">
              <div className={`p-3.5 rounded-full transition-colors ${isVideoOff ? 'bg-white text-gray-900' : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </div>
              <span className="text-white/70 text-[10px] font-medium">{isVideoOff ? 'Show video' : 'Hide video'}</span>
            </button>

            <button onClick={handleCallEnded} className="flex flex-col items-center gap-1">
              <div className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors">
                <Phone className="h-6 w-6 rotate-[135deg]" />
              </div>
              <span className="text-white/70 text-[10px] font-medium">End call</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
