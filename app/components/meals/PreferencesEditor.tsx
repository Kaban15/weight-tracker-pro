"use client";

import { useState } from 'react';
import { ArrowLeft, Plus, X, MessageSquare, Check } from 'lucide-react';
import { MealPreferences } from './types';

interface PreferencesEditorProps {
  preferences: MealPreferences;
  onSave: (updates: Partial<MealPreferences>) => void;
  onStartInterview: () => void;
  onBack: () => void;
}

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-200 rounded-lg text-xs">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))} className="text-slate-400 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder="Wpisz i naciśnij Enter..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500" />
        <button onClick={addTag} disabled={!input.trim()}
          className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white disabled:opacity-30">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function PreferencesEditor({ preferences, onSave, onStartInterview, onBack }: PreferencesEditorProps) {
  const [allergies, setAllergies] = useState<string[]>(preferences.allergies || []);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>(preferences.disliked_foods || []);
  const [likedFoods, setLikedFoods] = useState<string[]>(preferences.liked_foods || []);
  const [cuisines, setCuisines] = useState<string[]>(preferences.cuisines || []);
  const [hasThermomix, setHasThermomix] = useState(preferences.has_thermomix || false);
  const [preferencesText, setPreferencesText] = useState(preferences.preferences_text || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({
      allergies,
      disliked_foods: dislikedFoods,
      liked_foods: likedFoods,
      cuisines,
      has_thermomix: hasThermomix,
      preferences_text: preferencesText,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </button>
      </div>

      <h2 className="text-xl font-semibold text-white">Preferencje kulinarne</h2>

      <TagInput label="Alergie / nietolerancje" tags={allergies} onChange={setAllergies} />
      <TagInput label="Nie lubię / unikam" tags={dislikedFoods} onChange={setDislikedFoods} />
      <TagInput label="Lubię / preferuję" tags={likedFoods} onChange={setLikedFoods} />
      <TagInput label="Ulubione kuchnie" tags={cuisines} onChange={setCuisines} />

      {/* Thermomix toggle */}
      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div>
          <p className="text-white font-medium">Thermomix</p>
          <p className="text-xs text-slate-400">AI zaproponuje przepisy z Thermomixem gdzie to sensowne</p>
        </div>
        <button onClick={() => setHasThermomix(!hasThermomix)}
          className={`w-12 h-6 rounded-full transition-colors relative ${hasThermomix ? 'bg-violet-600' : 'bg-slate-600'}`}>
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${hasThermomix ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Additional notes */}
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">Dodatkowe uwagi</label>
        <textarea value={preferencesText} onChange={e => setPreferencesText(e.target.value)}
          rows={3} placeholder="Np. 'Gotuję max 30 min', 'Preferuję proste przepisy'..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 resize-none" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors">
          {saved ? <><Check className="w-4 h-4" /> Zapisano!</> : 'Zapisz zmiany'}
        </button>
        <button onClick={onStartInterview}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors">
          <MessageSquare className="w-4 h-4" /> Wywiad AI
        </button>
      </div>
    </div>
  );
}
