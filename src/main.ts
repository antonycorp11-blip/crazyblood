import './style.css'
import { CITIES, ERAS, PACTS, RESOURCES, type PactId, type Resource } from './game/data'
import { Hunt, fmtShort } from './game/hunt'
import { bankNight, type NightReport } from './game/night-end'
import { affordableCount, buyNode, canBuy, isMaxed, isRevealed, priceOf, rollPacts } from './game/progress'
import { level, load, persist, resetSave, type Save } from './game/save'
import { NODES, NODE_BY_ID, computeStats, describe, type TreeNode } from './game/tree'
import { drawHunt } from './render/world'
import { drawLair, lairState } from './render/lair'
import { camera, huntCamera } from './viewport'
import { ambience, setIntensity, sfx, setMuted, unlockAudio } from './sound'

const app = document.querySelector<HTMLDivElement>('#app')!
if (location.search.includes('reset')) { resetSave(); history.replaceState(null, '', location.pathname) }
let save: Save = load()
setMuted(save.muted)
type Screen = 'lair' | 'hunt' | 'tree'
let screen: Screen = 'lair'
let hunt: Hunt | null = null
let report: NightReport | null = null
let offeredPacts: PactId[] = []
let selectedNode = 'root'
let pan = { x: 0, y: 0, zoom: 1 }
let lastFrame = performance.now(), lastHud = 0

const fmt = (n: number) => fmtShort(Math.floor(n))
const city = () => CITIES[save.city]

// ───────────────────────── small view helpers
const resIcon = (r: Resource, cls = '') => `<i class="res-ico ri-${r} ${cls}" aria-hidden="true"></i>`
const skillIcon = (index: number, cls = '') => `<span class="skill-ico ${cls}" style="--ix:${index % 6};--iy:${Math.floor(index / 6)}" aria-hidden="true"></span>`
const wallet = () => `<div class="wallet">${(Object.keys(RESOURCES) as Resource[]).filter((r) => r === 'blood' || save.res[r] > 0 || NODES.some((n) => n.res === r && isRevealed(save, n))).map((r) => `<span class="gem gem-${r}" title="${RESOURCES[r].name}">${resIcon(r)}<b id="res-${r}">${fmt(save.res[r])}</b></span>`).join('')}</div>`

// ───────────────────────── LAIR (home)
function lairView() {
  const c = city(), era = ERAS[c.era]
  const eraCities = CITIES.filter((x) => x.era === c.era)
  const medals = eraCities.map((x) => {
    const locked = x.index > save.unlocked, cleared = save.cleared[x.index]
    return `<button class="medal ${x.index === save.city ? 'current' : ''} ${cleared ? 'cleared' : ''}" data-city="${x.index}" ${locked ? 'disabled' : ''} aria-label="${x.name}">${cleared ? '☠' : locked ? '✕' : x.slot + 1}</button>`
  }).join('<i class="medal-link"></i>')
  const pact = save.pact ? `<div class="pact-badge">${skillIcon(PACTS[save.pact].icon)}<span><b>${PACTS[save.pact].name}</b> ${PACTS[save.pact].text}</span></div>` : ''
  const afford = affordableCount(save)
  const needed = Math.ceil(c.terror * (1 - Math.min(60, computeStats(save.levels).terrorPct) / 100))
  return `
  <div class="logo"><span class="logo-crazy">Crazy</span><span class="logo-blood">Blood</span><small>as eras da caçada</small></div>
  ${wallet()}
  <button class="round-btn sound-btn" data-action="mute" aria-label="Som">${save.muted ? '♪̸' : '♪'}</button>
  <div class="lair-panel frame">
    <div class="era-ribbon" style="--era:${era.color}">${era.name} · ${era.years}</div>
    <h1 class="city-title">${c.name}</h1>
    <div class="boss-line">${save.cleared[c.index] ? '☠ Chefe derrotado — cace à vontade' : `Chefe <b>${c.boss}</b> surge após <b>${needed}</b> capturas numa noite`}</div>
    <div class="medals">${medals}</div>
    ${pact}
    <div class="lair-actions">
      <button class="big-btn tree-btn" data-action="tree">${skillIcon(6)}<span>ÁRVORE</span>${afford ? `<em class="badge">${afford}</em>` : ''}</button>
      <button class="big-btn hunt-btn" data-action="hunt"><span class="hunt-label">CAÇAR</span><small>${save.nights === 0 ? 'a primeira noite' : 'noite ' + (save.nights + 1)}</small></button>
    </div>
  </div>`
}

// ───────────────────────── HUNT
function huntView() {
  const c = city()
  const touch = matchMedia('(pointer: coarse)').matches
  return `
  <div class="hunt-top">
    <div class="moon-clock"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" class="track"/><circle cx="32" cy="32" r="27" class="fill" id="moon-arc"/></svg><b id="time">12</b></div>
    <div class="terror"><span id="terror-label">TERROR</span><div class="terror-bar"><i id="terror-fill"></i></div></div>
  </div>
  <div class="hunt-left"><div class="captures"><b id="caps">0</b><span>capturas</span></div><div class="combo" id="combo"></div></div>
  <div class="hunt-loot">${(['blood', 'teeth', 'shard', 'pure'] as Resource[]).map((r) => `<span class="loot-line" id="loot-${r}-wrap" ${r === 'blood' ? '' : 'hidden'}>${resIcon(r)}<b id="loot-${r}">0</b></span>`).join('')}</div>
  <button class="round-btn flee-btn" data-action="flee" aria-label="Encerrar noite">✕</button>
  <div class="banner" id="banner"></div>
  <div class="joy" id="joy"><i id="joy-knob"></i></div>
  <button class="bite-btn" id="bite-btn" aria-label="Morder"><b>MORDER</b></button>
  ${save.nights < 3 ? `<div class="hint">${touch ? 'Joystick para correr · MORDER para golpe forte' : 'Passe o mouse sobre os humanos · clique para morder'}<small>Recolha o loot brilhante antes que ele suma</small></div>` : ''}
  <div class="pact-mini">${save.pact ? skillIcon(PACTS[save.pact].icon) + PACTS[save.pact].name : c.name}</div>`
}

function updateHud() {
  if (!hunt) return
  const set = (id: string, v: string) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v }
  // during the duel the moon clock becomes the werewolf's escape timer
  const d = hunt.duel
  set('time', String(Math.ceil(d ? Math.max(0, d.timer) : hunt.remaining)))
  document.querySelector('.moon-clock')?.classList.toggle('duel', !!d)
  document.querySelector('.game')?.classList.toggle('in-duel', !!d)
  const arc = document.getElementById('moon-arc'); if (arc) arc.style.strokeDashoffset = String(170 * (1 - (d ? Math.max(0, d.timer) / d.max : hunt.remaining / hunt.duration)))
  set('caps', fmt(hunt.captures))
  const combo = document.getElementById('combo')
  if (combo) { const txt = hunt.combo >= 5 ? `×${hunt.combo} COMBO` : ''; if (combo.textContent !== txt) { combo.textContent = txt; combo.classList.remove('bump'); void combo.offsetWidth; combo.classList.add('bump') } }
  for (const r of ['blood', 'teeth', 'shard', 'pure'] as Resource[]) {
    set('loot-' + r, fmt(hunt.loot[r]))
    const wrap = document.getElementById(`loot-${r}-wrap`); if (wrap && hunt.loot[r] > 0) wrap.hidden = false
  }
  const fill = document.getElementById('terror-fill'), bar = document.querySelector('.terror')
  if (fill && bar) {
    if (hunt.boss) {
      bar.classList.add('boss-mode')
      fill.style.width = (100 * Math.max(0, hunt.boss.hp / hunt.boss.maxHp)) + '%'
      set('terror-label', `☠ ${hunt.city.boss.toUpperCase()} · ${fmt(hunt.boss.hp)}`)
    } else if (hunt.bossEscaped) {
      bar.classList.remove('boss-mode'); fill.style.width = '0%'; set('terror-label', `☠ ${hunt.city.boss.toUpperCase()} FUGIU`)
    } else if (hunt.bossKilled) {
      bar.classList.remove('boss-mode'); bar.classList.add('boss-dead'); fill.style.width = '100%'; set('terror-label', '☠ CHEFE DERROTADO')
    } else {
      fill.style.width = Math.min(100, (hunt.terror / hunt.terrorNeeded) * 100) + '%'
      set('terror-label', `TERROR ${hunt.terror} / ${hunt.terrorNeeded}`)
    }
  }
}

function banner(text: string, kind = '') {
  const b = document.getElementById('banner'); if (!b) return
  b.innerHTML = text; b.className = 'banner ' + kind
  void b.offsetWidth; b.classList.add('show')
}

// ───────────────────────── RESULT
function resultView(r: NightReport) {
  const h = hunt!
  const title = r.outcome === 'victory' ? 'ECLIPSE TOTAL' : h.bossKilled ? 'CHEFE DERROTADO' : 'AMANHECER'
  const sub = r.outcome === 'era' ? `Nova era desperta: <b>${ERAS[CITIES[save.city].era].name}</b> · Eco +1 (×1,3 dano e sangue)` : r.outcome === 'city' ? `${h.city.name} caiu. Próxima cidade: <b>${city().name}</b>` : r.outcome === 'victory' ? 'A história inteira pertence aos vampiros.' : h.bossSpawned ? `${h.city.boss} fugiu do duelo. Fique mais forte e volte.` : `O chefe surge com <b>${h.terrorNeeded}</b> capturas numa noite.`
  const lootRows = (['blood', 'teeth', 'shard', 'pure'] as Resource[]).filter((k) => r.total[k] >= 1).map((k) => `<div class="loot-row">${resIcon(k)}<span>${RESOURCES[k].name}</span><b class="count" data-to="${Math.floor(r.total[k])}">0</b></div>`).join('')
  const dice = r.dice.faces.map((f, i) => `<div class="die rolling" style="--d:${i * 0.12}s" data-face="${f}">${pips(1 + ((f + i) % 6))}</div>`).join('')
  const pacts = offeredPacts.map((p) => `<button class="pact-card" data-pact="${p}">${skillIcon(PACTS[p].icon)}<b>${PACTS[p].name}</b><span>${PACTS[p].text}</span></button>`).join('')
  const afford = affordableCount(save)
  return `<div class="overlay"><div class="result frame">
    <div class="result-title ${h.bossKilled ? 'win' : ''}">${title}</div>
    <p class="result-sub">${sub}</p>
    <div class="result-stats"><div><b>${fmt(h.captures)}</b><span>capturas</span></div><div><b>×${h.bestCombo}</b><span>combo</span></div><div><b>${h.crits}</b><span>críticos</span></div><div><b>${h.shinies}</b><span>shiny</span></div></div>
    <div class="result-body">
      <div class="loot-table">${lootRows}</div>
      <div class="dice-zone"><div class="zone-title">DADOS DE SANGUE</div><div class="dice">${dice}</div><div class="dice-labels">${r.dice.labels.map((l) => `<span>${l}</span>`).join('')}</div></div>
    </div>
    ${pacts ? `<div class="pact-zone"><div class="zone-title">ESCOLHA UM PACTO PARA A PRÓXIMA NOITE</div><div class="pacts">${pacts}</div></div>` : ''}
    <div class="result-actions"><button class="big-btn tree-btn small" data-action="tree">${skillIcon(6)}<span>ÁRVORE</span>${afford ? `<em class="badge">${afford}</em>` : ''}</button><button class="big-btn hunt-btn small" data-action="hunt"><span class="hunt-label">CAÇAR</span></button></div>
    <button class="link-btn" data-action="lair">voltar ao covil</button>
  </div></div>`
}
function pips(f: number) {
  const layout: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
  return Array.from({ length: 9 }, (_, i) => `<i class="${layout[f].includes(i) ? 'on' : ''}"></i>`).join('')
}
function animateResult() {
  document.querySelectorAll<HTMLElement>('.count').forEach((el) => {
    const to = Number(el.dataset.to), start = performance.now()
    const step = (now: number) => { const k = Math.min(1, (now - start) / 900); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step) }
    requestAnimationFrame(step)
  })
  document.querySelectorAll<HTMLElement>('.die').forEach((die, i) => {
    let spins = 0
    const face = Number(die.dataset.face), stop = 8 + i * 3
    const iv = setInterval(() => {
      spins++
      die.innerHTML = pips(spins >= stop ? face : 1 + Math.floor(Math.random() * 6))
      if (spins % 2) sfx('dice')
      if (spins >= stop) { clearInterval(iv); die.classList.remove('rolling'); die.classList.add('landed'); if (i === document.querySelectorAll('.die').length - 1) { document.querySelector('.dice-labels')?.classList.add('show'); sfx('pickup') } }
    }, 70)
  })
}

// ───────────────────────── TREE
const SPACING = 92
function treeView() {
  const owned = (n: TreeNode) => level(save, n.id) > 0
  const shown = NODES.filter((n) => isRevealed(save, n))
  const teasers = NODES.filter((n) => !isRevealed(save, n) && n.parent && isRevealed(save, NODE_BY_ID[n.parent]))
  const links = [...shown, ...teasers].filter((n) => n.parent).map((n) => {
    const p = NODE_BY_ID[n.parent!]
    return `<line x1="${p.x * SPACING}" y1="${p.y * SPACING}" x2="${n.x * SPACING}" y2="${n.y * SPACING}" class="${owned(n) ? 'lit' : isRevealed(save, n) ? 'open' : 'fog'} res-${n.res}"/>`
  }).join('')
  const nodes = shown.map((n) => {
    const lv = level(save, n.id)
    const cls = [owned(n) ? 'owned' : '', isMaxed(save, n) ? 'maxed' : '', canBuy(save, n) ? 'affordable' : '', n.keystone ? 'keystone' : '', n.infinite ? 'infinite' : '', selectedNode === n.id ? 'selected' : ''].join(' ')
    return `<button class="tnode res-${n.res} ${cls}" style="left:${n.x * SPACING}px;top:${n.y * SPACING}px" data-node="${n.id}" aria-label="${n.name}">${skillIcon(n.icon)}${lv ? `<em>${n.infinite ? lv : lv + '/' + n.max}</em>` : ''}</button>`
  }).join('')
  const fog = teasers.map((n) => `<div class="tnode fog" style="left:${n.x * SPACING}px;top:${n.y * SPACING}px">?</div>`).join('')
  return `
  <div class="tree-sky"></div>
  <div class="tree-view" id="tree-view"><div class="tree-world" id="tree-world" style="transform:translate(${pan.x}px,${pan.y}px) scale(${pan.zoom})">
    <svg class="tree-links" viewBox="-900 -900 1800 1800" width="1800" height="1800">${links}</svg>${fog}${nodes}
  </div></div>
  <div class="tree-top"><button class="round-btn" data-action="lair" aria-label="Covil">◂</button><div class="tree-title">Árvore de Sangue</div>${wallet()}<button class="big-btn hunt-btn tiny" data-action="hunt"><span class="hunt-label">CAÇAR</span></button></div>
  <div class="zoom-btns"><button class="round-btn" data-action="zoom-in" aria-label="Aproximar">+</button><button class="round-btn" data-action="zoom-out" aria-label="Afastar">−</button><button class="round-btn" data-action="center" aria-label="Centralizar">◎</button></div>
  <div class="node-sheet frame" id="node-sheet">${nodeSheet()}</div>`
}
function nodeSheet() {
  const n = NODE_BY_ID[selectedNode] ?? NODES[0]
  const lv = level(save, n.id), maxed = isMaxed(save, n), price = priceOf(save, n)
  const can = canBuy(save, n)
  const now = lv ? describe(n, lv) : 'Ainda não despertado'
  const next = maxed ? 'Nível máximo' : describe(n, lv + 1)
  return `${skillIcon(n.icon, 'big')}
  <div class="sheet-text"><div class="sheet-tag res-${n.res}">${n.keystone ? 'PODER ÚNICO' : n.infinite ? `INFINITO · NÍVEL ${lv}` : `NÍVEL ${lv}/${n.max}`}</div><h2>${n.name}</h2><p class="now">${now}</p>${maxed ? '' : `<p class="next">▸ ${next}</p>`}</div>
  <div class="sheet-buy">${maxed ? '<div class="maxed-tag">MÁXIMO</div>' : `<button class="big-btn buy-btn ${can ? '' : 'poor'}" data-action="buy" ${can ? '' : 'disabled'}>${resIcon(n.res)}<span>${fmt(price)}</span></button><button class="link-btn" data-action="buy-max" ${can ? '' : 'disabled'}>comprar máximo</button>`}</div>`
}

// ───────────────────────── render + canvas
function render() {
  app.innerHTML = `<div class="game screen-${screen}"><canvas id="stage"></canvas><div class="ui">${screen === 'lair' ? lairView() : screen === 'hunt' ? huntView() : treeView()}</div>${report ? resultView(report) : ''}</div>`
  ambience(screen === 'hunt' && !report ? (hunt?.duel ? 'boss' : 'hunt') : 'lair')
  if (report) animateResult()
  if (screen === 'tree') bindTree()
  paint(performance.now() / 1000)
}

function paint(t: number) {
  const canvas = document.querySelector<HTMLCanvasElement>('#stage'); if (!canvas || screen === 'tree') return
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(1.5, devicePixelRatio || 1)
  const w = Math.round(rect.width * ratio), h = Math.round(rect.height * ratio)
  if (!w || !h) return
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  const c = canvas.getContext('2d')!
  if (screen === 'hunt' && hunt) { hunt.setViewport(rect.width, rect.height); drawHunt(c, hunt, t); return }
  // landscape phones put the lair menu on the right: keep the throne in the free space on the left
  const panel = document.querySelector('.lair-panel')?.getBoundingClientRect()
  const side = panel && panel.left - rect.left > rect.width * 0.3 && panel.top - rect.top < rect.height * 0.5
  drawLair(c, lairState(save), t, side ? ((panel.left - rect.left) / 2) * ratio : undefined)
}

function toWorld(clientX: number, clientY: number) {
  const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
  const r = canvas.getBoundingClientRect(), cam = screen === 'hunt' ? huntCamera(r.width, r.height) : camera(r.width, r.height)
  return { x: (clientX - r.left - cam.x) / cam.scale, y: (clientY - r.top - cam.y) / cam.scale }
}

// ───────────────────────── flow
function startHunt() {
  report = null
  const canvas = document.querySelector<HTMLCanvasElement>('#stage')
  const rect = canvas?.getBoundingClientRect()
  hunt = new Hunt(save, rect ? { width: rect.width, height: rect.height } : undefined)
  screen = 'hunt'
  joy = null; keys.clear()
  if (matchMedia('(pointer: coarse)').matches) hunt.auraOn = true
  sfx('start')
  render()
}

function endHunt() {
  if (!hunt || report) return
  hunt.finish()
  report = bankNight(save, hunt)
  const choices = 3 + Math.floor(computeStats(save.levels).pactChoices)
  offeredPacts = save.nights >= 2 ? rollPacts(choices) : []
  sfx(hunt.bossKilled ? 'bosskill' : 'dawn')
  render()
}

// ───────────────────────── tree pan / zoom
function applyPan() { const world = document.getElementById('tree-world'); if (world) world.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${pan.zoom})` }
function bindTree() {
  const view = document.getElementById('tree-view')!
  if (pan.x === 0 && pan.y === 0) { pan.x = view.clientWidth / 2; pan.y = view.clientHeight * 0.4 }
  applyPan()
  const pointers = new Map<number, { x: number; y: number }>()
  let pinch = 0, moved = 0
  view.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0 })
  view.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId); if (!prev) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch) pan.zoom = Math.max(0.45, Math.min(1.8, pan.zoom * d / pinch))
      pinch = d
    } else { pan.x += e.clientX - prev.x; pan.y += e.clientY - prev.y; moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) }
    applyPan()
  })
  const up = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0 }
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up); view.addEventListener('pointerleave', up)
  view.addEventListener('wheel', (e) => { e.preventDefault(); pan.zoom = Math.max(0.45, Math.min(1.8, pan.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); applyPan() }, { passive: false })
  view.addEventListener('click', (e) => { if (moved > 8) { e.stopPropagation(); e.preventDefault() } }, true)
}
function refreshTree() {
  const keep = { ...pan }
  render()
  pan = keep
  applyPan()
}

// ───────────────────────── input
app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action],[data-city],[data-node],[data-pact]')
  if (!el || (el as HTMLButtonElement).disabled) return
  if (el.dataset.city) { save.city = Number(el.dataset.city); persist(save); sfx('click'); render(); return }
  if (el.dataset.node) { selectedNode = el.dataset.node; sfx('click'); refreshTree(); return }
  if (el.dataset.pact) {
    save.pact = el.dataset.pact as PactId; persist(save); sfx('pact')
    document.querySelectorAll('.pact-card').forEach((c) => c.classList.toggle('chosen', c === el))
    return
  }
  switch (el.dataset.action) {
    case 'hunt': startHunt(); break
    case 'flee': endHunt(); break
    case 'tree': report = null; screen = 'tree'; sfx('click'); render(); break
    case 'lair': report = null; hunt = null; screen = 'lair'; sfx('click'); render(); break
    case 'mute': save.muted = !save.muted; setMuted(save.muted); persist(save); render(); break
    case 'buy': if (buyNode(save, selectedNode)) { sfx('buy'); refreshTree(); document.querySelector(`[data-node="${selectedNode}"]`)?.classList.add('just-bought') } break
    case 'buy-max': { let k = 0; while (k < 500 && buyNode(save, selectedNode)) k++; if (k) { sfx('buy'); refreshTree(); document.querySelector(`[data-node="${selectedNode}"]`)?.classList.add('just-bought') } break }
    case 'zoom-in': pan.zoom = Math.min(1.8, pan.zoom * 1.2); applyPan(); break
    case 'zoom-out': pan.zoom = Math.max(0.45, pan.zoom / 1.2); applyPan(); break
    case 'center': pan = { x: 0, y: 0, zoom: 1 }; render(); break
  }
})

// Input — mouse: the vampire chases the cursor, click bites. Touch: floating joystick + bite button.
const JOY_R = 56
let joy: { id: number; ox: number; oy: number } | null = null
function setJoyVisual(x?: number, y?: number, kx = 0, ky = 0) {
  const base = document.getElementById('joy'), knob = document.getElementById('joy-knob'); if (!base || !knob) return
  base.classList.toggle('active', x !== undefined)
  base.style.left = x === undefined ? '' : x + 'px'; base.style.top = y === undefined ? '' : y + 'px'
  knob.style.transform = `translate(${kx * JOY_R}px, ${ky * JOY_R}px)`
}
function biteNow() { if (!hunt || report) return; hunt.tap(); navigator.vibrate?.(12) }
app.addEventListener('pointerdown', (e) => {
  if (screen !== 'hunt' || !hunt || report) return
  unlockAudio()
  const target = e.target as HTMLElement
  if (target.closest('#bite-btn')) { e.preventDefault(); target.closest('#bite-btn')!.classList.add('press'); biteNow(); return }
  if (!(e.target instanceof HTMLCanvasElement)) return
  e.preventDefault()
  if (e.pointerType === 'mouse') { const p = toWorld(e.clientX, e.clientY); hunt.setAura(p.x, p.y, true); biteNow(); return }
  if (joy) return
  const r = app.getBoundingClientRect()
  joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY }
  setJoyVisual(e.clientX - r.left, e.clientY - r.top)
  hunt.steer(0, 0)
})
app.addEventListener('pointermove', (e) => {
  if (screen !== 'hunt' || !hunt || report) return
  if (joy && e.pointerId === joy.id) {
    let dx = (e.clientX - joy.ox) / JOY_R, dy = (e.clientY - joy.oy) / JOY_R
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l }
    const r = app.getBoundingClientRect()
    setJoyVisual(joy.ox - r.left, joy.oy - r.top, dx, dy)
    if (l < 0.15) hunt.steer(0, 0); else hunt.steer(dx, dy)
    return
  }
  if (e.pointerType !== 'mouse') return
  const p = toWorld(e.clientX, e.clientY)
  hunt.setAura(p.x, p.y, e.target instanceof HTMLCanvasElement)
})
const release = (e: PointerEvent) => {
  document.getElementById('bite-btn')?.classList.remove('press')
  if (joy && e.pointerId === joy.id) { joy = null; setJoyVisual(); hunt?.steer(0, 0) }
}
window.addEventListener('pointerup', release)
window.addEventListener('pointerdown', unlockAudio, { capture: true })
window.addEventListener('pointercancel', release)
// keyboard: WASD / arrows run, space bites
const keys = new Set<string>()
const KEY_DIR: Record<string, [number, number]> = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] }
function keySteer() { if (!hunt) return; let x = 0, y = 0; for (const k of keys) { x += KEY_DIR[k][0]; y += KEY_DIR[k][1] } hunt.steer(x, y) }
window.addEventListener('keyup', (e) => { if (keys.delete(e.code)) keySteer() })
window.addEventListener('keydown', (e) => {
  if (screen !== 'hunt' || !hunt || report) return
  if (KEY_DIR[e.code] && !keys.has(e.code)) { keys.add(e.code); keySteer(); e.preventDefault() }
  if (e.code === 'Space') { e.preventDefault(); biteNow() }
})
window.addEventListener('keydown', (e) => { if (e.code === 'Space' && screen !== 'hunt') { e.preventDefault(); startHunt() } })
document.addEventListener('visibilitychange', () => persist(save))
window.addEventListener('resize', () => { if (screen === 'tree') refreshTree() })

function frame(now: number) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now
  if (screen === 'hunt' && hunt && !report) {
    hunt.update(dt)
    setIntensity(hunt.elapsed / hunt.duration)
    ambience(hunt.duel ? 'boss' : 'hunt')
    for (const s of hunt.sounds) {
      sfx(s, hunt.combo)
      if (s === 'boss') banner(`☠ DUELO<small>${hunt.city.boss} · desvie das marcas vermelhas</small>`, 'boss')
      if (s === 'escape') banner(`${hunt.city.boss.toUpperCase()} FUGIU`, 'boss')
      if (s === 'hurt') navigator.vibrate?.(60)
      if (s === 'bosskill') banner('CHEFE DERROTADO!', 'gold')
      if (s === 'shiny') banner('✦ HUMANO SHINY ✦', 'gold')
      if (s === 'combo') banner(['', 'FRENESI', 'MASSACRE', 'CARNIFICINA', 'BANQUETE', 'APOCALIPSE', 'ECLIPSE'][[10, 25, 50, 100, 200, 400].indexOf(hunt.comboMark) + 1] + ` ×${hunt.comboMark}`, 'combo')
      if (s === 'pickup' || s === 'pure') { const el = document.querySelector('.hunt-loot'); el?.classList.remove('bump'); void (el as HTMLElement | null)?.offsetWidth; el?.classList.add('bump') }
    }
    hunt.sounds.length = 0
    if (now - lastHud > 90) { updateHud(); lastHud = now }
    if (hunt.ended) endHunt()
  }
  if (screen !== 'tree') paint(now / 1000)
  requestAnimationFrame(frame)
}

render()
requestAnimationFrame(frame)

// Dev-only handle for testing from the console (never in production builds).
if (import.meta.env.DEV) (window as unknown as { __cb: unknown }).__cb = { get save() { return save }, get hunt() { return hunt }, render, persist: () => persist(save) }
