"use client";

import { useState } from "react";
import { X, Search, ChevronRight } from "lucide-react";
import {
  ChallengeTemplate,
  ChallengeCategory,
  CHALLENGE_TEMPLATES,
  CATEGORY_INFO,
  getAllCategories,
  getTemplatesByCategory,
} from "./challengeTemplates";

interface ChallengeTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ChallengeTemplate) => void;
}

export default function ChallengeTemplatesModal({
  isOpen,
  onClose,
  onSelect,
}: ChallengeTemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const categories = getAllCategories();

  const filteredTemplates = (selectedCategory === "all"
    ? CHALLENGE_TEMPLATES
    : getTemplatesByCategory(selectedCategory)
  ).filter(t =>
    searchQuery === "" ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (template: ChallengeTemplate) => {
    onSelect(template);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border-2 border-amber-500/20">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Wybierz szablon wyzwania</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj wyzwania..."
              className="w-full bg-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 border-2 border-slate-700 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Wszystkie
            </button>
            {categories.map((cat) => {
              const info = CATEGORY_INFO[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-amber-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nie znaleziono wyzwań
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredTemplates.map((template) => {
                const catInfo = CATEGORY_INFO[template.category];
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{template.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                            {template.name}
                          </h3>
                          <span className={`text-xs ${catInfo.color}`}>
                            {catInfo.emoji} {catInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{template.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {template.trackReps && template.defaultGoal && (
                            <span>
                              Cel: {template.defaultGoal} {template.goalUnit}
                            </span>
                          )}
                          <span>{template.suggestedDuration} dni</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            {filteredTemplates.length} {filteredTemplates.length === 1 ? "wyzwanie" : "wyzwań"} do wyboru
          </p>
        </div>
      </div>
    </div>
  );
}
