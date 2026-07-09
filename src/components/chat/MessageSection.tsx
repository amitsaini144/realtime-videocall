'use client'

import { useState } from 'react';
import Image from 'next/image';
import { MessageSquare, SmilePlus, Reply, Pencil, Trash2 } from 'lucide-react';
import { User, ChatMessage } from "@/types";
import { renderRichText, messageMentionsUser } from '@/lib/richText';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import ReactionPicker from './ReactionPicker';

interface MessageSectionProps {
  receivedMessages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  currentUser: User;
  typingUsers: Set<string>;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
}

function TypingIndicator({ typingUsers }: Readonly<{ typingUsers: Set<string> }>) {
  const names = Array.from(typingUsers);
  if (names.length === 0) return null;

  const label = names.length === 1 ? `${names[0]} is typing` : 'Several people are typing';

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 italic">
      <span>{label}</span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1 w-1 rounded-full bg-gray-400 animate-bounce" />
      </span>
    </div>
  );
}

function DeletedBubble({ isOwn }: Readonly<{ isOwn: boolean }>) {
  return (
    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm italic text-gray-400 border border-dashed border-gray-200 ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
      This message was deleted
    </div>
  );
}

interface BubbleContentProps {
  message: ChatMessage;
  currentUsername: string | null;
  isMentioned: boolean;
}

function BubbleContent({ message, currentUsername, isMentioned }: Readonly<BubbleContentProps>) {
  const bubbleClass = message.isOwn
    ? 'bg-brand text-white rounded-br-sm'
    : `bg-gray-100 text-gray-800 rounded-bl-sm${isMentioned ? ' ring-2 ring-yellow-400' : ''}`;

  return (
    <div className={`rounded-2xl px-4 py-2 text-sm leading-relaxed ${bubbleClass}`}>
      {message.replyTo && (
        <div className={`mb-1.5 pl-2 border-l-2 text-xs opacity-80 ${message.isOwn ? 'border-white/50' : 'border-brand/40'}`}>
          <p className="font-semibold">{message.replyTo.sender}</p>
          <p className="truncate max-w-[180px]">{message.replyTo.preview}</p>
        </div>
      )}
      {message.kind === 'text' && message.content && (
        <span>{renderRichText(message.content, currentUsername)}</span>
      )}
      {message.kind === 'image' && message.mediaData && (
        <a href={message.mediaData} target="_blank" rel="noopener noreferrer">
          <Image
            src={message.mediaData}
            alt="Shared attachment"
            width={220}
            height={220}
            unoptimized
            className="rounded-xl max-w-full h-auto object-cover"
          />
        </a>
      )}
      {message.kind === 'voice' && message.mediaData && (
        <VoiceMessagePlayer src={message.mediaData} durationSec={message.durationSec} isOwn={message.isOwn} />
      )}
      {message.edited && (
        <span className={`ml-1 text-[10px] italic ${message.isOwn ? 'text-white/70' : 'text-gray-400'}`}>(edited)</span>
      )}
    </div>
  );
}

interface BubbleActionsProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onToggleReactionPicker: () => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
}

function BubbleActions({ message, onReply, onToggleReactionPicker, onEdit, onDelete }: Readonly<BubbleActionsProps>) {
  return (
    <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
      message.isOwn ? '-left-24' : '-right-24'
    }`}>
      <button
        onClick={() => onReply(message)}
        className="p-1 rounded-full bg-white shadow border border-gray-100 text-gray-400 hover:text-gray-600"
      >
        <Reply className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggleReactionPicker}
        className="p-1 rounded-full bg-white shadow border border-gray-100 text-gray-400 hover:text-gray-600"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>
      {message.isOwn && message.kind === 'text' && (
        <>
          <button
            onClick={() => onEdit(message)}
            className="p-1 rounded-full bg-white shadow border border-gray-100 text-gray-400 hover:text-gray-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(message.id)}
            className="p-1 rounded-full bg-white shadow border border-gray-100 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

interface BubbleReactionsProps {
  message: ChatMessage;
  reactionEntries: [string, string[]][];
  onReact: (messageId: string, emoji: string) => void;
}

function BubbleReactions({ message, reactionEntries, onReact }: Readonly<BubbleReactionsProps>) {
  if (reactionEntries.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
      {reactionEntries.map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact(message.id, emoji)}
          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-0.5 transition-colors"
        >
          <span>{emoji}</span>
          <span className="text-gray-500">{users.length}</span>
        </button>
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  currentUsername: string | null;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void;
}

function MessageBubble({ message, currentUsername, onReact, onReply, onEdit, onDelete }: Readonly<MessageBubbleProps>) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0);
  const isMentioned = !message.isOwn && messageMentionsUser(message.content, currentUsername);

  if (message.deleted) {
    return (
      <div className={`mb-3 flex items-end gap-2 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
        {!message.isOwn && <div className="w-7 h-7 flex-shrink-0" />}
        <DeletedBubble isOwn={message.isOwn} />
      </div>
    );
  }

  return (
    <div className={`mb-3 flex items-end gap-2 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
      {!message.isOwn && (
        <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mb-0.5 overflow-hidden">
          {message.senderImageUrl ? (
            <Image src={message.senderImageUrl} alt={message.sender} width={28} height={28} className="object-cover" />
          ) : (
            <span className="text-brand text-xs font-bold">
              {message.sender?.charAt(0).toUpperCase() ?? '?'}
            </span>
          )}
        </div>
      )}
      <div className={`max-w-[70%] flex flex-col ${message.isOwn ? 'items-end' : 'items-start'}`}>
        {!message.isOwn && (
          <p className="text-[10px] text-gray-400 font-medium mb-0.5 ml-1">{message.sender ?? 'Unknown'}</p>
        )}
        <div className="relative group">
          <BubbleContent message={message} currentUsername={currentUsername} isMentioned={isMentioned} />
          <BubbleActions
            message={message}
            onReply={onReply}
            onToggleReactionPicker={() => setShowReactionPicker(prev => !prev)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {showReactionPicker && (
            <ReactionPicker
              align={message.isOwn ? 'right' : 'left'}
              onSelect={(emoji) => {
                onReact(message.id, emoji);
                setShowReactionPicker(false);
              }}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>
        <BubbleReactions message={message} reactionEntries={reactionEntries} onReact={onReact} />
      </div>
    </div>
  );
}

export default function MessageSection({ receivedMessages, messagesEndRef, currentUser, typingUsers, onReact, onReply, onEdit, onDelete }: Readonly<MessageSectionProps>) {
  return (
    <div className="flex flex-col flex-grow min-h-0">
      <div className="flex-grow overflow-y-auto bg-white rounded-2xl p-4 scrollbar-thin">
        {receivedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">No messages yet. Say hello!</p>
          </div>
        ) : (
          receivedMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUsername={currentUser.username}
              onReact={onReact}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
