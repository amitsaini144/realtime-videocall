'use client'

import { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  src: string;
  durationSec?: number;
  isOwn: boolean;
}

export default function VoiceMessagePlayer({ src, durationSec, isOwn }: Readonly<VoiceMessagePlayerProps>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const formatDuration = (sec?: number) => {
    if (sec === undefined) return '';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlay}
        className={`p-2 rounded-full flex-shrink-0 ${isOwn ? 'bg-white/20' : 'bg-brand/10'}`}
      >
        {isPlaying ? (
          <Pause className={`h-3.5 w-3.5 ${isOwn ? 'text-white' : 'text-brand'}`} />
        ) : (
          <Play className={`h-3.5 w-3.5 ${isOwn ? 'text-white' : 'text-brand'}`} />
        )}
      </button>
      <span className="text-xs">{formatDuration(durationSec)}</span>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
