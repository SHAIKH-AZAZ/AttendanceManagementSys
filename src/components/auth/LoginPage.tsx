'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Brand } from '@/components/layout/Navbar';
import { Button, Field, Notice, control, cn } from '@/components/ui';

// Seeded accounts for local development. The list is compiled out of production builds.
const DEV_ACCOUNTS =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        { role: 'Faculty', name: 'Prof. Rajesh Sharma', email: 'rajesh.sharma@univ.edu', password: 'faculty123' },
        { role: 'Student', name: 'Devendra Joshi', email: 'devendra.joshi@univ.edu', password: 'student123' },
        { role: 'Head of department', name: 'Dr. Sunita Rao', email: 'sunita.rao@univ.edu', password: 'hod123' },
        { role: 'Administrator', name: 'Arun Kulkarni', email: 'arun.kulkarni@univ.edu', password: 'admin123' },
      ];

export function LoginPage() {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Sign in | AttendEASE365';
  }, []);

  async function signIn(email: string, password: string) {
    setPending(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    signIn(String(data.get('email')), String(data.get('password')));
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="flex flex-col bg-brand-800 px-6 py-6 text-white sm:px-10 lg:py-12">
        <Brand inverted />
        <div className="mt-auto hidden max-w-md lg:block">
          <p className="font-serif text-4xl leading-tight font-medium">
            Attendance, leave and examination eligibility in one register.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-brand-100">
            Faculty record each lecture, heads of department approve leave, and students see where they stand against
            the 75% attendance requirement.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-600">Use the email address and password issued by your institution.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && <Notice tone="danger">{error}</Notice>}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="name@univ.edu"
                className={control}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={cn(control, 'pr-16')}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 rounded-r-md px-3 text-sm font-medium text-brand-700 hover:text-brand-900"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={pending} className="w-full">
              Sign in
            </Button>
          </form>

          {DEV_ACCOUNTS.length > 0 && (
            <section aria-labelledby="dev-accounts" className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
              <h2 id="dev-accounts" className="text-sm font-medium text-slate-900">
                Development accounts
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Seeded users. This list is not included in production builds.</p>
              <ul className="mt-2 divide-y divide-slate-100">
                {DEV_ACCOUNTS.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => signIn(account.email, account.password)}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{account.name}</span>
                        <span className="block text-xs text-slate-500">{account.role}</span>
                      </span>
                      <span className="text-sm font-medium text-brand-700">Sign in</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
