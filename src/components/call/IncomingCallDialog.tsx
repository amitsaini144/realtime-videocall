import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video } from 'lucide-react'

interface IncomingCallDialogProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallDialog({ callerName, onAccept, onReject }: Readonly<IncomingCallDialogProps>) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6"
        >
          {/* Pulsing avatar ring */}
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-24 w-24 rounded-full bg-emerald-400/30 animate-ping" />
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white/20 border border-white/30">
              <Video className="h-9 w-9 text-white" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium mb-1">Incoming video call</p>
            <p className="text-white text-2xl font-bold">{callerName}</p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-8">
            <button
              onClick={onReject}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg">
                <PhoneOff className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/70 text-xs font-medium">Decline</span>
            </button>

            <button
              onClick={onAccept}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/70 text-xs font-medium">Accept</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
