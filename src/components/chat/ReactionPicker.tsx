'use client'

import { useEffect, useRef } from 'react';
import { QUICK_REACTIONS } from '@/lib/emojis';

interface ReactionPickerProps {
  align: 'left' | 'right';
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function ReactionPicker({ align, onSelect, onClose }: Readonly<ReactionPickerProps>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-1 flex items-center gap-1 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1.5 z-10 ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-base leading-none p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
