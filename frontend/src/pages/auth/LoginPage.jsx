/**
 * LoginPage — POST /auth/login
 * Supports DONOR | ORG_ADMIN | VOLUNTEER | ADMIN
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { extractErrorMessage } from '../../utils/formatters';
import { getDashboardPath } from '../../utils/roleRouter';
import Alert from '../../components/common/Alert';
import Spinner from '../../components/common/Spinner';
import ThemeToggle from '../../components/common/ThemeToggle';
import { Leaf } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(from ?? getDashboardPath(user.role), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

const DEMO_ACCOUNTS = [
  { role: 'Donor', email: 'donor@frp.dev', pass: 'Donor1234!' },
  { role: 'Org Admin', email: 'org@frp.dev', pass: 'OrgAd1234!' },
  { role: 'Volunteer', email: 'volunteer@frp.dev', pass: 'Volun1234!' },
  { role: 'Admin', email: 'admin@frp.dev', pass: 'Admin1234!' },
];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100/90 dark:bg-[#090d16] relative overflow-hidden transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-600/10 dark:bg-teal-950/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-emerald-800 mb-3 shadow-md shadow-emerald-900/20">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-slate-50 tracking-tight">Food Rescue Platform</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Operations, Dispatch & Rescue Network</p>
        </div>

        {/* Card */}
        <div className="card shadow-modal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 sm:p-8">
          {/* Quick Demo Switcher */}
          <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/80 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all text-left truncate flex items-center justify-between"
                >
                  <span>{acc.role}</span>
                  <span className="text-[10px] text-slate-400 opacity-60">fill</span>
                </button>
              ))}
            </div>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}

          <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="form-label text-xs font-semibold">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input text-xs sm:text-sm py-2.5"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="form-label text-xs font-semibold">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input text-xs sm:text-sm py-2.5"
                placeholder="••••••••"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2 text-sm font-bold tracking-wide"
            >
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Signing in…' : 'Sign in to Console'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
