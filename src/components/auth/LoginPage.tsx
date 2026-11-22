'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import MuiButton from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
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

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
      setIsSubmitting(false);
    }
  };

  // Dev convenience: fills the form; login still goes through the real password check.
  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: { xs: 2, sm: 4 } }}>
      <Card
        sx={{
          width: '100%',
          maxWidth: 1040,
          p: { xs: 2.5, sm: 4 },
          display: 'grid',
          gap: { xs: 3, md: 5 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
        }}
      >
        {/* Sign-in */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="flex items-center gap-2.5 font-bold text-slate-800">
            <span className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            AttendEASE365
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-[-0.03em]">Sign in</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Every lecture, on record. Faculty lock each session, students see where they stand, and HODs approve
            leave.
          </p>

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
              loading={isSubmitting}
              endIcon={<ArrowRight size={16} />}
              sx={{ minHeight: 44 }}
            >
              Sign in
            </MuiButton>
          </form>

          {/* Prod shows this only with NEXT_PUBLIC_DEMO_MODE=true; pair it with SEED_DEMO_DATA=true so the accounts exist. */}
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800">Demo accounts</h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Try any role. Click one to fill the form, then sign in.
                {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && " Read-only: changes aren't saved."}
              </p>
              <List disablePadding className="mt-3 border border-slate-200 rounded-xl bg-white overflow-hidden">
                {DEMO_ACCOUNTS.map(({ role, name, email: e, password: p, icon: Icon }, idx) => (
                  <ListItemButton
                    key={e}
                    divider={idx < DEMO_ACCOUNTS.length - 1}
                    selected={email === e}
                    onClick={() => fillDemo(e, p)}
                    sx={{ gap: 1.5, py: 1.25, my: 0, borderRadius: 0 }}
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
        </Box>

        {/* Campus photo: above the form on phones, beside it from md up */}
        <Box
          sx={{
            position: 'relative',
            order: { xs: -1, md: 0 },
            minHeight: { xs: 160, md: 480 },
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Image
            src="/images/iit-bombay-main-building.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1040px) 480px, (min-width: 900px) 45vw, 100vw"
            className="object-cover"
          />
        </Box>
      </Card>
    </Box>
  );
};
