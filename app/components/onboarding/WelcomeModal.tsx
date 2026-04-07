"use client";

import { useState } from "react";
import {
  Sparkles,
  ListChecks,
  Scale,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Modal from "../shared/Modal";

interface WelcomeModalProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Sparkles,
    iconBg: "bg-[var(--accent)]/20",
    iconColor: "text-[var(--accent)]",
    title: "Witaj w Weight Tracker Pro!",
    description: "Twoja aplikacja do zarządzania zdrowiem, celami i codziennymi zadaniami. Poznaj główne funkcje w kilka sekund.",
  },
  {
    icon: ListChecks,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    title: "Lista Zadań",
    description: "Zarządzaj zadaniami z priorytetami, terminami i kategoriami. Filtruj, sortuj i śledź postępy w realizacji.",
  },
  {
    icon: Scale,
    iconBg: "bg-[var(--accent)]/20",
    iconColor: "text-[var(--accent)]",
    title: "Progress Tracker",
    description: "Śledź swoją wagę, ustalaj cele i monitoruj postępy na wykresach. Kalendarz pomoże Ci być konsekwentnym.",
  },
  {
    icon: Target,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    title: "Nawyki",
    description: "Twórz codzienne nawyki jak pompki czy burpees i odhaczaj je każdego dnia.",
  },
];

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide]!;
  const Icon = slide.icon;

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

  return (
    <Modal
      isOpen={true}
      onClose={onComplete}
      title={undefined}
      size="max-w-md"
      showClose={false}
      className="!p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
    >
      {/* Skip button */}
      <div className="flex justify-end p-3 border-b border-[var(--card-border)]">
        <button
          onClick={onComplete}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)] rounded-lg px-3 py-1.5 transition-colors"
          title="Pomiń wprowadzenie"
        >
          Pomiń
        </button>
      </div>

      {/* Content */}
      <div className="px-8 py-6 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 ${slide.iconBg} rounded-2xl flex items-center justify-center`}>
            <Icon className={`w-10 h-10 ${slide.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          {slide.title}
        </h2>

        {/* Description */}
        <p className="text-[var(--muted)] leading-relaxed mb-8">
          {slide.description}
        </p>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === currentSlide
                  ? "w-6 bg-[var(--accent)]"
                  : "w-2.5 bg-[var(--card-border)] hover:bg-[var(--muted)]"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentSlide > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Wstecz
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-colors font-semibold ${
              isLastSlide
                ? "text-white"
                : "bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)]"
            }`}
            style={isLastSlide ? { background: 'var(--accent)' } : undefined}
          >
            {isLastSlide ? "Zaczynamy!" : "Dalej"}
            {!isLastSlide && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
