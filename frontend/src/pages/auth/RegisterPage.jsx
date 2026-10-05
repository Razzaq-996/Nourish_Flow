/**
 * RegisterPage — POST /auth/register
 * Allowed roles: DONOR | ORG_ADMIN | VOLUNTEER  (ADMIN cannot self-register)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import { USER_ROLES } from '../../utils/constants';
import { extractErrorMessage } from '../../utils/formatters';
import Alert from '../../components/common/Alert';
import Spinner from '../../components/common/Spinner';
import ThemeToggle from '../../components/common/ThemeToggle';
import { Leaf } from 'lucide-react';

const PUBLIC_ROLES = [USER_ROLES.DONOR, USER_ROLES.ORG_ADMIN, USER_ROLES.VOLUNTEER];

const ROLE_LABELS = {
  [USER_ROLES.DONOR]:     'Food Donor (Restaurant, Grocery, Individual)',
  [USER_ROLES.ORG_ADMIN]: 'Organization Admin (Shelter, Food Bank, NGO)',
  [USER_ROLES.VOLUNTEER]: 'Volunteer Driver / Courier',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: USER_ROLES.DONOR, phone: '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      await register(payload);

      // DONOR and VOLUNTEER are auto-activated — send them straight to login.
      // ORG_ADMIN requires admin approval before they can sign in.
      const needsApproval = form.role === USER_ROLES.ORG_ADMIN;
      if (needsApproval) {
        setSuccess('Account created! Your organization account is pending admin verification. You will be able to log in once approved.');
      } else {
        setSuccess('Account created successfully! You can now sign in.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100/90 dark:bg-[#090d16] relative overflow-hidden transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-600/10 dark:bg-teal-950/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in z-10 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-600 dark:to-emerald-800 mb-3 shadow-md shadow-emerald-900/20">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-slate-50 tracking-tight">Create an account</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Join the Food Rescue Operations Network</p>
        </div>

        <div className="card shadow-modal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 sm:p-8">
          {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   className="mb-4" />}
          {success && <Alert type="success" message={success} className="mb-4" />}

          {!success && (
            <form id="register-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="reg-name" className="form-label">Full name</label>
                <input id="reg-name" type="text" required value={form.name}
                  onChange={set('name')} className="form-input" placeholder="Jane Smith" />
              </div>
              <div>
                <label htmlFor="reg-email" className="form-label">Email address</label>
                <input id="reg-email" type="email" required value={form.email}
                  onChange={set('email')} className="form-input" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="reg-password" className="form-label">
                  Password <span className="text-content-muted text-xs font-normal">(min 8 chars)</span>
                </label>
                <input id="reg-password" type="password" required minLength={8} value={form.password}
                  onChange={set('password')} className="form-input" placeholder="••••••••" />
              </div>
              <div>
                <label htmlFor="reg-role" className="form-label">Role</label>
                <select id="reg-role" value={form.role} onChange={set('role')}
                  className="form-input">
                  {PUBLIC_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reg-phone" className="form-label">
                  Phone <span className="text-content-muted text-xs font-normal">(optional)</span>
                </label>
                <input id="reg-phone" type="tel" value={form.phone}
                  onChange={set('phone')} className="form-input" placeholder="+1 555 000 0000" />
              </div>

              <button id="register-submit-btn" type="submit" disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-2">
                {loading ? <Spinner size="sm" /> : null}
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {success && (
            <div className="text-center mt-2">
              <button onClick={() => navigate('/login')} className="btn-primary">
                Go to sign in
              </button>
            </div>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-content-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
