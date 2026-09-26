// Tiny WebAudio synth: every sound is generated, so there are no audio files to load.
let ctx: AudioContext | null = null
let muted = false
const last = new Map<string, number>()
export const setMuted = (m: boolean) => { muted = m }

function tone(from: number, to: number, len: number, type: OscillatorType, vol: number, delay = 0) {
  if (!ctx) return
  const at = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + len)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + len + 0.02)
}

const GAP: Record<string, number> = { capture: 45, pickup: 40, bite: 60, dice: 50, boom: 90 }

export function sfx(name: string, combo = 0) {
  if (muted) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { return }
  const now = performance.now()
  if (now - (last.get(name) ?? 0) < (GAP[name] ?? 30)) return
  last.set(name, now)
  switch (name) {
    case 'capture': { const p = 380 * Math.pow(1.035, Math.min(40, combo)); tone(p, p * 1.6, 0.09, 'triangle', 0.035); break }
    case 'bite': tone(180, 90, 0.08, 'square', 0.03); break
    case 'pickup': tone(880, 1320, 0.07, 'sine', 0.04); break
    case 'pure': [0, 0.07, 0.14, 0.21].forEach((d, i) => tone(660 * Math.pow(1.26, i), 900 * Math.pow(1.26, i), 0.18, 'sine', 0.05, d)); break
    case 'shiny': [0, 0.08, 0.16].forEach((d, i) => tone(990 + i * 330, 1500 + i * 330, 0.22, 'triangle', 0.05, d)); break
    case 'jackpot': [0, 0.06, 0.12, 0.18, 0.24].forEach((d, i) => tone(520 + i * 180, 780 + i * 220, 0.2, 'square', 0.03, d)); break
    case 'boom': tone(120, 40, 0.3, 'sawtooth', 0.05); break
    case 'boss': tone(90, 55, 1.1, 'sawtooth', 0.08); tone(135, 80, 1.1, 'square', 0.03); break
    case 'bosskill': [0, 0.1, 0.2, 0.34].forEach((d, i) => tone(330 * Math.pow(1.33, i), 500 * Math.pow(1.33, i), 0.35, 'triangle', 0.07, d)); break
    case 'dawn': tone(520, 260, 0.6, 'sine', 0.05); break
    case 'start': tone(160, 520, 0.35, 'sawtooth', 0.04); break
    case 'buy': tone(420, 980, 0.18, 'triangle', 0.06); tone(630, 1300, 0.18, 'sine', 0.03, 0.05); break
    case 'pact': tone(300, 900, 0.3, 'sine', 0.05); break
    case 'dice': tone(1200, 900, 0.03, 'square', 0.02); break
    case 'click': tone(700, 520, 0.05, 'sine', 0.03); break
  }
}
