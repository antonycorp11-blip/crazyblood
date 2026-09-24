// Central NumberFormatter. Every economic number on screen goes through here.
// Suffix table stops at Dc (1e33); beyond that we fall back to scientific notation, which keeps
// the door open for a big-number library later without touching call sites.
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);
  if (v < 1000) {
    if (v === 0) return '0';
    if (v < 10 && !Number.isInteger(v)) return sign + (Math.floor(v * 10) / 10).toString();
    return sign + Math.floor(v).toString();
  }
  const tier = Math.floor(Math.log10(v) / 3);
  if (tier >= SUFFIXES.length) return sign + v.toExponential(2).replace('+', '');
  const scaled = v / Math.pow(1000, tier);
  // 3 significant digits: 1.00K / 12.4K / 124K. Floor so we never display more than the player has.
  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  const f = Math.pow(10, decimals);
  return sign + (Math.floor(scaled * f) / f).toFixed(decimals) + SUFFIXES[tier];
}

export function formatRate(perSecond: number): string {
  return `+${formatNumber(perSecond)}/s`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}
