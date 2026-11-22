'use client';

import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/en-in';
import { Theme } from '@astryxdesign/core/theme';
import { themes, defaultThemeSlug, themeModes } from '../astryx-themes';

/** Client-side providers that can't be created in the server layout (they take functions/classes as props). */
export function Providers({ children }: { children: React.ReactNode }) {
  // en-in: dates shown as DD/MM/YYYY, weeks start on Monday.
  return (
    <Theme theme={themes[defaultThemeSlug]} mode={themeModes[defaultThemeSlug] ?? 'light'}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-in">
        {children}
      </LocalizationProvider>
    </Theme>
  );
}
