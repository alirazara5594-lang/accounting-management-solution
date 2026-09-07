export interface ThemeFamily {
  id: string;
  name: string;
  category: string;
  primaryColor: string;
  accentColor: string;
  lightId: string;
  darkId: string;
  lightBg: string;
  darkBg: string;
}

export interface ThemeDef {
  id: string;
  familyId: string;
  name: string;
  mode: 'light' | 'dark';
  primary: string;
  accent: string;
  sidebar: string;
  dark?: boolean;
}

export const THEME_FAMILIES: ThemeFamily[] = [
  {
    id: 'sapphire',
    name: 'Sapphire Executive',
    category: 'Corporate Banking & IFRS Tier-1',
    primaryColor: '#006aa7',
    accentColor: '#38bdf8',
    lightId: 'sapphire-light',
    darkId: 'sapphire-dark',
    lightBg: '#e8f0f8',
    darkBg: '#0b1528',
  },
  {
    id: 'emerald',
    name: 'Emerald Ledger',
    category: 'Wealth, Islamic Banking & Balance Sheet',
    primaryColor: '#059669',
    accentColor: '#10b981',
    lightId: 'emerald-light',
    darkId: 'emerald-dark',
    lightBg: '#e6f4ea',
    darkBg: '#0a1c14',
  },
  {
    id: 'indigo',
    name: 'Indigo Audit',
    category: 'AI Analytics & Neon Double-Entry',
    primaryColor: '#8b5cf6',
    accentColor: '#ff7849',
    lightId: 'indigo-light',
    darkId: 'indigo-dark',
    lightBg: '#eef2ff',
    darkBg: '#16192e',
  },
  {
    id: 'slate',
    name: 'Slate Platinum',
    category: 'Wall Street Minimalist & Industrial',
    primaryColor: '#475569',
    accentColor: '#94a3b8',
    lightId: 'slate-light',
    darkId: 'slate-dark',
    lightBg: '#f1f5f9',
    darkBg: '#0f172a',
  },
  {
    id: 'amber',
    name: 'Amber Wealth',
    category: 'Treasury, Capital Reserves & Commodities',
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
    lightId: 'amber-light',
    darkId: 'amber-dark',
    lightBg: '#fef3c7',
    darkBg: '#1c1408',
  },
  {
    id: 'crimson',
    name: 'Crimson Governance',
    category: 'Forensic Audit, Tax & Risk Compliance',
    primaryColor: '#e11d48',
    accentColor: '#f43f5e',
    lightId: 'crimson-light',
    darkId: 'crimson-dark',
    lightBg: '#ffe4e6',
    darkBg: '#1c070c',
  },
];

export const THEMES: ThemeDef[] = [
  // Sapphire
  { id: 'sapphire-light', familyId: 'sapphire', name: 'Sapphire Light', mode: 'light', primary: '#006aa7', accent: '#0098db', sidebar: '#041c42' },
  { id: 'sapphire-dark', familyId: 'sapphire', name: 'Sapphire Dark', mode: 'dark', primary: '#38bdf8', accent: '#0284c7', sidebar: '#08101e', dark: true },
  { id: 'nd-light', familyId: 'sapphire', name: 'Sapphire Light', mode: 'light', primary: '#006aa7', accent: '#0098db', sidebar: '#041c42' },
  { id: 'nd-cool', familyId: 'sapphire', name: 'Sapphire Light', mode: 'light', primary: '#006aa7', accent: '#0098db', sidebar: '#041c42' },

  // Emerald
  { id: 'emerald-light', familyId: 'emerald', name: 'Emerald Light', mode: 'light', primary: '#059669', accent: '#10b981', sidebar: '#062c1e' },
  { id: 'emerald-dark', familyId: 'emerald', name: 'Emerald Dark', mode: 'dark', primary: '#10b981', accent: '#34d399', sidebar: '#07150f', dark: true },

  // Indigo
  { id: 'indigo-light', familyId: 'indigo', name: 'Indigo Light', mode: 'light', primary: '#6366f1', accent: '#8b5cf6', sidebar: '#1e1b4b' },
  { id: 'indigo-dark', familyId: 'indigo', name: 'Indigo Dark', mode: 'dark', primary: '#8b5cf6', accent: '#ff7849', sidebar: '#16192e', dark: true },
  { id: 'nd-dark', familyId: 'indigo', name: 'Indigo Dark', mode: 'dark', primary: '#8b5cf6', accent: '#ff7849', sidebar: '#16192e', dark: true },
  { id: 'va-dark', familyId: 'indigo', name: 'Indigo Dark', mode: 'dark', primary: '#8b5cf6', accent: '#ff7849', sidebar: '#16192e', dark: true },
  { id: 'bp-dark', familyId: 'indigo', name: 'Indigo Dark', mode: 'dark', primary: '#8b5cf6', accent: '#ff7849', sidebar: '#16192e', dark: true },

  // Slate
  { id: 'slate-light', familyId: 'slate', name: 'Slate Light', mode: 'light', primary: '#475569', accent: '#64748b', sidebar: '#0f172a' },
  { id: 'slate-dark', familyId: 'slate', name: 'Slate Dark', mode: 'dark', primary: '#94a3b8', accent: '#cbd5e1', sidebar: '#0a0f1d', dark: true },

  // Amber
  { id: 'amber-light', familyId: 'amber', name: 'Amber Light', mode: 'light', primary: '#d97706', accent: '#f59e0b', sidebar: '#2c1b06' },
  { id: 'amber-dark', familyId: 'amber', name: 'Amber Dark', mode: 'dark', primary: '#f59e0b', accent: '#fbbf24', sidebar: '#140d04', dark: true },

  // Crimson
  { id: 'crimson-light', familyId: 'crimson', name: 'Crimson Light', mode: 'light', primary: '#e11d48', accent: '#f43f5e', sidebar: '#3b0813' },
  { id: 'crimson-dark', familyId: 'crimson', name: 'Crimson Dark', mode: 'dark', primary: '#f43f5e', accent: '#fb7185', sidebar: '#140408', dark: true },
];

export const DEFAULT_THEME = 'sapphire-light';

export function getThemeFamily(themeId: string): ThemeFamily {
  const match = THEMES.find((x) => x.id === themeId);
  const famId = match?.familyId || 'sapphire';
  return THEME_FAMILIES.find((f) => f.id === famId) || THEME_FAMILIES[0];
}

export function isDarkTheme(themeId: string): boolean {
  if (themeId.endsWith('-dark') || themeId === 'dark') return true;
  const match = THEMES.find((x) => x.id === themeId);
  return Boolean(match?.dark);
}

export function getStoredTheme(): string {
  try {
    const t = localStorage.getItem('ams_theme');
    if (t && THEMES.some((x) => x.id === t)) return t;
    if (t === 'nd-light') return 'sapphire-light';
    if (t === 'nd-dark') return 'indigo-dark';
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}