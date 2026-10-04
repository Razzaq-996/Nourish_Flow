/** 404 Not Found page */
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center animate-fade-in">
        <p className="text-7xl font-bold text-brand-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Page not found</h1>
        <p className="text-slate-400 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="btn-primary">Go home</Link>
      </div>
    </div>
  );
}
