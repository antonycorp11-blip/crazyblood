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
    musicBus = ctx.createGain(); musicBus.gain.value = 1.1; musicBus.connect(comp)
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

const GAP: Record<string, number> = { warn: 200, hurt: 300, capture: 40, pickup: 45, bite: 70, dice: 45, boom: 80, tick: 85, hit: 60 }

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
    case 'warn': tone(880, 880, 0.09, 'square', 0.05); tone(880, 880, 0.09, 'square', 0.05, 0.13); break
    case 'slam': noise(0.5, 0.4, 'lowpass', 900, 50); tone(70, 28, 0.45, 'sine', 0.35); break
    case 'howl': [0, 0.05].forEach((d, i) => tone(220 + i * 7, 520 + i * 9, 0.5, 'sawtooth', 0.05, d)); tone(520, 300, 1.1, 'sawtooth', 0.05, 0.5); noise(1.4, 0.05, 'bandpass', 900, 500, 0.1, 3); break
    case 'hurt': tone(300, 90, 0.3, 'square', 0.12); noise(0.25, 0.25, 'lowpass', 2500, 200); break
    case 'escape': tone(600, 150, 0.8, 'sawtooth', 0.06); noise(0.8, 0.08, 'bandpass', 700, 200, 0, 2); break
    case 'click': tone(880, 660, 0.05, 'sine', 0.05); break
  }
}

// ───────────────────────── music: a tiny step sequencer (bass, drums, arpeggio, lead, pad)
type Song = 'lair' | 'hunt' | 'boss'
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
// chords as MIDI roots + minor/major third; four bars each
const SONGS: Record<Song, { bpm: number; chords: Array<[number, number[]]>; lead: number[]; drums: string; hat: string; bass: string }> = {
  // slow gothic organ with a bell melody
  lair: { bpm: 70, chords: [[57, [0, 3, 7]], [50, [0, 3, 7]], [52, [0, 4, 7]], [57, [0, 3, 7]]],
    lead: [76, -1, 74, 72, 71, -1, 72, 74, 76, -1, -1, 79, 77, -1, 76, 74], drums: '................', hat: '................', bass: 'x.......x.......' },
  // driving night-hunt groove: i - VI - VII - v
  hunt: { bpm: 116, chords: [[45, [0, 3, 7]], [41, [0, 4, 7]], [43, [0, 4, 7]], [40, [0, 3, 7]]],
    lead: [69, -1, 72, 76, -1, 74, 72, -1, 71, -1, 72, 74, -1, 76, -1, -1], drums: 'k...s..kk.k.s...', hat: '..x...x...x...xx', bass: 'x.xx.x.xx.xx.x.x' },
  // werewolf duel: faster, phrygian, heavy
  boss: { bpm: 148, chords: [[45, [0, 3, 7]], [46, [0, 4, 7]], [45, [0, 3, 7]], [44, [0, 3, 6]]],
    lead: [81, 80, 81, -1, 76, -1, 77, 76, 74, -1, 76, -1, 72, 71, 72, -1], drums: 'k.k.s.kkk.k.s.ks', hat: 'xxxxxxxxxxxxxxxx', bass: 'xxx.xxx.xxxxx.xx' },
}

function note(at: number, f: number, len: number, type: OscillatorType, vol: number, out: AudioNode, cutoff = 0, detune = 0) {
  const c = ctx!; const o = c.createOscillator(), g = c.createGain()
  o.type = type; o.frequency.value = f; o.detune.value = detune
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  if (cutoff) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cutoff * 2.2, at); fl.frequency.exponentialRampToValueAtTime(cutoff, at + len * 0.6); o.connect(fl); fl.connect(g) } else o.connect(g)
  g.connect(out); o.start(at); o.stop(at + len + 0.05)
}
function hitNoise(at: number, len: number, vol: number, type: BiquadFilterType, f: number, out: AudioNode) {
  const c = ctx!; const src = c.createBufferSource(); src.buffer = noiseBuf
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f
  const g = c.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  src.connect(fl); fl.connect(g); g.connect(out); src.start(at, Math.random() * 0.5); src.stop(at + len + 0.02)
}
function kick(at: number, out: AudioNode, vol = 0.5) {
  const c = ctx!; const o = c.createOscillator(), g = c.createGain()
  o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.14)
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
  o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.32)
}

let amb: { stop: () => void; kind: string } | null = null
let intensity = 0
export function setIntensity(k: number) { intensity = Math.max(0, Math.min(1, k)) }

export function ambience(kind: Song | 'none') {
  if (amb?.kind === kind) return
  amb?.stop(); amb = null
  if (kind === 'none' || muted || !audio()) return
  const c = ctx!, song = SONGS[kind]
  const out = c.createGain(); out.gain.value = 0.0001; out.gain.setTargetAtTime(1, c.currentTime, 0.6); out.connect(musicBus!)
  // a little echo gives the lead and bells some space
  const delay = c.createDelay(1); delay.delayTime.value = (60 / song.bpm) * 0.75
  const fb = c.createGain(); fb.gain.value = 0.3; const wet = c.createGain(); wet.gain.value = 0.35
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out)
  // wind bed
  const wind = c.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true
  const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.Q.value = 0.7; wf.frequency.value = 450
  const wg = c.createGain(); wg.gain.value = kind === 'lair' ? 0.05 : 0.035
  const lfo = c.createOscillator(); lfo.frequency.value = 0.08; const lg = c.createGain(); lg.gain.value = 280
  lfo.connect(lg); lg.connect(wf.frequency); wind.connect(wf); wf.connect(wg); wg.connect(out); wind.start(); lfo.start()

  const step = 60 / song.bpm / 4 // 16th notes
  let n = 0, next = c.currentTime + 0.1
  const play = (i: number, at: number) => {
    const bar = Math.floor(i / 16) % 4, s16 = i % 16
    const [root, tri] = song.chords[bar]
    if (kind === 'lair') {
      if (s16 === 0) for (const iv of tri) { note(at, midi(root + iv), step * 16, 'triangle', 0.07, out); note(at, midi(root + iv + 12), step * 16, 'sine', 0.03, out, 0, 6) }
      if (s16 === 0) note(at, midi(root - 12), step * 16, 'sawtooth', 0.05, out, 300)
      const m = song.lead[s16]
      if (m > 0 && (bar % 2 === 0 || s16 < 8)) { note(at, midi(m), 1.2, 'sine', 0.06, out); note(at, midi(m + 12), 0.5, 'sine', 0.015, delay) }
      return
    }
    const hot = kind === 'boss' ? 1 : intensity
    // drums
    const d = song.drums[s16]
    if (d === 'k') kick(at, out, 0.55)
    if (d === 's') { hitNoise(at, 0.18, 0.22, 'bandpass', 1800, out); note(at, 190, 0.1, 'triangle', 0.08, out) }
    if (song.hat[s16] === 'x' || (hot > 0.6 && s16 % 2 === 0)) hitNoise(at, 0.04, 0.07 + hot * 0.04, 'highpass', 7000, out)
    // bass
    if (song.bass[s16] === 'x') note(at, midi(root + (s16 === 14 ? 7 : 0)), step * 1.8, 'sawtooth', 0.14, out, 260 + hot * 400)
    // arpeggio (thickens toward dawn)
    if (hot > 0.25 || kind === 'boss' || s16 % 2 === 0) {
      const tone = tri[(s16 + bar) % 3] + 12 * (1 + (s16 % 4 === 3 ? 1 : 0))
      note(at, midi(root + 12 + tone), step * 0.9, 'square', 0.035, out, 1400 + hot * 1400)
    }
    // lead melody every other phrase
    const m = song.lead[s16]
    if (m > 0 && (kind === 'boss' || bar % 2 === 1 || hot > 0.5)) { note(at, midi(m), step * 1.9, 'sawtooth', 0.05, out, 2200, 7); note(at, midi(m), step * 1.9, 'sawtooth', 0.03, delay, 2200, -7) }
    // pad
    if (s16 === 0) for (const iv of tri) note(at, midi(root + 24 + iv), step * 16, 'triangle', 0.02, out)
  }
  const timer = window.setInterval(() => {
    if (!ctx) return
    if (next < c.currentTime - 0.5) next = c.currentTime + 0.05 // tab was asleep
    while (next < c.currentTime + 0.2) { play(n, next); n++; next += step }
  }, 40)
  amb = {
    kind,
    stop: () => {
      clearInterval(timer)
      out.gain.setTargetAtTime(0.0001, c.currentTime, 0.25)
      setTimeout(() => { try { wind.stop(); lfo.stop() } catch { /* stopped */ } out.disconnect() }, 1500)
    },
  }
}
