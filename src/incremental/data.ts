export type UpgradeId = 'roots' | 'blade' | 'gloves' | 'pruner' | 'nectar' | 'scythe' | 'moonlight' | 'thorns' | 'legacy';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  growth: number;
  gain: number;
  unlockAt: number;
  effect: 'tap' | 'crit' | 'critPower' | 'combo';
}

export const UPGRADES: Upgrade[] = [
  { id: 'roots', name: 'Raízes Rubras', description: '+1 sangue por colheita', icon: '✿', baseCost: 8, growth: 1.19, gain: 1, unlockAt: 0, effect: 'tap' },
  { id: 'blade', name: 'Lâmina de Seiva', description: '+4 sangue por colheita', icon: '⚔', baseCost: 65, growth: 1.21, gain: 4, unlockAt: 35, effect: 'tap' },
  { id: 'gloves', name: 'Luvas da Sorte', description: '+2% de crítico', icon: '✦', baseCost: 110, growth: 1.38, gain: 0.02, unlockAt: 60, effect: 'crit' },
  { id: 'pruner', name: 'Foice Carmesim', description: '+22 sangue por colheita', icon: '☾', baseCost: 450, growth: 1.23, gain: 22, unlockAt: 280, effect: 'tap' },
  { id: 'nectar', name: 'Néctar Instável', description: '+0,5× no crítico', icon: '◆', baseCost: 850, growth: 1.35, gain: 0.5, unlockAt: 500, effect: 'critPower' },
  { id: 'scythe', name: 'Colheita Sombria', description: '+130 sangue por colheita', icon: '♠', baseCost: 2800, growth: 1.26, gain: 130, unlockAt: 1800, effect: 'tap' },
  { id: 'moonlight', name: 'Luar Fértil', description: '+2% por nível de combo', icon: '☽', baseCost: 5200, growth: 1.34, gain: 0.02, unlockAt: 3200, effect: 'combo' },
  { id: 'thorns', name: 'Espinhos Eternos', description: '+850 sangue por colheita', icon: '✣', baseCost: 16000, growth: 1.29, gain: 850, unlockAt: 9000, effect: 'tap' },
  { id: 'legacy', name: 'Fruto Ancestral', description: '+6000 sangue por colheita', icon: '❖', baseCost: 90000, growth: 1.31, gain: 6000, unlockAt: 50000, effect: 'tap' },
];

export const RITUALS = [
  { name: 'A Semente', amount: 500, story: 'A primeira raiz desperta sob a terra.' },
  { name: 'A Raiz', amount: 3000, story: 'O sangue percorre os campos esquecidos.' },
  { name: 'O Broto', amount: 15000, story: 'A fazenda responde ao chamado da lua.' },
  { name: 'A Floração', amount: 80000, story: 'Flores vermelhas cobrem a noite.' },
  { name: 'A Colheita', amount: 400000, story: 'A força da terra alcança o céu.' },
  { name: 'A Lua Faminta', amount: 2000000, story: 'O eclipse começa a se romper.' },
  { name: 'A Lua Rubra', amount: 10000000, story: 'Restaure a Lua Rubra e complete a lenda.' },
];

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  if (Math.abs(value) < 1000) return Math.floor(value).toLocaleString('pt-BR');
  const units = ['', 'mil', 'mi', 'bi', 'tri', 'qa', 'qi'];
  const group = Math.min(Math.floor(Math.log10(Math.abs(value)) / 3), units.length - 1);
  const scaled = value / Math.pow(1000, group);
  return scaled.toLocaleString('pt-BR', { maximumFractionDigits: scaled < 10 ? 2 : scaled < 100 ? 1 : 0 }) + ' ' + units[group];
}
