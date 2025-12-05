import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../utils/constants';

interface ChatUIProps {
  messages: ChatMessage[];
}

export function ChatUI({ messages }: ChatUIProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-2 text-4xl">✨</div>
          <p className="text-gray-400">Start a conversation with Navi</p>
          <p className="mt-1 text-sm text-gray-500">
            Hold the mic button to talk, or type a message
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm backdrop-blur-sm ${!isUser
          ? 'bg-linear-to-br from-cyan-500 to-blue-600 text-white'
          : 'bg-white/10 text-gray-100'
          }`}
      >
        <p className="text-[17px] leading-relaxed whitespace-pre-wrap font-medium tracking-wide">
          {message.text}
        </p>
      </div>
    </div>
  );
}
