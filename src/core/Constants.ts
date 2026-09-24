export const SAVE_KEY = 'hemofarm.save';
export const SAVE_VERSION = 1;
export const AUTOSAVE_INTERVAL_MS = 15_000;

// A gap longer than this between two frames (tab hidden, device asleep) is treated as offline time.
export const OFFLINE_GAP_SEC = 5;
// Offline reports shorter than this are applied silently.
export const OFFLINE_REPORT_MIN_SEC = 60;

// Sibling-game art is authored at 2x world scale.
export const WORLD_SCALE = 0.5;
// Characters are drawn a bit larger than the sibling game: in Hemofarm the people ARE the farm.
export const CHARACTER_SCALE = 0.62;

export type LayoutMode = 'DESKTOP_LANDSCAPE' | 'MOBILE_PORTRAIT';
export type ScreenId = 'farm' | 'upgrades' | 'market' | 'legacy';

// Color tokens. CSS mirrors these as custom properties in src/ui/styles.css.
export const Colors = {
  backgroundDark: 0x070b14,
  panelDark: 0x151019,
  bloodRed: 0x9e0f22,
  bloodBright: 0xe0182f,
  gold: 0xf2c14e,
  essencePurple: 0xa14dff,
  successGreen: 0x4caf3d,
  textPrimary: 0xf6ead7,
  textSecondary: 0xb8a795,
  lockedGray: 0x5b5560,
  torchLight: 0xff9a3c,
  moonBlue: 0x8fa8ff,
} as const;

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export const IS_DEV = import.meta.env.DEV;
