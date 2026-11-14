'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Faculty', name: 'Prof. Rajesh Sharma', email: 'rajesh.sharma@univ.edu', password: 'faculty123', icon: BookOpen },
  { role: 'Student', name: 'Devendra Joshi', email: 'devendra.joshi@univ.edu', password: 'student123', icon: GraduationCap },
  { role: 'HOD', name: 'Dr. Sunita Rao', email: 'sunita.rao@univ.edu', password: 'hod123', icon: ShieldCheck },
  { role: 'Admin staff', name: 'Arun Kulkarni', email: 'arun.kulkarni@univ.edu', password: 'admin123', icon: UserCog },
];

const ROLE_PILLS = [
  { icon: BookOpen, label: 'Faculty', text: 'mark and lock lectures' },
  { icon: GraduationCap, label: 'Students', text: 'track their standing' },
  { icon: ShieldCheck, label: 'HODs', text: 'approve leave' },
  { icon: UserCog, label: 'Admin', text: 'users and reports' },
];

/** Faint campus-plan blueprint: axis grid, column marks, one dimension chain, title block. */
function Blueprint() {
  const xs = [120, 470, 820, 1170, 1520];
  const ys = [190, 540, 890];
  return (
    <svg
      className="blueprint [mask-image:linear-gradient(100deg,rgba(0,0,0,.12)_0_40%,#000_85%)]"
      viewBox="0 0 1600 1010"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {xs.map((x, i) => (
        <g key={`x${x}`}>
          <line className="cl" x1={x} y1={60} x2={x} y2={990} />
          <circle cx={x} cy={40} r={20} />
          <text x={x} y={47} textAnchor="middle">
            {'ABCDE'[i]}
          </text>
        </g>
      ))}
      {ys.map((y, j) => (
        <g key={`y${y}`}>
          <line className="cl" x1={40} y1={y} x2={1590} y2={y} />
          <circle cx={20} cy={y} r={20} />
          <text x={20} y={y + 7} textAnchor="middle">
            {j + 1}
          </text>
        </g>
      ))}
      {ys.flatMap((y) =>
        xs.map((x) => <rect key={`c${x}-${y}`} className="col" x={x - 15} y={y - 15} width={30} height={30} />)
      )}
      {/* Dimension chain between axes */}
      <g className="dim">
        {xs.slice(0, -1).map((x, i) => (
          <g key={`d${x}`}>
            <line x1={x} y1={110} x2={xs[i + 1]} y2={110} />
            <line x1={x} y1={98} x2={x} y2={122} />
            <line x1={xs[i + 1]} y1={98} x2={xs[i + 1]} y2={122} />
            <text className="sm" x={(x + xs[i + 1]) / 2} y={100} textAnchor="middle">
              7,000
            </text>
          </g>
        ))}
      </g>
      {/* One typical room with a call-out */}
      <rect x={470} y={540} width={350} height={350} strokeDasharray="10 8" />
      <polyline points="645,715 645,640 700,640" />
      <circle cx={645} cy={715} r={4} className="col" />
      <text className="sm" x={706} y={645}>
        Room A-204
      </text>
      {/* Title block */}
      <g transform="translate(1210 900)">
        <rect width={360} height={90} />
        <line x1={0} y1={45} x2={360} y2={45} />
        <line x1={230} y1={45} x2={230} y2={90} />
        <text x={16} y={31}>AttendEASE365</text>
        <text className="sm" x={16} y={74}>
          Campus attendance plan
        </text>
        <text className="sm" x={246} y={74}>
          Sheet A-01
        </text>
      </g>
    </svg>
  );
}

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
    }
  };

  // Dev convenience: fills the form; login still goes through the real password check.
  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const inputClass =
    'w-full h-11 pl-10 pr-3 bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 transition-colors hover:border-slate-300 focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100';

  return (
    <div className="min-h-screen bg-white text-slate-800 grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)]">
      {/* Left: product story on a faint blueprint */}
      <section className="relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
        <Blueprint />
        <div className="relative flex flex-col h-full px-4 sm:px-10 lg:px-14 py-8 lg:py-12">
          <div className="flex items-center gap-2.5 font-bold text-slate-800">
            <span className="w-9 h-9 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            AttendEASE365
          </div>

          <div className="mt-12 lg:my-auto max-w-2xl">
            <h1 className="text-[clamp(2.4rem,5.4vw,4.75rem)] leading-[1.02] tracking-[-0.035em] font-bold">
              Every lecture,
              <span className="block pl-[0.6em] text-brand-600">on record.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-500 max-w-[38rem]">
              Faculty mark and lock each session, students see where they stand, and HODs approve
              leave. <mark className="good">75% compliance</mark> is checked on every submission, and
              every change lands in the <mark className="good">audit trail</mark>.
            </p>
            <ul className="mt-7 flex flex-wrap gap-2.5">
              {ROLE_PILLS.map(({ icon: Icon, label, text }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-sm shadow-2xs"
                >
                  <Icon className="w-4 h-4 text-brand-600" />
                  <strong className="font-semibold text-brand-600">{label}</strong>
                  <span className="text-slate-500">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Right: sign-in */}
      <section className="flex flex-col lg:justify-center px-4 sm:px-10 py-10 lg:py-12 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-3xl font-bold tracking-[-0.03em]">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Use your institutional email and password.</p>

          {error && (
            <div
              role="alert"
              className="mt-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@univ.edu"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1 w-9 h-9 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="lift w-full h-11 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Demo accounts</h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Development only. Click one to fill the form, then sign in.
              </p>
              <ul className="mt-3 divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {DEMO_ACCOUNTS.map(({ role, name, email: e, password: p, icon: Icon }) => (
                  <li key={e}>
                    <button
                      type="button"
                      onClick={() => fillDemo(e, p)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                        email === e ? 'bg-brand-50' : ''
                      }`}
                    >
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">{role}</span>
                        <span className="block text-2xs text-slate-500 truncate">
                          {name} · {e}
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
