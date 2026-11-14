'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import MuiButton from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import {
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

  return (
    <div className="min-h-screen bg-white text-slate-800 grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)]">
      {/* Left: product story over the campus photo */}
      <section className="relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200">
        {/* Campus photo under a white wash so the headline stays readable */}
        <Image
          src="/images/gec-modasa.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover object-[70%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.97)_38%,rgba(255,255,255,.75)_58%,rgba(255,255,255,.1)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(255,255,255,.75)_0%,rgba(255,255,255,.95)_45%,#fff_100%)]" />
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

          <p className="mt-10 lg:mt-0 text-2xs text-slate-500">
            Government Engineering College, Modasa. Photo:{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:GEC_MODASA.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-slate-800"
            >
              Saifullah.vguj
            </a>
            ,{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-slate-800"
            >
              CC BY-SA 4.0
            </a>
            , resized.
          </p>
        </div>
      </section>

      {/* Right: sign-in */}
      <section className="flex flex-col lg:justify-center px-4 sm:px-10 py-10 lg:py-12 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-3xl font-bold tracking-[-0.03em]">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Use your institutional email and password.</p>

          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <TextField
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@univ.edu"
              size="medium"
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="medium"
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={16} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <MuiButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={isLoading}
              endIcon={<ArrowRight size={16} />}
              sx={{ minHeight: 44 }}
            >
              Sign in
            </MuiButton>
          </form>

          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Demo accounts</h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Development only. Click one to fill the form, then sign in.
              </p>
              <List disablePadding className="mt-3 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {DEMO_ACCOUNTS.map(({ role, name, email: e, password: p, icon: Icon }, idx) => (
                  <ListItemButton
                    key={e}
                    divider={idx < DEMO_ACCOUNTS.length - 1}
                    selected={email === e}
                    onClick={() => fillDemo(e, p)}
                    sx={{ gap: 1.5, py: 1.25 }}
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
                  </ListItemButton>
                ))}
              </List>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
