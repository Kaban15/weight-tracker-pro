"use client";

import { useState } from "react";
import {
  Sparkles,
  ListChecks,
  Scale,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";

interface WelcomeModalProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Sparkles,
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
    title: "Witaj w Weight Tracker Pro!",
    description: "Twoja aplikacja do zarządzania zdrowiem, celami i codziennymi zadaniami. Poznaj główne funkcje w kilka sekund.",
  },
  {
    icon: ListChecks,
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-400",
    title: "Lista Zadań",
    description: "Zarządzaj zadaniami z priorytetami, terminami i kategoriami. Filtruj, sortuj i śledź postępy w realizacji.",
  },
  {
    icon: Scale,
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    title: "Progress Tracker",
    description: "Śledź swoją wagę, ustalaj cele i monitoruj postępy na wykresach. Kalendarz pomoże Ci być konsekwentnym.",
  },
  {
    icon: Target,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    secondIcon: Calendar,
    secondIconBg: "bg-violet-500/20",
    secondIconColor: "text-violet-400",
    title: "Nawyki & Planer",
    description: "Twórz codzienne nawyki (pompki, burpees) i planuj zadania na każdy dzień tygodnia.",
  },
];

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const SecondIcon = slide.secondIcon;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border-2 border-slate-700 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header with skip button */}
        <div className="flex justify-end p-3">
          <button
            onClick={handleSkip}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Pomiń wprowadzenie"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 text-center">
          {/* Icon(s) */}
          <div className="flex justify-center gap-3 mb-6">
            <div className={`w-20 h-20 ${slide.iconBg} rounded-2xl flex items-center justify-center`}>
              <Icon className={`w-10 h-10 ${slide.iconColor}`} />
            </div>
            {SecondIcon && (
              <div className={`w-20 h-20 ${slide.secondIconBg} rounded-2xl flex items-center justify-center`}>
                <SecondIcon className={`w-10 h-10 ${slide.secondIconColor}`} />
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {slide.title}
          </h2>

          {/* Description */}
          <p className="text-slate-400 leading-relaxed mb-8">
            {slide.description}
          </p>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentSlide
                    ? "bg-violet-500 w-6"
                    : "bg-slate-600 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Wstecz
              </button>
            )}
            <button
              onClick={handleNext}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-colors font-semibold ${
                isLastSlide
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
            >
              {isLastSlide ? "Zaczynamy!" : "Dalej"}
              {!isLastSlide && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
