import type { Metadata, Viewport } from 'next';
import { Public_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AttendEASE365',
    template: '%s | AttendEASE365',
  },
  description: 'Attendance records, leave approvals and examination eligibility for university departments.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#1f3a68',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} ${sourceSerif.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
