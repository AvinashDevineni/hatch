'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';

interface Message {
  type: string;
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  isConnected: boolean;
}

export function ChatPanel({ messages, onSendMessage, isGenerating, isConnected }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b1a33]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#142646] border-b border-[#1f3557]">
        <div className="flex items-center space-x-2 text-[#dbe9ff]">
          <MessageSquare className="w-4 h-4 text-[#f2c94c]" />
          <span className="text-sm font-medium">Founder Console</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8ba4c7]">
          <span>{isConnected ? 'Live' : 'Offline'}</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3 custom-scroll">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`text-sm whitespace-pre-wrap ${
              msg.type === 'error'
                ? 'text-[#ff9f9f]'
                : msg.type === 'system'
                  ? 'text-[#8ba4c7]'
                  : 'text-[#e5ecff]'
            }`}
          >
            <span className="font-mono text-xs text-[#6f87ab]">
              {msg.timestamp.toLocaleTimeString()}
            </span>
            <div className="mt-1 leading-relaxed">{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[#1f3557] bg-[#11203d]">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for improvements, new features, or fixes..."
            disabled={isGenerating || !isConnected}
            className="flex-1 px-3 py-2 bg-[#0b1a33] text-[#dbe9ff] rounded-lg border border-[#1f3557] focus:outline-none focus:ring-2 focus:ring-[#f2c94c] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isGenerating || !isConnected || !input.trim()}
            className="px-4 py-2 bg-[#f2c94c] text-[#0b1a33] font-semibold rounded-lg hover:shadow-lg disabled:bg-[#2b3f63] disabled:text-[#8ba4c7] flex items-center space-x-2 transition"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
