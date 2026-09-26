// The Blood Tree: a web of ~90 nodes on a grid around the root. Buying a node reveals its neighbours.
// Every node changes one stat; stats are summed here and read by the hunt.
import type { Resource } from './data'

export type Stat =
  | 'auraDmg' | 'auraPct' | 'auraRate' | 'auraRadius' | 'critChance' | 'critMult' | 'biteDmg' | 'biteRadius'
  | 'nightTime' | 'maxPop' | 'spawnPct' | 'weaken' | 'bloodPct' | 'vialChance' | 'teethChance' | 'shardChance'
  | 'lootPct' | 'magnet' | 'dropLife' | 'shinyChance' | 'shinyValue' | 'explodeChance' | 'explodeDmg' | 'chain'
  | 'bats' | 'batDmg' | 'batRate' | 'bossDmg' | 'terrorPct' | 'dice' | 'reroll' | 'pactChoices' | 'comboDmg'
  | 'dmgMult' | 'bloodMult' | 'moveSpeed'

export interface TreeNode {
  id: string
  name: string
  icon: number
  x: number
  y: number
  parent?: string
  res: Resource
  cost: number
  growth: number
  max: number
  stat: Stat
  value: number
  /** One-level nodes that add a new mechanic get a special frame. */
  keystone?: boolean
  /** Repeatable forever (the late-game sink). */
  infinite?: boolean
}

const STAT_TEXT: Record<Stat, (v: number) => string> = {
  auraDmg: (v) => `+${v} de dano da aura`,
  auraPct: (v) => `+${v}% de dano`,
  auraRate: (v) => `+${v}% de velocidade da aura`,
  auraRadius: (v) => `+${v} de alcance da aura`,
  critChance: (v) => `+${v}% de chance de crítico`,
  critMult: (v) => `+${v * 100}% de dano crítico`,
  biteDmg: (v) => `Mordida (toque) causa +${v}× dano`,
  biteRadius: (v) => `+${v} de área da mordida`,
  nightTime: (v) => `+${v} s de noite`,
  maxPop: (v) => `+${v} humanos na cidade`,
  spawnPct: (v) => `+${v}% de humanos chegando`,
  weaken: (v) => `Humanos com ${v}% menos vida`,
  bloodPct: (v) => `+${v}% de sangue por captura`,
  vialChance: (v) => `+${v}% de chance de frasco (5× sangue)`,
  teethChance: (v) => `+${v}% de chance de dente de ouro`,
  shardChance: (v) => `+${v}% de chance de fragmento`,
  lootPct: (v) => `+${v}% no valor de todo loot`,
  magnet: (v) => `+${v} de alcance para recolher loot`,
  dropLife: (v) => `Loot dura +${v} s no chão`,
  shinyChance: (v) => `+${v}% de humanos shiny`,
  shinyValue: (v) => `Shiny rendem +${v}× loot`,
  explodeChance: (v) => `+${v}% de chance da captura explodir`,
  explodeDmg: (v) => `Explosões causam +${v}× dano`,
  chain: () => `Explosões podem gerar novas explosões`,
  bats: (v) => `+${v} morcego${v > 1 ? 's' : ''} caçando com você`,
  batDmg: (v) => `Morcegos +${v}% de dano`,
  batRate: (v) => `Morcegos atacam ${v}% mais rápido`,
  bossDmg: (v) => `+${v}% de dano no chefe`,
  terrorPct: (v) => `Chefe surge com ${v}% menos capturas`,
  dice: (v) => `+${v} dado de sangue no fim da noite`,
  reroll: (v) => `Rerrola ${v} dado baixo`,
  pactChoices: (v) => `+${v} opção de pacto`,
  comboDmg: (v) => `+${v}% de dano a cada 10 de combo`,
  dmgMult: (v) => `Dano ×${round(Math.pow(1.12, v))} (acumula sem limite)`,
  moveSpeed: (v) => `+${v} de velocidade de movimento`,
  bloodMult: (v) => `Sangue ×${round(Math.pow(1.1, v))} (acumula sem limite)`,
}

export function describe(node: TreeNode, levels = 1) {
  return STAT_TEXT[node.stat](round(node.value * levels))
}
const round = (v: number) => Math.round(v * 100) / 100

// [id, name, icon, x, y, parent, res, cost, max, stat, value, growth?]
type Row = [string, string, number, number, number, string | undefined, Resource, number, number, Stat, number, number?]
const ROWS: Row[] = [
  ['root', 'Primeira Mordida', 6, 0, 0, undefined, 'blood', 3, 999, 'dmgMult', 1, 1.42],
  // ── Up: fangs, damage and criticals (blood)
  ['fang1', 'Presas Afiadas', 6, 0, -1, 'root', 'blood', 6, 10, 'auraPct', 25],
  ['crit1', 'Olhar Rubro', 10, -1, -1, 'fang1', 'blood', 12, 10, 'critChance', 3],
  ['critm1', 'Veia Aberta', 7, 1, -1, 'fang1', 'blood', 15, 8, 'critMult', 0.3],
  ['rate1', 'Sede Veloz', 14, 0, -2, 'fang1', 'blood', 25, 8, 'auraRate', 12],
  ['dmg2', 'Presas de Ferro', 6, 0, -3, 'rate1', 'blood', 120, 10, 'auraDmg', 4],
  ['crit2', 'Olho do Predador', 10, -1, -3, 'dmg2', 'blood', 300, 8, 'critChance', 4],
  ['critm2', 'Hemorragia', 7, 1, -3, 'dmg2', 'blood', 380, 8, 'critMult', 0.5],
  ['combo1', 'Frenesi', 19, 0, -4, 'dmg2', 'blood', 900, 6, 'comboDmg', 6, 1.7],
  ['dmg3', 'Presas Ancestrais', 6, 0, -5, 'combo1', 'shard', 8, 8, 'auraPct', 60],
  ['critm3', 'Golpe Mortal', 11, 1, -5, 'dmg3', 'shard', 14, 6, 'critMult', 0.8],
  ['crit3', 'Mil Olhos', 10, -1, -5, 'dmg3', 'shard', 14, 6, 'critChance', 5],
  ['dmg4', 'Fome Eterna', 5, 0, -6, 'dmg3', 'pure', 1, 5, 'auraPct', 80, 2],
  ['rate2', 'Pulso Febril', 14, 1, -4, 'critm2', 'blood', 1500, 6, 'auraRate', 15],
  ['weak1', 'Medo Paralisante', 1, -1, -4, 'crit2', 'blood', 1200, 6, 'weaken', 6],
  ['weak2', 'Pavor Absoluto', 1, -2, -5, 'weak1', 'shard', 20, 5, 'weaken', 7],
  ['dmg5', 'Presas do Eclipse', 29, 0, -7, 'dmg4', 'pure', 6, 5, 'auraDmg', 80, 2.4],
  // ── Left: night length and the horde (blood)
  ['time1', 'Lua Tardia', 0, -1, 0, 'root', 'blood', 8, 8, 'nightTime', 2],
  ['pop1', 'Cheiro de Sangue', 26, -2, 0, 'time1', 'blood', 18, 10, 'maxPop', 6],
  ['spawn1', 'Sinos da Vila', 26, -2, -1, 'pop1', 'blood', 30, 10, 'spawnPct', 15],
  ['radius1', 'Aura Faminta', 25, -1, 1, 'time1', 'blood', 22, 10, 'auraRadius', 4],
  ['time2', 'Crepúsculo', 4, -3, 0, 'pop1', 'blood', 220, 6, 'nightTime', 3],
  ['pop2', 'Grande Horda', 26, -3, -1, 'time2', 'blood', 450, 10, 'maxPop', 4],
  ['spawn2', 'Festival Noturno', 26, -3, 1, 'time2', 'blood', 500, 8, 'spawnPct', 20],
  ['radius2', 'Névoa Rubra', 1, -2, 1, 'radius1', 'blood', 160, 8, 'auraRadius', 5],
  ['time3', 'Noite Sem Fim', 5, -4, 0, 'time2', 'shard', 10, 5, 'nightTime', 4],
  ['pop3', 'Êxodo', 17, -4, -1, 'time3', 'shard', 18, 8, 'maxPop', 8],
  ['spawn3', 'Chamado da Lua', 24, -4, 1, 'time3', 'shard', 18, 8, 'spawnPct', 20],
  ['radius3', 'Manto da Noite', 29, -3, 2, 'radius2', 'shard', 16, 6, 'auraRadius', 6],
  ['time4', 'Eclipse Eterno', 5, -5, 0, 'time3', 'pure', 2, 4, 'nightTime', 6, 2.4],
  ['pop4', 'Mar de Gente', 17, -5, -1, 'pop3', 'pure', 3, 5, 'maxPop', 15, 2.2],
  // ── Right: loot, gold teeth and shinies
  ['blood1', 'Colheita', 18, 1, 0, 'root', 'blood', 8, 999, 'bloodMult', 1, 1.5],
  ['vial1', 'Frascos', 18, 2, 0, 'blood1', 'blood', 20, 8, 'vialChance', 3],
  ['teeth1', 'Dentes de Ouro', 21, 2, 1, 'vial1', 'blood', 40, 1, 'teethChance', 8],
  ['magnet1', 'Ímã de Sangue', 19, 2, -1, 'vial1', 'blood', 35, 8, 'magnet', 15],
  ['teeth2', 'Garimpo', 21, 3, 1, 'teeth1', 'teeth', 4, 10, 'teethChance', 3],
  ['loot1', 'Olho Ganancioso', 23, 3, 0, 'vial1', 'teeth', 6, 10, 'lootPct', 20],
  ['life1', 'Sangue Espesso', 8, 3, -1, 'magnet1', 'teeth', 5, 6, 'dropLife', 1],
  ['shiny1', 'Brilho Dourado', 22, 4, 0, 'loot1', 'teeth', 15, 8, 'shinyChance', 0.15],
  ['shinyv1', 'Tesouro Vivo', 22, 4, 1, 'shiny1', 'teeth', 30, 6, 'shinyValue', 1],
  ['blood2', 'Safra Rubra', 18, 4, -1, 'loot1', 'teeth', 25, 10, 'bloodPct', 35],
  ['dice1', 'Dado de Osso', 20, 5, 0, 'shiny1', 'teeth', 40, 3, 'dice', 1, 2.2],
  ['reroll1', 'Dado Viciado', 20, 5, 1, 'dice1', 'teeth', 90, 2, 'reroll', 1, 2.5],
  ['pact1', 'Pacto Extra', 20, 5, -1, 'dice1', 'shard', 25, 2, 'pactChoices', 1, 2.5],
  ['magnet2', 'Gravidade Rubra', 19, 3, -2, 'life1', 'teeth', 20, 6, 'magnet', 25],
  ['loot2', 'Cofre do Conde', 23, 6, 0, 'dice1', 'shard', 30, 8, 'lootPct', 40],
  ['shiny2', 'Febre do Ouro', 22, 6, 1, 'loot2', 'pure', 2, 5, 'shinyChance', 0.3, 2.2],
  ['blood3', 'Banquete Real', 22, 6, -1, 'loot2', 'pure', 2, 6, 'bloodPct', 120, 2.2],
  // ── Down: bite, bats, explosions and the boss (shards)
  ['bite1', 'Mordida', 8, 0, 1, 'root', 'blood', 10, 10, 'biteDmg', 1],
  ['biter1', 'Mandíbula', 7, 1, 1, 'bite1', 'blood', 30, 6, 'biteRadius', 8],
  ['shard1', 'Relíquias', 3, -1, 2, 'bite1', 'blood', 60, 1, 'shardChance', 6],
  ['bats1', 'Morcegos', 12, 0, 2, 'bite1', 'blood', 80, 8, 'bats', 1, 1.9],
  ['batd1', 'Morcegos Vorazes', 13, 1, 2, 'bats1', 'shard', 3, 10, 'batDmg', 30],
  ['batr1', 'Revoada', 14, -1, 3, 'bats1', 'shard', 4, 8, 'batRate', 15],
  ['boom1', 'Estouro', 9, 0, 3, 'bats1', 'shard', 5, 10, 'explodeChance', 4],
  ['boomd1', 'Onda de Choque', 25, 1, 3, 'boom1', 'shard', 8, 8, 'explodeDmg', 1],
  ['chain1', 'Reação em Cadeia', 27, 1, 4, 'boomd1', 'shard', 60, 1, 'chain', 1],
  ['boss1', 'Caça ao Rei', 16, 0, 4, 'boom1', 'shard', 10, 10, 'bossDmg', 20],
  ['terror1', 'Terror', 11, -1, 4, 'boss1', 'shard', 12, 5, 'terrorPct', 6],
  ['shard2', 'Ossuário', 3, -2, 3, 'batr1', 'shard', 15, 8, 'shardChance', 3],
  ['bite2', 'Mordida Voraz', 8, 2, 2, 'batd1', 'shard', 12, 10, 'biteDmg', 1],
  ['bats2', 'Nuvem de Morcegos', 15, 0, 5, 'boss1', 'shard', 45, 6, 'bats', 2, 2],
  ['boss2', 'Regicida', 16, 1, 5, 'bats2', 'pure', 2, 6, 'bossDmg', 50, 2.2],
  ['boom2', 'Tempestade Rubra', 28, -1, 5, 'bats2', 'pure', 2, 6, 'explodeChance', 6, 2.2],
  ['batd2', 'Legião Alada', 17, 0, 6, 'bats2', 'pure', 3, 6, 'batDmg', 100, 2.2],
  // ── Diagonal bridges
  ['bridge1', 'Caçada Longa', 2, -1, -2, 'crit1', 'blood', 60, 6, 'nightTime', 1],
  ['bridge2', 'Carne Fraca', 9, 2, -2, 'critm1', 'blood', 70, 6, 'weaken', 4],
  ['bridge3', 'Sede de Ouro', 21, 3, 2, 'teeth2', 'teeth', 12, 5, 'teethChance', 2],
  ['bridge4', 'Ninhada', 13, -2, 2, 'shard1', 'blood', 250, 5, 'spawnPct', 12],
  // ── Outer ring: legendary nodes (mostly Sangue Puro)
  // ── Speed: the vampire runs faster (matters most with the joystick)
  ['speed1', 'Passos Sombrios', 14, 1, -2, 'critm1', 'blood', 6, 8, 'moveSpeed', 30],
  ['speed2', 'Vulto', 14, 2, 3, 'bite2', 'shard', 6, 6, 'moveSpeed', 45],
  ['speed3', 'Relâmpago Rubro', 14, 5, 2, 'teeth3', 'pure', 2, 5, 'moveSpeed', 70, 2.2],
  ['instinct', 'Instinto Caçador', 10, -2, -2, 'crit1', 'blood', 90, 6, 'critChance', 2],
  ['feast1', 'Gula', 22, 2, -3, 'critm2', 'blood', 600, 8, 'bloodPct', 25],
  ['rate3', 'Tempestade de Presas', 28, 1, -6, 'critm3', 'shard', 40, 6, 'auraRate', 15],
  ['crit4', 'Destino Rubro', 10, -1, -6, 'crit3', 'pure', 2, 5, 'critChance', 6, 2.2],
  ['critm4', 'Execução', 11, 2, -5, 'critm3', 'pure', 3, 5, 'critMult', 1.2, 2.3],
  ['weak3', 'Corações Frágeis', 1, -2, -6, 'weak2', 'pure', 3, 5, 'weaken', 8, 2.3],
  ['combo2', 'Sede Infinita', 19, -1, -7, 'crit4', 'pure', 4, 5, 'comboDmg', 15, 2.3],
  ['dmg6', 'Divindade Vampira', 29, 1, -7, 'dmg5', 'pure', 20, 5, 'auraPct', 150, 2.6],
  ['time5', 'Noite Polar', 5, -6, 0, 'time4', 'pure', 8, 3, 'nightTime', 8, 2.6],
  ['spawn4', 'Maré Humana', 24, -5, 1, 'spawn3', 'pure', 3, 5, 'spawnPct', 30, 2.3],
  ['radius4', 'Abraço da Noite', 29, -4, 2, 'radius3', 'pure', 3, 5, 'auraRadius', 8, 2.3],
  ['pop5', 'Metrópole Viva', 17, -6, -1, 'pop4', 'pure', 10, 4, 'maxPop', 20, 2.6],
  ['shadow', 'Sombra Longa', 25, -2, -3, 'instinct', 'blood', 700, 6, 'auraRadius', 4],
  ['pop6', 'Aldeia Inteira', 17, -3, -2, 'pop2', 'blood', 1400, 8, 'maxPop', 4],
  ['teeth3', 'Mina de Ouro', 21, 4, 2, 'shinyv1', 'shard', 20, 8, 'teethChance', 4],
  ['life2', 'Coágulo Eterno', 8, 4, -2, 'magnet2', 'shard', 15, 5, 'dropLife', 1.5],
  ['dice2', 'Dado de Sangue', 20, 7, 0, 'loot2', 'pure', 4, 2, 'dice', 1, 3],
  ['reroll2', 'Sorte do Diabo', 20, 7, 1, 'dice2', 'pure', 6, 2, 'reroll', 1, 3],
  ['shinyv2', 'Rei Dourado', 22, 6, 2, 'shiny2', 'pure', 4, 5, 'shinyValue', 3, 2.3],
  ['vial2', 'Adega Rubra', 18, 5, -2, 'blood2', 'teeth', 60, 8, 'vialChance', 3],
  ['magnet3', 'Buraco Negro', 19, 4, -3, 'life2', 'pure', 3, 4, 'magnet', 60, 2.3],
  ['batr2', 'Asas da Noite', 14, -1, 6, 'boom2', 'pure', 3, 5, 'batRate', 30, 2.3],
  ['boomd2', 'Supernova', 28, 2, 4, 'chain1', 'pure', 3, 5, 'explodeDmg', 3, 2.3],
  ['shard3', 'Catacumbas', 3, -2, 4, 'terror1', 'shard', 40, 6, 'shardChance', 4],
  ['bite3', 'Beijo Fatal', 8, 3, 3, 'bite2', 'pure', 2, 6, 'biteDmg', 3, 2.2],
  ['terror2', 'Pânico', 11, -1, 7, 'batr2', 'pure', 6, 4, 'terrorPct', 8, 2.5],
  ['bats3', 'Eclipse de Asas', 15, 0, 7, 'batd2', 'pure', 12, 4, 'bats', 4, 2.6],
  ['boss3', 'Tirania', 16, 1, 6, 'boss2', 'pure', 8, 5, 'bossDmg', 100, 2.4],
]

// Balance: prices climb with distance from the root (deeper = pricier) and with each level bought.
export const TREE_BALANCE = { growth: 1.9, bloodDist: 3, otherDist: 1.25 }
const dist = (x: number, y: number) => Math.abs(x) + Math.abs(y)
export const NODES: TreeNode[] = ROWS.map(([id, name, icon, x, y, parent, res, cost, max, stat, value, growth]) => ({
  id, name, icon, x, y, parent, res, max, stat, value, keystone: max === 1, infinite: max >= 999,
  cost: Math.ceil(cost * Math.pow(res === 'blood' ? TREE_BALANCE.bloodDist : TREE_BALANCE.otherDist, Math.max(0, dist(x, y) - 1))),
  growth: growth ?? TREE_BALANCE.growth,
}))
export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, TreeNode>

export const nodeCost = (n: TreeNode, level: number) => Math.ceil(n.cost * Math.pow(n.growth, level))

export type Stats = Record<Stat, number>

export function computeStats(levels: Record<string, number>): Stats {
  const s = Object.fromEntries(Object.keys(STAT_TEXT).map((k) => [k, 0])) as Stats
  for (const n of NODES) s[n.stat] += (levels[n.id] ?? 0) * n.value
  return s
}
