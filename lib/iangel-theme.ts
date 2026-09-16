/** IANGEL courier palette. Do not use as the restaurant theme. */
export const IANGEL_THEME = {
  sky: '#38BDF8',
  skyDeep: '#0284C7',
  skySoft: '#E0F2FE',
  white: '#FFFFFF',
  bg: '#F8FBFF',
  ink: '#0F172A',
  muted: '#64748B',
  ok: '#059669',
  wait: '#D97706',
  alert: '#DC2626',
  line: '#E2E8F0',
} as const;

export const IANGEL_CSS_VARS = {
  '--ia-sky': IANGEL_THEME.sky,
  '--ia-sky-deep': IANGEL_THEME.skyDeep,
  '--ia-sky-soft': IANGEL_THEME.skySoft,
  '--ia-white': IANGEL_THEME.white,
  '--ia-bg': IANGEL_THEME.bg,
  '--ia-ink': IANGEL_THEME.ink,
  '--ia-muted': IANGEL_THEME.muted,
  '--ia-ok': IANGEL_THEME.ok,
  '--ia-wait': IANGEL_THEME.wait,
  '--ia-alert': IANGEL_THEME.alert,
  '--ia-line': IANGEL_THEME.line,
} as const;
