import { describe, it, expect } from 'vitest';
import { calculateBMR, calculateTDEE, calculateTargetCalories } from '@/lib/tdee';

describe('calculateBMR', () => {
  it('calculates BMR for male', () => {
    // Male, 80kg, 180cm, 30 years
    // 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
    expect(calculateBMR(80, 180, 30, 'male')).toBe(1780);
  });

  it('calculates BMR for female', () => {
    // Female, 65kg, 165cm, 28 years
    // 10*65 + 6.25*165 - 5*28 - 161 = 650+1031.25-140-161 = 1380.25
    expect(calculateBMR(65, 165, 28, 'female')).toBe(1380.25);
  });
});

describe('calculateTDEE', () => {
  it('applies activity multiplier', () => {
    // BMR 1780, sedentary (1.2)
    expect(calculateTDEE(1780, 1.2)).toBe(2136);
  });

  it('applies high activity multiplier', () => {
    // BMR 1780, very active (1.725)
    expect(calculateTDEE(1780, 1.725)).toBe(3070.5);
  });
});

describe('calculateTargetCalories', () => {
  it('calculates deficit for weight loss', () => {
    expect(calculateTargetCalories(2136, -500)).toBe(1636);
  });

  it('calculates surplus for weight gain', () => {
    expect(calculateTargetCalories(2136, 300)).toBe(2436);
  });

  it('returns TDEE for maintenance', () => {
    expect(calculateTargetCalories(2136, 0)).toBe(2136);
  });

  it('clamps minimum to 1200', () => {
    expect(calculateTargetCalories(1500, -500)).toBe(1200);
  });
});
