// City art: procedural night sky, layered skylines, textured iso ground with streets, building rows from
// the props atlas, baked lighting — plus ambient animation. One cached canvas per city.
import { W, H } from '../viewport'

const files = { humans: 'humans.png', vampires: 'vampires.png', props: 'city-props.png', terrain: 'terrain.png', icons: 'skill-icons.png' } as const
export const sprites = {} as Record<keyof typeof files, HTMLImageElement>
export const cache = new Map<number, HTMLCanvasElement>()
for (const key of Object.keys(files) as Array<keyof typeof files>) {
  const img = new Image()
  img.onload = () => cache.clear()
  img.src = '/assets/sprites/' + files[key]
  sprites[key] = img
}
export const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
export const humanAtlas = () => sprites.humans
export const rect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
export const poly = (c: CanvasRenderingContext2D, pts: number[][], color: string) => { c.fillStyle = color; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill() }
export function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r))
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.globalAlpha = alpha; c.fillStyle = g; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, Math.PI * 2); c.fill(); c.globalAlpha = 1
}
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }

export const HORIZON = 190

const PAL = [
  { sky: ['#140b24', '#3a1c3e', '#8a3a3a'], far: '#2a1a34', near: '#1a1026', ground: ['#5a4536', '#4f3c30', '#634b3a'], road: '#7a6450', light: '#ffae5c', accent: '#e4a66a' },
  { sky: ['#0f0c26', '#2b1d4a', '#5a2d5a'], far: '#231b3c', near: '#160f28', ground: ['#4d4452', '#463e4c', '#554b5a'], road: '#6e6472', light: '#ffc878', accent: '#c289db' },
  { sky: ['#070b1c', '#141e3e', '#3a2a5a'], far: '#1a2240', near: '#0e1428', ground: ['#3a4452', '#343d4a', '#404b5a'], road: '#262c36', light: '#7fd6ff', accent: '#71ccef' },
  { sky: ['#040c1c', '#0a2a3e', '#1a5a6a'], far: '#0e2a3c', near: '#081a28', ground: ['#2e4a5e', '#294356', '#335268'], road: '#1a2c3a', light: '#6ff7ff', accent: '#8ce7e4' },
]

/** Procedural night sky that warms toward dawn as the night progresses (0..1). */
export function drawSky(c: CanvasRenderingContext2D, era: number, progress: number, t: number) {
  const p = PAL[era]
  const g = c.createLinearGradient(0, 0, 0, HORIZON + 20)
  g.addColorStop(0, p.sky[0]); g.addColorStop(0.6, p.sky[1]); g.addColorStop(1, p.sky[2])
  c.fillStyle = g; c.fillRect(0, 0, W, HORIZON + 20)
  if (progress > 0.55) {
    const k = (progress - 0.55) / 0.45
    const d = c.createLinearGradient(0, 0, 0, HORIZON + 20)
    d.addColorStop(0, `rgba(90,110,170,${k * 0.5})`); d.addColorStop(1, `rgba(255,170,110,${k * 0.85})`)
    c.fillStyle = d; c.fillRect(0, 0, W, HORIZON + 20)
  }
  const r = rng(era * 97 + 3)
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * HORIZON * 0.9, speed = 0.6 + r() * 2, big = r() < 0.15
    c.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(t * speed + i))) * (1 - progress * 0.9)
    rect(c, x, y, big ? 2 : 1, big ? 2 : 1, '#fff')
  }
  c.globalAlpha = 1
  const mx = 780 - progress * 120, my = 58 + progress * 110
  glow(c, mx, my, 120, era >= 2 ? 'rgba(170,210,255,0.35)' : 'rgba(255,230,190,0.35)')
  c.fillStyle = '#fff4dc'; c.beginPath(); c.arc(mx, my, 26, 0, Math.PI * 2); c.fill()
  c.fillStyle = 'rgba(200,185,160,0.35)'
  for (const [dx, dy, rr] of [[-8, -6, 5], [7, 4, 7], [-2, 10, 3], [10, -9, 3]]) { c.beginPath(); c.arc(mx + dx, my + dy, rr, 0, Math.PI * 2); c.fill() }
  c.fillStyle = 'rgba(20,10,30,0.35)'
  for (let i = 0; i < 4; i++) {
    const x = ((t * (6 + i * 2) + i * 290) % (W + 300)) - 150, y = 40 + i * 32
    c.beginPath(); c.ellipse(x, y, 110, 12, 0, 0, Math.PI * 2); c.ellipse(x + 60, y - 6, 70, 10, 0, 0, Math.PI * 2); c.fill()
  }
}

function skyline(c: CanvasRenderingContext2D, era: number, seed: number, base: number, color: string, scale: number, lit: boolean) {
  const r = rng(seed)
  c.fillStyle = color
  if (era === 0) {
    c.beginPath(); c.moveTo(0, base)
    for (let x = 0; x <= W; x += 40) c.lineTo(x, base - (30 + r() * 70) * scale)
    c.lineTo(W, base); c.fill()
  } else if (era === 1) {
    for (let x = -20; x < W; x += 28 + r() * 30) {
      const w = 26 + r() * 30, h = (30 + r() * 60) * scale
      c.fillRect(x, base - h, w, h)
      if (r() < 0.5) { c.beginPath(); c.moveTo(x - 4, base - h); c.lineTo(x + w / 2, base - h - 26 * scale); c.lineTo(x + w + 4, base - h); c.fill() }
      else for (let k = 0; k < w; k += 8) c.fillRect(x + k, base - h - 6, 5, 6)
      if (lit && r() < 0.6) { c.fillStyle = 'rgba(255,190,110,0.55)'; c.fillRect(x + w / 2 - 2, base - h * 0.6, 4, 6); c.fillStyle = color }
    }
  } else if (era === 2) {
    for (let x = -10; x < W; x += 34 + r() * 26) {
      const w = 30 + r() * 26, h = (50 + r() * 110) * scale
      c.fillRect(x, base - h, w, h)
      if (lit) for (let yy = base - h + 6; yy < base - 6; yy += 9) for (let xx = x + 4; xx < x + w - 4; xx += 7) if (r() < 0.35) { c.fillStyle = r() < 0.8 ? 'rgba(255,220,140,0.6)' : 'rgba(255,90,170,0.7)'; c.fillRect(xx, yy, 3, 4); c.fillStyle = color }
    }
  } else {
    for (let x = -20; x < W; x += 60 + r() * 40) {
      const w = 50 + r() * 50, h = (40 + r() * 90) * scale
      c.beginPath(); c.ellipse(x + w / 2, base, w / 2, h * 0.5, 0, Math.PI, 0); c.fill()
      c.fillRect(x + w / 2 - 3, base - h - 30 * scale, 6, h)
      if (lit) { c.fillStyle = 'rgba(110,247,255,0.8)'; c.fillRect(x + w / 2 - 2, base - h - 30 * scale, 4, 4); c.fillStyle = color }
    }
  }
}

const TW = 72, TH = 36
const tilePos = (i: number, j: number) => ({ x: 500 + (i - j) * (TW / 2), y: 230 + (i + j) * (TH / 2) })
const isoTile = (c: CanvasRenderingContext2D, x: number, y: number, color: string) => poly(c, [[x, y - TH / 2], [x + TW / 2, y], [x, y + TH / 2], [x - TW / 2, y]], color)

export interface Light { x: number; y: number; r: number; color: string; fire?: boolean }
const lightsCache = new Map<number, Light[]>()
export const cityLights = (index: number) => lightsCache.get(index) ?? []

/** Static layer for a city: skylines, ground, streets, buildings, props and baked light. */
export function scenery(index: number) {
  if (cache.has(index)) return cache.get(index)!
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
  const c = canvas.getContext('2d')!
  const era = Math.floor(index / 5), slot = index % 5, p = PAL[era]
  const r = rng(index * 131 + 7)
  const lights: Light[] = []

  skyline(c, era, index * 3 + 1, HORIZON - 4, p.far, 1.2, false)
  const haze = c.createLinearGradient(0, HORIZON - 120, 0, HORIZON)
  haze.addColorStop(0, 'rgba(0,0,0,0)'); haze.addColorStop(1, p.sky[2] + '66')
  c.fillStyle = haze; c.fillRect(0, HORIZON - 120, W, 120)
  skyline(c, era, index * 3 + 2, HORIZON + 6, p.near, 0.8, true)

  c.fillStyle = p.ground[0]; c.fillRect(0, HORIZON, W, H - HORIZON)
  for (let i = -12; i < 22; i++) for (let j = -12; j < 22; j++) {
    const { x, y } = tilePos(i, j)
    if (x < -40 || x > W + 40 || y < HORIZON - 10 || y > H + 20) continue
    const road = i === 6 || (j === 5 && slot >= 1) || (i === j && slot >= 3)
    const n = r()
    isoTile(c, x, y, road ? p.road : p.ground[n < 0.7 ? 0 : n < 0.85 ? 1 : 2])
    if (!road) { c.globalAlpha = 0.03 + n * 0.04; isoTile(c, x, y - 1, n < 0.5 ? '#000' : '#fff'); c.globalAlpha = 1 }
    else {
      c.fillStyle = era === 2 ? 'rgba(255,220,120,0.35)' : era === 3 ? 'rgba(110,247,255,0.35)' : 'rgba(0,0,0,0.18)'
      for (let k = 0; k < 4; k++) c.fillRect(x - 14 + r() * 28, y - 5 + r() * 10, era >= 2 ? 6 : 4, 2)
    }
    c.strokeStyle = road ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'; c.lineWidth = 1
    c.beginPath(); c.moveTo(x - TW / 2, y); c.lineTo(x, y + TH / 2); c.lineTo(x + TW / 2, y); c.stroke()
  }
  for (let k = 0; k < 40; k++) {
    const x = r() * W, y = HORIZON + 30 + r() * (H - HORIZON - 30)
    const g = c.createRadialGradient(x, y, 0, x, y, 40 + r() * 60)
    g.addColorStop(0, r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,240,220,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g; c.fillRect(x - 100, y - 100, 200, 200)
  }
  for (let k = 0; k < 160; k++) {
    const x = r() * W, y = HORIZON + 20 + r() * (H - HORIZON - 20), kind = r()
    if (era <= 1) {
      if (kind < 0.5) { c.fillStyle = era === 0 ? '#6b7a3a' : '#5a6a4a'; for (let b = 0; b < 3; b++) c.fillRect(x + b * 2, y - 3 - (b % 2) * 2, 1, 4 + (b % 2) * 2) }
      else if (kind < 0.8) { c.fillStyle = '#8a7a6a'; c.fillRect(x, y, 3, 2) }
      else { c.fillStyle = era === 0 ? '#c86a8a' : '#e8d070'; c.fillRect(x, y, 2, 2) }
    } else if (era === 2) {
      if (kind < 0.3) { c.fillStyle = 'rgba(120,160,200,0.25)'; c.beginPath(); c.ellipse(x, y, 14, 4, 0, 0, Math.PI * 2); c.fill() }
      else if (kind < 0.5) { c.fillStyle = '#20262e'; c.beginPath(); c.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2); c.fill() }
      else { c.fillStyle = '#4a5462'; c.fillRect(x, y, 2, 1) }
    } else {
      if (kind < 0.35) { c.strokeStyle = 'rgba(110,247,255,0.25)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 16, y + 8); c.stroke() }
      else { c.fillStyle = 'rgba(160,240,255,0.3)'; c.fillRect(x, y, 2, 2) }
    }
  }

  const prop = (variant: number, x: number, y: number, size: number) => {
    if (!ready(sprites.props)) return
    const h = size * 0.9
    c.drawImage(sprites.props, variant * 160, era * 144, 160, 144, x - size / 2, y - h, size, h)
  }
  const back = 9
  for (let k = 0; k < back; k++) {
    const x = 40 + k * (W - 80) / (back - 1) + (r() - 0.5) * 20, y = HORIZON + 26 + (k % 2) * 10
    const v = era === 0 ? (k % 3 === 0 ? 1 : 0) : (k % 3 === 1 ? 1 : 0)
    prop(v, x, y, 150 + r() * 30)
    lights.push({ x, y: y - 30, r: 60, color: p.light })
  }
  const lx = [500, 250, 760, 500, 500][slot]
  prop(2, lx, HORIZON + 70, 210)
  lights.push({ x: lx, y: HORIZON + 30, r: 120, color: p.accent })
  for (const [i, j] of [[6, -2], [6, 2], [6, 6], [6, 10], [2, 5], [10, 5], [-2, 5], [14, 5]] as [number, number][]) {
    const { x, y } = tilePos(i, j)
    if (x < 20 || x > W - 20 || y < HORIZON + 20 || y > H - 10) continue
    if (era === 0) lights.push({ x, y: y - 16, r: 90, color: '#ff8a3c', fire: true })
    else { prop(3, x + 20, y + 4, era >= 2 ? 64 : 58); lights.push({ x: x + 20, y: y - 40, r: 95, color: p.light }) }
  }
  for (let k = 0; k < 6; k++) {
    const x = k < 3 ? 30 + k * 60 : W - 30 - (k - 3) * 60, y = HORIZON + 170 + (k % 3) * 110
    if (y > H - 20) continue
    prop(era === 0 ? 3 : k % 2, x, y, era === 0 ? 120 : 130)
  }

  c.globalCompositeOperation = 'lighter'
  for (const l of lights) glow(c, l.x, l.y + 30, l.r, l.color + '44')
  c.globalCompositeOperation = 'source-over'
  c.fillStyle = 'rgba(20,10,50,0.22)'; c.fillRect(0, HORIZON, W, H - HORIZON)

  lightsCache.set(index, lights)
  cache.set(index, canvas)
  return canvas
}

/** Animated ambience: flickering lights, fires, embers, drifting fog, drones. */
export function activity(c: CanvasRenderingContext2D, era: number, t: number, index: number) {
  const lights = cityLights(index)
  c.globalCompositeOperation = 'lighter'
  lights.forEach((l, i) => glow(c, l.x, l.y, l.r * 0.45, l.color + '55', 0.6 + Math.sin(t * 7 + i * 3) * 0.15 + Math.sin(t * 13 + i) * 0.08))
  c.globalCompositeOperation = 'source-over'
  lights.forEach((l, i) => { if (l.fire) fire(c, l.x, l.y + 14, 1, t + i) })
  const col = era === 0 ? '#ffb070' : era === 1 ? '#ffd890' : era === 2 ? '#ff7ac8' : '#8ff7ff'
  for (let i = 0; i < 26; i++) {
    const k = (t * 0.08 + i * 0.137) % 1
    const x = (i * 97.3 + Math.sin(t * 0.7 + i) * 30 + W) % W, y = H - k * (H - HORIZON)
    c.globalAlpha = Math.sin(k * Math.PI) * 0.7; rect(c, x, y, 2, 2, col)
  }
  c.globalAlpha = 1
  for (let i = 0; i < 3; i++) {
    const x = ((t * (8 + i * 4) + i * 400) % (W + 600)) - 300, y = HORIZON + 60 + i * 110
    const g = c.createRadialGradient(x, y, 10, x, y, 260)
    g.addColorStop(0, 'rgba(180,160,220,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g; c.fillRect(x - 260, y - 60, 520, 120)
  }
  if (era === 3) for (let i = 0; i < 3; i++) {
    const x = (t * (40 + i * 15) + i * 330) % (W + 100) - 50, y = HORIZON - 30 + i * 20 + Math.sin(t * 3 + i) * 6
    glow(c, x, y, 18, 'rgba(110,247,255,0.5)'); rect(c, x - 6, y - 1, 12, 3, '#9ff')
  }
}

export function fire(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  // stone ring + crossed logs
  c.fillStyle = '#2a2230'; c.beginPath(); c.ellipse(x, y + 1 * s, 13 * s, 5 * s, 0, 0, Math.PI * 2); c.fill()
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; c.fillStyle = k % 2 ? '#6a6070' : '#554c5c'; c.beginPath(); c.ellipse(x + Math.cos(a) * 11 * s, y + Math.sin(a) * 4 * s, 3.5 * s, 2.2 * s, 0, 0, Math.PI * 2); c.fill() }
  c.strokeStyle = '#4a2a18'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(x - 7 * s, y + 1 * s); c.lineTo(x + 7 * s, y - 3 * s); c.moveTo(x + 7 * s, y + 1 * s); c.lineTo(x - 7 * s, y - 3 * s); c.stroke()
  // flames (normal blending so they keep their colour), then a soft additive glow
  for (let k = 0; k < 3; k++) {
    const h = (15 + Math.sin(t * 11 + k * 2) * 4) * s * (1 - k * 0.25), w = (6.5 - k * 1.8) * s
    c.fillStyle = ['#d8341a', '#ff8a1a', '#ffd060'][k]
    c.beginPath(); c.moveTo(x - w, y - 1 * s); c.quadraticCurveTo(x - w * 0.8, y - h * 0.55, x + Math.sin(t * 9 + k) * 2 * s, y - h); c.quadraticCurveTo(x + w * 0.8, y - h * 0.55, x + w, y - 1 * s); c.fill()
  }
  c.globalCompositeOperation = 'lighter'
  glow(c, x, y - 8 * s, 30 * s, 'rgba(255,120,40,0.35)')
  c.globalCompositeOperation = 'source-over'
  for (let k = 0; k < 3; k++) { const e = (t * 0.9 + k * 0.33) % 1; c.globalAlpha = 1 - e; rect(c, x + Math.sin(t * 3 + k * 2) * 5 * s, y - 14 * s - e * 26 * s, 2, 2, '#ffc070') }
  c.globalAlpha = 1
}

/** Procedural bat silhouette with flapping wings. */
export function bat(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, color = '#1a0a1a') {
  const f = Math.sin(t * 22) * 0.8
  c.fillStyle = color
  c.beginPath()
  c.moveTo(x, y)
  c.quadraticCurveTo(x - 6 * s, y - 6 * s * f - 2 * s, x - 14 * s, y - 2 * s - 6 * s * f)
  c.quadraticCurveTo(x - 9 * s, y + 1 * s, x - 3 * s, y + 3 * s)
  c.lineTo(x, y + 5 * s)
  c.lineTo(x + 3 * s, y + 3 * s)
  c.quadraticCurveTo(x + 9 * s, y + 1 * s, x + 14 * s, y - 2 * s - 6 * s * f)
  c.quadraticCurveTo(x + 6 * s, y - 6 * s * f - 2 * s, x, y)
  c.fill()
  rect(c, x - 2 * s, y + 1 * s, 1.5 * s, 1.5 * s, '#ff3a5a'); rect(c, x + 0.5 * s, y + 1 * s, 1.5 * s, 1.5 * s, '#ff3a5a')
}
