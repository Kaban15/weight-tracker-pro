"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { ChatMessage } from './types';

interface MealChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function MealChat({ messages, onSend, isLoading, error }: MealChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
      <div className="p-3 border-b border-[var(--card-border)]">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Czat z AI</h3>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--muted)] text-center py-4">
            Napisz co chcesz zjeść, poproś o propozycje lub zamień posiłek.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-[var(--surface)] text-[var(--foreground)] rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface)] rounded-xl rounded-bl-sm px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--card-border)] flex gap-2">
        <input ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Np. 'Co na obiad z kurczakiem?' lub 'Zamień na coś wegetariańskiego'"
          disabled={isLoading}
          className="flex-1 bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] disabled:opacity-50" />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}
          className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white disabled:opacity-30 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
