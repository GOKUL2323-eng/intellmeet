import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Logo } from '../components/Logo';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, error, clearError } = useAuthStore();

  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    let slowTimer: NodeJS.Timeout | undefined;
    try {
      setIsLoading(true);
      slowTimer = setTimeout(() => setIsSlow(true), 3000);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
      setIsSlow(false);
      setIsLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('alex.chen@intellmeet.com');
    setPassword('Password123!');
    setLocalError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4 hover:opacity-95 transition">
            <Logo size="xl" />
          </Link>
          <h1 className="text-xl font-bold text-slate-200">Welcome back</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to your enterprise collaboration portal</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          {/* Quick Demo Fill Button */}
          <button
            type="button"
            onClick={fillDemoAccount}
            className="w-full mb-6 py-2.5 px-4 rounded-xl bg-violet-950/50 hover:bg-violet-900/50 border border-violet-500/40 text-violet-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Fill Seeded Demo Credentials (Alex Chen)</span>
          </button>

          {(localError || error) && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{localError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-violet-400 hover:text-violet-300 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <span>{isSlow ? 'Waking up cloud server...' : 'Signing in...'}</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {isSlow && (
              <p className="text-[11px] text-amber-300/80 text-center mt-2 animate-pulse">
                Waking up IntellMeet cloud server (idle free-tier services take ~25s). Hang tight!
              </p>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-violet-400 font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
