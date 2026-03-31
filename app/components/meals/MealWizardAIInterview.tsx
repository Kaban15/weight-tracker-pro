"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Check } from 'lucide-react';
import { useMealAI } from './useMealAI';
import { AIInterviewResponse, MealPreferences } from './types';

interface MealWizardAIInterviewProps {
  onComplete: (preferences: Partial<MealPreferences>) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function MealWizardAIInterview({ onComplete }: MealWizardAIInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [extractedPrefs, setExtractedPrefs] = useState<AIInterviewResponse['extracted_preferences'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isLoading, error } = useMealAI({
    preferences: null,
    recentMeals: [],
    pantryItems: [],
    usePantryMode: false,
  });

  // Start interview on mount
  useEffect(() => {
    async function startInterview() {
      const response = await sendMessage(
        [{ role: 'user', content: 'Cześć, chcę skonfigurować swoje preferencje kulinarne.' }],
        'interview'
      ) as AIInterviewResponse | null;

      if (response) {
        setMessages([
          { role: 'assistant', content: response.message },
        ]);
      }
    }
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
    const response = await sendMessage(apiMessages, 'interview') as AIInterviewResponse | null;

    if (response) {
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);

      if (response.is_complete && response.extracted_preferences) {
        setIsComplete(true);
        setExtractedPrefs(response.extracted_preferences);
      }
    }
  };

  const handleFinish = () => {
    if (!extractedPrefs) return;
    onComplete({
      allergies: extractedPrefs.allergies || [],
      disliked_foods: extractedPrefs.disliked_foods || [],
      liked_foods: extractedPrefs.liked_foods || [],
      cuisines: extractedPrefs.cuisines || [],
      preferences_text: extractedPrefs.notes || '',
      onboarding_completed: true,
    });
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[70vh]">
      <h2 className="text-xl font-semibold text-white mb-2">Wywiad kulinarny</h2>
      <p className="text-slate-400 text-sm mb-4">AI pozna Twoje preferencje, żeby lepiej dobierać posiłki.</p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-md'
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input or Finish */}
      {isComplete ? (
        <button onClick={handleFinish}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors">
          <Check className="w-5 h-5" /> Zapisz preferencje i przejdź do planowania
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Napisz odpowiedź..."
            disabled={isLoading}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-slate-500 disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()}
            className="p-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white disabled:opacity-30 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
