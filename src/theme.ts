'use client';

import { createTheme } from '@mui/material/styles';

/**
 * AttendEASE365 theme — the single source of colour. MUI writes the palette
 * to :root as --mui-palette-* and globals.css reads those for the Tailwind
 * brand-/emerald-/rose- classes. To recolour the app, change TOKENS here:
 * accent / accentInk / accentTint (primary + info.light), good*, bad*.
 */
export const TOKENS = {
  ink: '#2A3547',
  inkSoft: '#5A6A85',
  steel: '#7C8FAC',
  rule: '#DFE5EF',
  fill: '#F2F6FA',
  accent: '#1D4ED8',
  accentTint: '#E6EEFF',
  accentInk: '#1E3A8A',
  good: '#008C1F',
  goodTint: '#E8FBDA',
  goodInk: '#006B18',
  bad: '#C2410C',
  badTint: '#FDECE7',
  badInk: '#9A3412',
  warn: '#B45309',
  warnTint: '#FEF3C7',
  violet: '#7C3AED',
  violetTint: '#EDE9FE',
  sky: '#0369A1',
  skyTint: '#E0F2FE',
  shadow: '0 1px 2px rgba(42,53,71,.06), 0 8px 24px rgba(42,53,71,.06)',
  shadowLift: '0 2px 4px rgba(42,53,71,.08), 0 14px 32px rgba(42,53,71,.1)',
} as const;

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: { main: TOKENS.accent, light: '#5B8AF7', dark: TOKENS.accentInk, contrastText: '#fff' },
    success: { main: TOKENS.good, light: TOKENS.goodTint, dark: TOKENS.goodInk, contrastText: '#fff' },
    error: { main: TOKENS.bad, light: TOKENS.badTint, dark: TOKENS.badInk, contrastText: '#fff' },
    warning: { main: TOKENS.warn, light: TOKENS.warnTint, contrastText: '#fff' },
    info: { main: TOKENS.accent, light: TOKENS.accentTint, contrastText: '#fff' },
    text: { primary: TOKENS.ink, secondary: TOKENS.inkSoft, disabled: TOKENS.steel },
    divider: TOKENS.rule,
    background: { default: TOKENS.fill, paper: '#FFFFFF' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'var(--font-jakarta), ui-sans-serif, system-ui, sans-serif',
    fontWeightBold: 700,
    h1: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.125rem', fontWeight: 600 },
    h3: { fontSize: '1rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButtonBase: { defaultProps: { disableRipple: false } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, whiteSpace: 'nowrap' },
        sizeMedium: { minHeight: 40, paddingInline: 16 },
        sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: '0.8125rem' },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 16, borderColor: TOKENS.rule, boxShadow: TOKENS.shadow } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600 },
        sizeSmall: { height: 22, fontSize: '0.75rem' },
      },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: TOKENS.rule },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C9D3E1' },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: TOKENS.rule, fontSize: '0.875rem' },
        head: { fontWeight: 600, fontSize: '0.75rem', color: TOKENS.inkSoft, backgroundColor: '#F7F9FC', whiteSpace: 'nowrap' },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44, minWidth: 0, paddingInline: 0, marginRight: 24 } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 44 }, indicator: { height: 2 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: 'flex-start' } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 8, borderRadius: 999, backgroundColor: TOKENS.fill }, bar: { borderRadius: 999 } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 12, boxShadow: TOKENS.shadowLift } } },
  },
});

export default theme;
