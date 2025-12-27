"use client";

import { X, Keyboard } from "lucide-react";
import { SHORTCUTS } from "@/lib/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutDisplay {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutDisplay[] = [
  { keys: ["N"], description: SHORTCUTS.ADD_ENTRY.description },
  { keys: ["T"], description: SHORTCUTS.TODAY.description },
  { keys: ["1"], description: SHORTCUTS.VIEW_CALENDAR.description },
  { keys: ["2"], description: SHORTCUTS.VIEW_STATS.description },
  { keys: ["3"], description: SHORTCUTS.VIEW_TABLE.description },
  { keys: ["4"], description: SHORTCUTS.VIEW_CHART.description },
  { keys: ["Alt", "←"], description: SHORTCUTS.PREV_MONTH.description },
  { keys: ["Alt", "→"], description: SHORTCUTS.NEXT_MONTH.description },
  { keys: ["Shift", "?"], description: SHORTCUTS.HELP.description },
  { keys: ["Esc"], description: SHORTCUTS.CLOSE.description },
];

const calendarShortcuts: ShortcutDisplay[] = [
  { keys: ["←", "→", "↑", "↓"], description: "Nawigacja po dniach" },
  { keys: ["Enter"], description: "Otwórz wybrany dzień" },
  { keys: ["Space"], description: "Dodaj wpis dla wybranego dnia" },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-slate-700 border border-slate-600 rounded text-xs font-mono text-slate-300">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border-2 border-emerald-500/20 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" className="text-xl font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            Skróty klawiszowe
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Zamknij"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Global shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Ogólne
            </h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-slate-300">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex} className="flex items-center gap-1">
                        <KeyBadge>{key}</KeyBadge>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="text-slate-500">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Kalendarz
            </h3>
            <div className="space-y-2">
              {calendarShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-slate-300">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex} className="flex items-center gap-1">
                        <KeyBadge>{key}</KeyBadge>
                        {keyIndex < shortcut.keys.length - 1 && shortcut.keys.length <= 2 && (
                          <span className="text-slate-500">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-slate-500 text-sm text-center">
            Naciśnij <KeyBadge>Esc</KeyBadge> aby zamknąć
          </p>
        </div>
      </div>
    </div>
  );
}
