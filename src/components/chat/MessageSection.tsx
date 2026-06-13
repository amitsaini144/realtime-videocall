import { MessageSquare } from 'lucide-react';
import { User, ChatMessage } from "@/types";

interface MessageSectionProps {
  receivedMessages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  currentUser: User;
}

export default function MessageSection({ receivedMessages, messagesEndRef, currentUser }: Readonly<MessageSectionProps>) {
  return (
    <div className="flex flex-col flex-grow min-h-0">
      <div className="flex-grow overflow-y-auto bg-white rounded-2xl p-4 scrollbar-thin">
        {receivedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">No messages yet. Say hello!</p>
          </div>
        ) : (
          receivedMessages.map((message) => {
            const isCurrentUser = message.sender === currentUser.username;
            return (
              <div key={message.id} className={`mb-3 flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isCurrentUser && (
                  <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <span className="text-brand text-xs font-bold">
                      {message.sender.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isCurrentUser && (
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5 ml-1">{message.sender}</p>
                  )}
                  <div className={`rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    isCurrentUser
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
