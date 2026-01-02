"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Target, Mail, Lock, LogIn, UserPlus, Check, X, KeyRound, ArrowLeft } from 'lucide-react';

// Password validation rules
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

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();
  const isLogin = mode === 'login';
  const isForgotPassword = mode === 'forgot-password';

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Client-side password validation for signup
    if (mode === 'signup' && !passwordValidation.isValid) {
      setError('Hasło nie spełnia wymagań bezpieczeństwa.');
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          if (error.message.includes('rate limit')) {
            setError('Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.');
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Link do resetowania hasła został wysłany na podany adres email.');
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          // Translate common login errors
          if (error.message.includes('Invalid login')) {
            setError('Nieprawidłowy email lub hasło.');
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          // Translate common Supabase errors
          if (error.message.includes('rate limit')) {
            setError('Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.');
          } else if (error.message.includes('already registered')) {
            setError('Ten email jest już zarejestrowany. Spróbuj się zalogować.');
          } else if (error.message.includes('valid email')) {
            setError('Podaj prawidłowy adres email.');
          } else if (error.message.includes('password')) {
            setError('Hasło nie spełnia wymagań bezpieczeństwa.');
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Sprawdź swoją skrzynkę email! Link aktywacyjny został wysłany.');
        }
      }
    } catch {
      setError('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border-2 border-emerald-500/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Weight Tracker Pro</h1>
          <p className="text-slate-400">
            {isForgotPassword
              ? 'Zresetuj swoje hasło'
              : isLogin
                ? 'Sign in to your account'
                : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="flex items-center gap-2 text-slate-300 mb-2 font-semibold">
                <Lock className="w-4 h-4" />
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => mode === 'signup' && setShowPasswordRules(true)}
                onBlur={() => setShowPasswordRules(false)}
                placeholder="••••••••"
                required
                minLength={PASSWORD_RULES.minLength}
                className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 outline-none transition-colors ${
                  mode === 'signup' && password && !passwordValidation.isValid
                    ? 'border-amber-500 focus:border-amber-500'
                    : 'border-slate-700 focus:border-emerald-500'
                }`}
              />

              {/* Password requirements - only show during signup */}
              {mode === 'signup' && (showPasswordRules || (password && !passwordValidation.isValid)) && (
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
          )}

          {error && (
            <div className="bg-red-500/10 border-2 border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isForgotPassword ? (
              <>
                <KeyRound className="w-5 h-5" />
                Wyślij link resetujący
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {isForgotPassword ? (
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć do logowania
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setMode(isLogin ? 'signup' : 'login');
                  setError('');
                  setMessage('');
                }}
                className="text-slate-400 hover:text-emerald-400 transition-colors block mx-auto"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
              {isLogin && (
                <button
                  onClick={() => {
                    setMode('forgot-password');
                    setError('');
                    setMessage('');
                  }}
                  className="text-slate-500 hover:text-emerald-400 transition-colors text-sm block mx-auto"
                >
                  Zapomniałeś hasła?
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
