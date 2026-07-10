'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SendHorizontal, Smile, Mic, Square, ImagePlus, X, Reply, Pencil, Pause, Play } from 'lucide-react';
import { fileToResizedBase64, blobToBase64 } from '@/lib/chat/media';
import useVoiceRecorder from '@/hooks/useVoiceRecorder';
import { ChatMessage } from '@/types';
import { renderRichText } from '@/lib/chat/richText';
import EmojiPicker from './EmojiPicker';
import MentionAutocomplete from './MentionAutocomplete';

const FORMATTING_HINT_REGEX = /\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`/;

const TYPING_IDLE_MS = 3000;

function previewFor(message: ChatMessage): string {
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'voice') return '🎤 Voice message';
  return message.content ?? '';
}

interface MessageInputProps {
  onSend: (message: string, replyTo?: ChatMessage) => void;
  onSendImage: (mediaData: string, mediaMimeType: string) => void;
  onSendVoice: (mediaData: string, mediaMimeType: string, durationSec: number) => void;
  onTyping: (isTyping: boolean) => void;
  mentionCandidates: string[];
  replyingTo?: ChatMessage | null;
  onCancelReply: () => void;
  editingMessage?: ChatMessage | null;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, content: string) => void;
}

export default function MessageInput({
  onSend,
  onSendImage,
  onSendVoice,
  onTyping,
  mentionCandidates,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}: Readonly<MessageInputProps>) {
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setMessageInput(editingMessage.content ?? '');
      textInputRef.current?.focus();
    } else {
      setMessageInput('');
    }
  }, [editingMessage]);

  const stopTyping = useCallback(() => {
    if (typingIdleTimerRef.current) {
      clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = null;
    }
    onTyping(false);
  }, [onTyping]);

  const handleVoiceStop = useCallback(async (blob: Blob, durationSec: number) => {
    const dataUrl = await blobToBase64(blob);
    onSendVoice(dataUrl, 'audio/webm;codecs=opus', durationSec);
  }, [onSendVoice]);

  const {
    isRecording,
    isPaused,
    elapsedSec,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
    pause: pauseRecording,
    resume: resumeRecording,
  } = useVoiceRecorder(handleVoiceStop);

  const updateMentionQuery = (value: string, cursorPos: number) => {
    const beforeCursor = value.slice(0, cursorPos);
    const match = /@(\w*)$/.exec(beforeCursor);
    setMentionQuery(match ? match[1] : null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    updateMentionQuery(value, e.target.selectionStart ?? value.length);
    onTyping(true);
    if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
    typingIdleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    if (editingMessage) {
      onSaveEdit(editingMessage.id, trimmed);
      onCancelEdit();
    } else {
      onSend(trimmed, replyingTo ?? undefined);
      if (replyingTo) onCancelReply();
    }

    setMessageInput('');
    setMentionQuery(null);
    stopTyping();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMentionSelect = (username: string) => {
    const cursorPos = textInputRef.current?.selectionStart ?? messageInput.length;
    const beforeCursor = messageInput.slice(0, cursorPos);
    const afterCursor = messageInput.slice(cursorPos);
    const replaced = beforeCursor.replace(/@\w*$/, `@${username} `);
    setMessageInput(replaced + afterCursor);
    setMentionQuery(null);
    textInputRef.current?.focus();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const { dataUrl, mimeType } = await fileToResizedBase64(file);
    setPendingImage({ dataUrl, mimeType });
  };

  const sendPendingImage = () => {
    if (!pendingImage) return;
    onSendImage(pendingImage.dataUrl, pendingImage.mimeType);
    setPendingImage(null);
  };

  const formattedElapsed = `0:${elapsedSec.toString().padStart(2, '0')}`;

  return (
    <motion.div
      className="mt-3 relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {replyingTo && (
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 mb-2 shadow-sm border border-gray-100">
          <Reply className="h-4 w-4 text-brand flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <p className="text-xs font-semibold text-brand">Replying to {replyingTo.sender}</p>
            <p className="text-xs text-gray-500 truncate">{previewFor(replyingTo)}</p>
          </div>
          <button onClick={onCancelReply} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 mb-2 shadow-sm border border-gray-100">
          <Pencil className="h-4 w-4 text-brand flex-shrink-0" />
          <p className="text-xs font-semibold text-brand flex-grow">Editing message</p>
          <button onClick={onCancelEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pendingImage && (
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 mb-2 shadow-sm border border-gray-100">
          <Image src={pendingImage.dataUrl} alt="Selected attachment preview" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover" />
          <p className="text-xs text-gray-500 flex-grow">Ready to send</p>
          <button onClick={() => setPendingImage(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="h-4 w-4" />
          </button>
          <button onClick={sendPendingImage} className="p-1.5 rounded-lg bg-brand text-white hover:bg-brand/80">
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      )}

      {!editingMessage && FORMATTING_HINT_REGEX.test(messageInput) && (
        <div className="bg-white rounded-2xl px-3 py-2 mb-2 shadow-sm border border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Preview</p>
          <p className="text-sm text-gray-700 break-words">{renderRichText(messageInput, null, mentionCandidates)}</p>
        </div>
      )}

      {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
      {mentionQuery !== null && (
        <MentionAutocomplete candidates={mentionCandidates} query={mentionQuery} onSelect={handleMentionSelect} />
      )}

      <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100">
        {isRecording ? (
          <>
            <div className="flex items-center gap-2 flex-grow text-sm text-gray-600">
              <span className={`h-2 w-2 rounded-full bg-red-500 ${isPaused ? '' : 'animate-pulse'}`} />
              {isPaused ? 'Paused' : 'Recording...'} {formattedElapsed}
            </div>
            <button onClick={cancelRecording} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button onClick={stopRecording} className="p-2 rounded-xl bg-brand text-white hover:bg-brand/80 transition-colors flex-shrink-0">
              <Square className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowEmojiPicker(prev => !prev)}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <Smile className="h-4 w-4" />
            </button>
            <input
              ref={textInputRef}
              className="flex-grow text-sm text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
              placeholder="Say hi to everyone..."
              value={messageInput}
              onChange={handleChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              maxLength={100}
            />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            {messageInput.trim() ? (
              <button
                onClick={handleSend}
                className="p-2 rounded-xl bg-brand text-white hover:bg-brand/80 transition-colors flex-shrink-0"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
