// Procedural audio: every effect and the ambience are synthesized with WebAudio (no files to load).
let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = false
const last = new Map<string, number>()

function audio() {
  if (!ctx) {
    try { ctx = new AudioContext() } catch { return null }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination)
    // light compression keeps the chaos loud but never clipping
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(master)
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(comp)
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(comp)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(m: boolean) { muted = m; if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05) }
/** Call from any user gesture so iOS/Android unlock audio early. */
export function unlockAudio() { audio() }

function tone(from: number, to: number, len: number, type: OscillatorType, vol: number, delay = 0, bus = sfxBus) {
  const c = ctx; if (!c || !bus) return
  const at = c.currentTime + delay, o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + len)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g); g.connect(bus); o.start(at); o.stop(at + len + 0.02)
}

function noise(len: number, vol: number, filter: BiquadFilterType, freq: number, toFreq = freq, delay = 0, q = 1, bus = sfxBus) {
  const c = ctx; if (!c || !bus || !noiseBuf) return
  const at = c.currentTime + delay
  const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true
  const f = c.createBiquadFilter(); f.type = filter; f.Q.value = q
  f.frequency.setValueAtTime(freq, at); f.frequency.exponentialRampToValueAtTime(Math.max(30, toFreq), at + len)
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  src.connect(f); f.connect(g); g.connect(bus); src.start(at, Math.random()); src.stop(at + len + 0.02)
}

const GAP: Record<string, number> = { capture: 40, pickup: 45, bite: 70, dice: 45, boom: 80, tick: 85, hit: 60 }

export function sfx(name: string, combo = 0) {
  if (muted || !audio()) return
  const now = performance.now()
  if (now - (last.get(name) ?? 0) < (GAP[name] ?? 25)) return
  last.set(name, now)
  switch (name) {
    case 'tick': noise(0.06, 0.05, 'bandpass', 900, 500, 0, 2); break
    case 'capture': {
      const p = 330 * Math.pow(1.04, Math.min(36, combo))
      noise(0.12, 0.14, 'lowpass', 1800, 300)                  // wet squish
      tone(p, p * 1.9, 0.11, 'triangle', 0.07)                   // rising pitch with combo
      tone(p * 2, p * 3, 0.07, 'sine', 0.03, 0.03)
      break
    }
    case 'bite': noise(0.09, 0.22, 'bandpass', 2600, 700, 0, 3); tone(160, 70, 0.1, 'square', 0.06); break
    case 'pickup': tone(1046, 1568, 0.08, 'sine', 0.07); tone(1568, 2093, 0.08, 'sine', 0.05, 0.05); break
    case 'pure': [0, 0.06, 0.12, 0.18, 0.26].forEach((d, i) => tone(784 * Math.pow(1.26, i), 1100 * Math.pow(1.26, i), 0.25, 'sine', 0.07, d)); noise(0.5, 0.05, 'highpass', 6000, 9000, 0.1); break
    case 'shiny': [0, 0.07, 0.14, 0.21].forEach((d, i) => tone(1318 + i * 330, 1976 + i * 330, 0.25, 'triangle', 0.06, d)); break
    case 'jackpot': [0, 0.06, 0.12, 0.18, 0.24, 0.3].forEach((d, i) => tone(523 * Math.pow(1.19, i), 784 * Math.pow(1.19, i), 0.2, 'square', 0.04, d)); break
    case 'boom': noise(0.45, 0.35, 'lowpass', 1200, 60); tone(90, 30, 0.4, 'sine', 0.25); break
    case 'boss': tone(70, 45, 1.4, 'sawtooth', 0.14); tone(105, 60, 1.4, 'square', 0.05); noise(1.2, 0.12, 'lowpass', 400, 80); break
    case 'bosskill': noise(0.8, 0.3, 'lowpass', 2000, 80); [0, 0.12, 0.24, 0.4].forEach((d, i) => tone(330 * Math.pow(1.33, i), 500 * Math.pow(1.33, i), 0.45, 'triangle', 0.1, d + 0.1)); break
    case 'combo': [0, 0.05, 0.1].forEach((d, i) => tone(440 * Math.pow(1.5, i), 660 * Math.pow(1.5, i), 0.15, 'square', 0.05, d)); noise(0.3, 0.06, 'highpass', 3000, 8000); break
    case 'dawn': tone(523, 262, 0.8, 'sine', 0.08); tone(659, 330, 0.8, 'sine', 0.05, 0.1); break
    case 'start': noise(0.5, 0.12, 'bandpass', 400, 2400, 0, 1.5); tone(110, 220, 0.5, 'sawtooth', 0.05); break
    case 'buy': tone(523, 1046, 0.16, 'triangle', 0.09); tone(784, 1568, 0.16, 'sine', 0.05, 0.05); noise(0.2, 0.04, 'highpass', 5000, 9000, 0.03); break
    case 'pact': tone(294, 880, 0.35, 'sine', 0.08); tone(440, 1320, 0.35, 'sine', 0.04, 0.08); break
    case 'dice': noise(0.03, 0.12, 'bandpass', 3200, 2000, 0, 4); break
    case 'click': tone(880, 660, 0.05, 'sine', 0.05); break
  }
}

// ───────────────────────── ambience / music
let amb: { stop: () => void; kind: string } | null = null
let intensity = 0
export function setIntensity(k: number) { intensity = Math.max(0, Math.min(1, k)) }

export function ambience(kind: 'lair' | 'hunt' | 'none') {
  if (amb?.kind === kind) return
  amb?.stop(); amb = null
  if (kind === 'none' || muted || !audio()) return
  const c = ctx!, bus = musicBus!
  const nodes: AudioNode[] = []
  const timers: number[] = []
  const out = c.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, c.currentTime, 1.2); out.connect(bus); nodes.push(out)
  // wind: slowly swept filtered noise
  const wind = c.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true
  const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.Q.value = 0.8; wf.frequency.value = 400
  const wg = c.createGain(); wg.gain.value = kind === 'hunt' ? 0.05 : 0.03
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 250
  lfo.connect(lg); lg.connect(wf.frequency); wind.connect(wf); wf.connect(wg); wg.connect(out); wind.start(); lfo.start()
  nodes.push(wind, lfo)
  if (kind === 'lair') {
    // dark organ pad: minor chord that slowly changes
    const chords = [[110, 130.8, 164.8], [98, 116.5, 146.8], [87.3, 103.8, 130.8], [98, 123.5, 146.8]]
    const pad = chords[0].map((f) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = c.createGain(); g.gain.value = 0.045; o.connect(g); g.connect(out); o.start(); nodes.push(o); return o })
    let step = 0
    timers.push(window.setInterval(() => { step = (step + 1) % chords.length; pad.forEach((o, i) => o.frequency.setTargetAtTime(chords[step][i], c.currentTime, 0.8)) }, 4200))
  } else {
    // heartbeat drum that speeds up toward dawn, plus crickets
    const beat = () => {
      if (!ctx) return
      const at = c.currentTime
      for (const [d, v] of [[0, 1], [0.16, 0.7]] as const) {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'
        o.frequency.setValueAtTime(70, at + d); o.frequency.exponentialRampToValueAtTime(38, at + d + 0.18)
        g.gain.setValueAtTime(0.0001, at + d); g.gain.exponentialRampToValueAtTime(0.22 * v, at + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + d + 0.22)
        o.connect(g); g.connect(out); o.start(at + d); o.stop(at + d + 0.25)
      }
      timers[0] = window.setTimeout(beat, 1000 - intensity * 560)
    }
    timers.push(window.setTimeout(beat, 300))
    timers.push(window.setInterval(() => { if (Math.random() < 0.6) for (let k = 0; k < 3; k++) tone(4200, 4000, 0.04, 'sine', 0.012, k * 0.07, out as unknown as GainNode) }, 900))
  }
  amb = {
    kind,
    stop: () => {
      timers.forEach((t) => { clearTimeout(t); clearInterval(t) })
      out.gain.setTargetAtTime(0, c.currentTime, 0.3)
      setTimeout(() => nodes.forEach((n) => { try { (n as OscillatorNode).stop?.() } catch { /* already stopped */ } n.disconnect() }), 1200)
    },
  }
}
