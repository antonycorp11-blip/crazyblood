// The Lair: home screen scene. It visibly grows with progress (candles, banners, blood fountain,
// coffins, trophies, bats, runes) so the player sees how far they came without reading numbers.
import { ERAS } from '../game/data'
import type { Save } from '../game/save'
import { totalLevels } from '../game/save'
import { camera, W, H } from '../viewport'
import { bat as drawBat, fire, glow, poly, ready, rect, sprites } from './scenery'

export interface LairState { levels: number; cleared: number; echoes: number; shinies: number; era: number }
export const lairState = (s: Save): LairState => ({
  levels: totalLevels(s), cleared: Object.keys(s.cleared).length, echoes: s.echoes, shinies: s.shinies, era: Math.min(3, Math.floor(s.city / 5)),
})

let wallCache: HTMLCanvasElement | null = null
function wall() {
  if (wallCache) return wallCache
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const c = cv.getContext('2d')!
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0f22'); g.addColorStop(1, '#0d0812')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  // stone blocks
  for (let y = 0; y < 330; y += 22) for (let x = (y / 22) % 2 ? -30 : 0; x < W; x += 60) {
    rect(c, x + 1, y + 1, 58, 20, (x + y) % 7 ? '#241629' : '#2a1a2f'); rect(c, x + 1, y + 1, 58, 2, '#3a2540')
  }
  // floor
  for (let i = -14; i < 16; i++) for (let j = 0; j < 12; j++) {
    const x = 500 + (i - j) * 40, y = 340 + (i + j) * 20 - 220
    if (y < 330 || y > H + 20) continue
    poly(c, [[x, y - 20], [x + 40, y], [x, y + 20], [x - 40, y]], (i + j) % 2 ? '#2b1a2c' : '#24152a')
  }
  c.fillStyle = '#0006'; c.fillRect(0, 330, W, 6)
  // pillars
  for (const x of [70, 250, 750, 930]) {
    rect(c, x - 26, 0, 52, 360, '#2d1d33'); rect(c, x - 26, 0, 8, 360, '#3b2843'); rect(c, x + 18, 0, 8, 360, '#1b1020')
    rect(c, x - 34, 340, 68, 18, '#3b2843'); rect(c, x - 34, 0, 68, 14, '#3b2843')
  }
  wallCache = cv
  return cv
}

/** `focusX` (canvas px) re-centres the throne when a side panel covers the middle of the screen. */
export function drawLair(c: CanvasRenderingContext2D, s: LairState, t: number, focusX?: number) {
  const cam = camera(c.canvas.width, c.canvas.height), { scale, y: oy } = cam
  const ox = focusX === undefined ? cam.x : focusX - 500 * scale
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0d0812'; c.fillRect(0, 0, c.canvas.width, c.canvas.height)
  c.setTransform(scale, 0, 0, scale, ox, oy); c.imageSmoothingEnabled = false
  const accent = ERAS[s.era].color
  c.drawImage(wall(), 0, 0, W, H, 0, 0, W, H)
  // great window with the night outside
  c.save()
  c.beginPath(); c.moveTo(360, 300); c.lineTo(360, 120); c.quadraticCurveTo(500, -30, 640, 120); c.lineTo(640, 300); c.closePath(); c.clip()
  const sky = c.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#0c0820'); sky.addColorStop(1, '#3a1c46')
  c.fillStyle = sky; c.fillRect(330, 0, 340, 300)
  for (let i = 0; i < 40; i++) { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t + i)); rect(c, 340 + (i * 83) % 320, (i * 47) % 200, 1, 1, '#fff') }
  c.globalAlpha = 1
  c.fillStyle = '#fff7df'; c.beginPath(); c.arc(560 + Math.sin(t * 0.05) * 4, 95, 34, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffe9c066'; c.beginPath(); c.arc(560, 95, 52, 0, Math.PI * 2); c.fill()
  for (let i = 0; i < 9; i++) { const x = 360 + i * 36; poly(c, [[x, 300], [x + 14, 230 - (i * 37) % 60], [x + 32, 300]], '#140c1c') }
  rect(c, 440, 200, 14, 100, '#140c1c'); poly(c, [[432, 200], [447, 170], [462, 200]], '#140c1c')
  c.restore()
  // re-draw window frame over the wall
  c.strokeStyle = '#4a3052'; c.lineWidth = 10
  c.beginPath(); c.moveTo(360, 300); c.lineTo(360, 120); c.quadraticCurveTo(500, -30, 640, 120); c.lineTo(640, 300); c.stroke()
  c.lineWidth = 4; c.beginPath(); c.moveTo(500, 40); c.lineTo(500, 300); c.moveTo(360, 190); c.lineTo(640, 190); c.stroke()
  // moonlight on the floor
  const light = c.createRadialGradient(500, 340, 10, 500, 340, 260)
  light.addColorStop(0, '#b9a7ff22'); light.addColorStop(1, '#0000')
  c.fillStyle = light; c.fillRect(200, 300, 600, 260)

  // runes circle (echoes)
  if (s.echoes > 0 || s.levels >= 60) {
    c.save(); c.translate(500, 340); c.scale(1, 0.42); c.rotate(t * 0.15)
    c.strokeStyle = accent; c.globalAlpha = 0.5 + Math.sin(t * 2) * 0.15; c.lineWidth = 3
    c.beginPath(); c.arc(0, 0, 170, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 140, 0, Math.PI * 2); c.stroke()
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillStyle = accent; c.fillRect(Math.cos(a) * 155 - 4, Math.sin(a) * 155 - 4, 8, 8) }
    c.restore(); c.globalAlpha = 1
  }
  // banners
  const banners = Math.min(4, Math.floor(s.levels / 15))
  for (let i = 0; i < banners; i++) {
    const x = [160, 840, 330, 670][i], sway = Math.sin(t * 1.5 + i) * 3
    rect(c, x - 22, 40, 44, 6, '#8a6a3a')
    poly(c, [[x - 18, 46], [x + 18, 46], [x + 18 + sway, 150], [x + sway, 136], [x - 18 + sway, 150]], '#8f1830')
    poly(c, [[x - 10, 70], [x, 60], [x + 10, 70], [x, 96]], '#f2c14e')
  }
  // coffins (one per conquered city, up to 6)
  for (let i = 0; i < Math.min(6, s.cleared); i++) {
    const x = i < 3 ? 120 + i * 46 : 790 + (i - 3) * 46, y = 318
    poly(c, [[x - 12, y - 40], [x + 12, y - 40], [x + 17, y - 22], [x + 10, y + 10], [x - 10, y + 10], [x - 17, y - 22]], '#3a2330')
    rect(c, x - 2, y - 30, 4, 24, '#b88a4a'); rect(c, x - 8, y - 22, 16, 4, '#b88a4a')
  }
  // blood fountain
  if (s.levels >= 25) {
    const x = 240, y = 336
    c.fillStyle = '#3a2540'; c.beginPath(); c.ellipse(x, y, 80, 26, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#7a0a22'; c.beginPath(); c.ellipse(x, y - 4, 68, 19, 0, 0, Math.PI * 2); c.fill()
    for (let r = 0; r < 3; r++) { const k = ((t * 0.6 + r / 3) % 1); c.strokeStyle = `rgba(255,90,120,${1 - k})`; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y - 4, 14 + k * 50, 4 + k * 14, 0, 0, Math.PI * 2); c.stroke() }
    rect(c, x - 8, y - 70, 16, 66, '#4a3052'); c.fillStyle = '#e0183a'
    for (let i = 0; i < 6; i++) { const k = (t * 1.4 + i / 6) % 1; c.fillRect(x - 12 + i * 4 + Math.sin(i) * 3, y - 72 + k * 60, 3, 6) }
  }
  // gold pile from shinies
  if (s.shinies > 0) {
    const n = Math.min(24, 3 + s.shinies)
    for (let i = 0; i < n; i++) { const x = 730 + (i * 17) % 90, y = 345 - Math.floor(i / 6) * 7; poly(c, [[x - 5, y], [x, y - 8], [x + 5, y]], i % 3 ? '#f2c14e' : '#ffe38a') }
  }
  // throne + master vampire
  const tx = 500, ty = 318
  poly(c, [[tx - 50, ty], [tx - 50, ty - 110], [tx - 30, ty - 140], [tx, ty - 120], [tx + 30, ty - 140], [tx + 50, ty - 110], [tx + 50, ty]], '#2a1830')
  poly(c, [[tx - 40, ty], [tx - 40, ty - 100], [tx, ty - 112], [tx + 40, ty - 100], [tx + 40, ty]], '#6b1026')
  rect(c, tx - 56, ty - 6, 112, 14, '#3b2540')
  if (ready(sprites.vampires)) c.drawImage(sprites.vampires, (Math.floor(t * 3) % 3) * 112, s.era * 112, 112, 112, tx - 60, ty - 118, 120, 127)
  // candles
  const candles = Math.min(14, 2 + Math.floor(s.levels / 6))
  for (let i = 0; i < candles; i++) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2)
    const x = 500 + side * (95 + k * 52), y = 300 + (k % 2) * 34
    rect(c, x - 3, y - 18, 6, 18, '#efe4cf')
    const f = Math.sin(t * 12 + i * 2) * 1.5
    c.globalCompositeOperation = 'lighter'; glow(c, x, y - 24, 30, 'rgba(255,170,90,0.45)')
    c.fillStyle = '#ffb030'; c.beginPath(); c.ellipse(x, y - 24 + f * 0.3, 3, 7 + f, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#fff4c0'; c.beginPath(); c.ellipse(x, y - 22, 1.5, 3.5, 0, 0, Math.PI * 2); c.fill()
    c.globalCompositeOperation = 'source-over'
  }
  // bats
  const bats = Math.min(20, Math.floor(s.levels / 12) + s.echoes * 3)
  for (let i = 0; i < bats; i++) {
    const a = t * (0.5 + (i % 4) * 0.12) + i * 1.7
    drawBat(c, 500 + Math.cos(a) * (220 + (i % 5) * 40), 150 + Math.sin(a * 1.3) * 70, 1.2, t + i * 0.31, '#140814')
  }
  // vignette
  const v = c.createRadialGradient(500, 300, 200, 500, 300, 640)
  v.addColorStop(0, '#0000'); v.addColorStop(1, '#07030acc')
  c.fillStyle = v; c.fillRect(0, 0, W, H)
  c.setTransform(1, 0, 0, 1, 0, 0)
}

void fire
