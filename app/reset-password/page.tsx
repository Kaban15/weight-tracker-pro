"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Target, Lock, KeyRound, Check, X } from 'lucide-react';

const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= PASSWORD_RULES.minLength;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return {
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
  };
}

function PasswordRule({ passed, text }: { passed: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${passed ? 'text-emerald-400' : 'text-slate-500'}`}>
      {passed ? (
        <Check className="w-3 h-3" aria-hidden="true" />
      ) : (
        <X className="w-3 h-3" aria-hidden="true" />
      )}
      {text}
    </li>
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const { updatePassword, session } = useAuth();
  const router = useRouter();

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  useEffect(() => {
    if (!session) {
      const timer = setTimeout(() => {
        if (!session) {
          setError('Link do resetowania hasła wygasł lub jest nieprawidłowy. Spróbuj ponownie.');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordValidation.isValid) {
      setError('Hasło nie spełnia wymagań bezpieczeństwa.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        if (error.message.includes('same as')) {
          setError('Nowe hasło musi być inne niż poprzednie.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch {
      setError('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-emerald-500/20 text-center">
          <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Hasło zmienione!</h1>
          <p className="text-slate-400">Za chwilę zostaniesz przekierowany...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-emerald-500/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Weight Tracker Pro</h1>
          <p className="text-slate-400">Ustaw nowe hasło</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <Lock className="w-4 h-4" />
              Nowe hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordRules(true)}
              onBlur={() => setShowPasswordRules(false)}
              placeholder="••••••••"
              required
              minLength={PASSWORD_RULES.minLength}
              className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 outline-none transition-colors ${
                password && !passwordValidation.isValid
                  ? 'border-amber-500 focus:border-amber-500'
                  : 'border-slate-700 focus:border-emerald-500'
              }`}
            />

            {(showPasswordRules || (password && !passwordValidation.isValid)) && (
              <div className="mt-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Wymagania hasła:</p>
                <ul className="space-y-1">
                  <PasswordRule
                    passed={passwordValidation.hasMinLength}
                    text={`Minimum ${PASSWORD_RULES.minLength} znaków`}
                  />
                  <PasswordRule
                    passed={passwordValidation.hasUppercase}
                    text="Wielka litera (A-Z)"
                  />
                  <PasswordRule
                    passed={passwordValidation.hasLowercase}
                    text="Mała litera (a-z)"
                  />
                  <PasswordRule
                    passed={passwordValidation.hasNumber}
                    text="Cyfra (0-9)"
                  />
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <Lock className="w-4 h-4" />
              Potwierdź hasło
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={PASSWORD_RULES.minLength}
              className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 outline-none transition-colors ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-700 focus:border-emerald-500'
              }`}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Hasła nie są identyczne</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border-2 border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !session}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                Zmień hasło
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
