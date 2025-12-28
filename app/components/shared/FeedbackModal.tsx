"use client";

import { useState } from "react";
import { X, Send, Bug, Lightbulb, Sparkles, HelpCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackCategory = "bug" | "feature" | "improvement" | "other";

const CATEGORIES: { id: FeedbackCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "bug", label: "Bug / Błąd", icon: <Bug className="w-5 h-5" />, color: "red" },
  { id: "feature", label: "Nowa funkcja", icon: <Lightbulb className="w-5 h-5" />, color: "amber" },
  { id: "improvement", label: "Ulepszenie", icon: <Sparkles className="w-5 h-5" />, color: "emerald" },
  { id: "other", label: "Inne", icon: <HelpCircle className="w-5 h-5" />, color: "slate" },
];

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!category) {
      setError("Wybierz kategorię");
      return;
    }
    if (!message.trim()) {
      setError("Wpisz wiadomość");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: user?.email,
          category,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Błąd podczas wysyłania");
      }

      setSent(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch {
      setError("Nie udało się wysłać feedbacku. Spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setCategory(null);
    setMessage("");
    setSent(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Prześlij opinię</h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Dziękuję!</h4>
            <p className="text-slate-400">Twoja opinia została wysłana.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Category Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Kategoria *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      setError(null);
                    }}
                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      category === cat.id
                        ? cat.color === "red"
                          ? "bg-red-600 text-white"
                          : cat.color === "amber"
                          ? "bg-amber-600 text-white"
                          : cat.color === "emerald"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Twoja opinia *
              </label>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError(null);
                }}
                placeholder="Opisz swój pomysł, problem lub sugestię..."
                rows={5}
                className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Error */}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wysyłam...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Wyślij
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
