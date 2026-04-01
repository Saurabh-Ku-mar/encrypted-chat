cat > components/MessageList.tsx << 'EOF'
'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';

interface MessageListProps {
  messages: Message[];
  currentUserName: string;
  isDecrypting: boolean;
}

export default function MessageList({
  messages,
  currentUserName,
  isDecrypting,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {isDecrypting && messages.length > 0 && (
        <div className="text-center text-gray-500 text-sm py-2">
          Decrypting messages...
        </div>
      )}
      
      {messages.map((message) => {
        const isOwn = message.sender_name === currentUserName;
        const decrypted = message.decrypted;
        
        return (
          <div
            key={message.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {!isOwn && (
                <div className="text-xs text-gray-400 mb-1 font-medium">
                  {message.sender_name}
                </div>
              )}
              <div className="break-words whitespace-pre-wrap">
                {decrypted || (
                  <span className="opacity-50">
                    {decrypted === undefined ? 'Decrypting...' : '❌ Failed to decrypt'}
                  </span>
                )}
              </div>
              <div
                className={`text-xs mt-1 ${
                  isOwn ? 'text-blue-200' : 'text-gray-400'
                }`}
              >
                {formatTime(message.created_at)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
EOF