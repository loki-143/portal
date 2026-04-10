import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/auth';

function homeForRole(role: string): string {
  return role === 'superadmin' || role === 'admin' ? '/users' : role === 'recruiter' ? '/' : '/dashboard';
}

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(homeForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      await login(email.trim(), password);
      // Navigation will happen via the useEffect watching user
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <Card variant="low">Loading session…</Card>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <div className="text-2xl font-black tracking-tighter text-primary">Coastal Seven</div>
          <p className="text-on-surface-variant font-medium">Sign in to the unified hiring platform.</p>
        </header>

        {error && (
          <Card variant="low" className="text-error">
            {error}
          </Card>
        )}

        <Card className="space-y-6">
          <form className="space-y-6" onSubmit={submit}>
            <div className="space-y-2">
              <label className="label-md text-[10px] text-on-surface-variant/50">Email Address</label>
              <input
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="admin@coastalseven.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="label-md text-[10px] text-on-surface-variant/50">Password</label>
              <input
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-xs text-on-surface-variant/70">
              Default: admin@coastalseven.com / admin123
            </p>
            <p className="text-xs text-on-surface-variant/70">
              Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
