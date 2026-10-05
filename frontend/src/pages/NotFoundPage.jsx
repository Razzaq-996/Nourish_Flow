/** 404 Not Found page */
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/common/ThemeToggle';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 relative transition-colors">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="text-center animate-fade-in max-w-md">
        <p className="text-8xl font-black text-brand-600 dark:text-brand-500 tracking-tighter mb-2">404</p>
        <h1 className="text-2xl font-bold text-content-primary tracking-tight mb-2">Page not found</h1>
        <p className="text-content-muted mb-6 text-sm">The rescue route or page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="btn-primary">Return to Operations</Link>
      </div>
    </div>
  );
}
