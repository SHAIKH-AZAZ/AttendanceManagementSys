'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { VStack, HStack, StackItem } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Center } from '@astryxdesign/core/Center';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { TextInput } from '@astryxdesign/core/TextInput';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { ArrowRight, BookOpen, GraduationCap, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Faculty', name: 'Prof. Rajesh Sharma', email: 'rajesh.sharma@univ.edu', password: 'faculty123', icon: BookOpen },
  { role: 'Student', name: 'Devendra Joshi', email: 'devendra.joshi@univ.edu', password: 'student123', icon: GraduationCap },
  { role: 'HOD', name: 'Dr. Sunita Rao', email: 'sunita.rao@univ.edu', password: 'hod123', icon: ShieldCheck },
  { role: 'Admin staff', name: 'Arun Kulkarni', email: 'arun.kulkarni@univ.edu', password: 'admin123', icon: UserCog },
];

const SHOW_DEMO = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// From Astryx's login-split template. The grid holds two columns down to 2 × 240px + gap and
// stacks below that; the container query (keyed to the card, not the window) then moves the
// photo above the form and tightens the inset. A plain <style> tag needs no CSS compiler.
const LOGIN_SPLIT_CSS = `
.login-split-grid {
  container-type: inline-size;
  container-name: login-split;
  padding: var(--spacing-8);
}
.login-split-image {
  width: 100%;
  order: 0;
}
@container login-split (max-width: 511px) {
  .login-split-grid {
    padding: var(--spacing-4);
  }
  .login-split-image {
    order: -1;
    height: 160px;
  }
}
`;

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
    <main>
      <Center axis="both" padding={4} minHeight="100dvh">
        <style>{LOGIN_SPLIT_CSS}</style>
        <Card padding={0} width="100%" maxWidth={1040}>
          <Grid columns={{ minWidth: 240, repeat: 'fit' }} gap={8} align="stretch" className="login-split-grid">
            {/* Sign-in */}
            <Section variant="transparent" padding={0} height="100%">
              <VStack gap={6} height="100%">
                <HStack gap={2} vAlign="center">
                  <NavIcon icon={<Icon icon={GraduationCap} size="sm" />} />
                  <Text weight="bold">AttendEASE365</Text>
                </HStack>

                <StackItem size="fill">
                  <VStack gap={5} width="100%">
                    <VStack gap={1}>
                      <Heading level={1}>Sign in</Heading>
                      <Text color="secondary">
                        Every lecture, on record. Faculty lock each session, students see where they stand, and
                        HODs approve leave.
                      </Text>
                    </VStack>

                    {error && <Banner role="alert" status="error" title={error} />}

                    <form onSubmit={handleSubmit}>
                      <VStack gap={3}>
                        <TextInput
                          label="Email"
                          type="email"
                          htmlName="email"
                          autoComplete="username"
                          placeholder="name@univ.edu"
                          startIcon={Mail}
                          isRequired
                          size="lg"
                          value={email}
                          onChange={setEmail}
                        />
                        <TextInput
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          htmlName="password"
                          autoComplete="current-password"
                          startIcon={Lock}
                          isRequired
                          size="lg"
                          value={password}
                          onChange={setPassword}
                        />
                        <CheckboxInput label="Show password" value={showPassword} onChange={setShowPassword} />
                        <Button
                          type="submit"
                          label="Sign in"
                          variant="primary"
                          size="lg"
                          isLoading={isSubmitting}
                          endContent={<Icon icon={ArrowRight} />}
                        />
                      </VStack>
                    </form>

                    {/* Prod shows this only with NEXT_PUBLIC_DEMO_MODE=true; pair it with SEED_DEMO_DATA=true so the accounts exist. */}
                    {SHOW_DEMO && (
                      <VStack gap={2}>
                        <Divider />
                        <VStack gap={0.5}>
                          <Heading level={2}>Demo accounts</Heading>
                          <Text type="supporting" color="secondary">
                            Pick a role to fill the form, then sign in.
                            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && " Read-only: changes aren't saved."}
                          </Text>
                        </VStack>
                        <List hasDividers density="compact" edge="flush">
                          {DEMO_ACCOUNTS.map(({ role, name, email: e, password: p, icon }) => (
                            <ListItem
                              key={e}
                              startContent={<Icon icon={icon} color="accent" />}
                              label={role}
                              description={`${name} · ${e}`}
                              endContent={<Icon icon={ArrowRight} color="secondary" size="sm" />}
                              isSelected={email === e}
                              onClick={() => fillDemo(e, p)}
                            />
                          ))}
                        </List>
                      </VStack>
                    )}
                  </VStack>
                </StackItem>
              </VStack>
            </Section>

            {/* Campus photo; the transparent Card clips it to rounded corners. */}
            <Card variant="transparent" padding={0} width="100%" height="100%" className="login-split-image">
              <Image
                src="/images/iit-bombay-main-building.jpg"
                alt=""
                width={2000}
                height={1500}
                priority
                sizes="(min-width: 1040px) 480px, 100vw"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Card>
          </Grid>
        </Card>
      </Center>
    </main>
  );
};
