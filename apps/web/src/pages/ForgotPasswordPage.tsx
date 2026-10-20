import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { Logo } from '../components/Logo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const data: any = await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center p-6 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4 hover:opacity-95 transition">
            <Logo size="xl" />
          </Link>
          <h1 className="text-xl font-bold text-slate-200">Reset your password</h1>
          <p className="text-xs text-slate-400 mt-1">
            We will dispatch instructions to your email
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Check your email</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If an account matches <strong className="text-slate-200">{email}</strong>, a recovery link has been dispatched.
              </p>
              {resetToken && (
                <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-left">
                  <div className="font-semibold text-violet-300 mb-1">Local Demo Token:</div>
                  <code className="text-[11px] text-slate-300 break-all">{resetToken}</code>
                </div>
              )}
              <Link
                to="/signin"
                className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:underline pt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-indigo-500"
              >
                Send Reset Link
              </button>

              <div className="pt-4 text-center">
                <Link
                  to="/signin"
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel and return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
