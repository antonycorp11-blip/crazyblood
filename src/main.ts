import './style.css';
import { IncrementalGame } from './incremental/game';
import { formatNumber, RITUALS, UPGRADES, type UpgradeId } from './incremental/data';

const game = new IncrementalGame();
let buyQuantity: 1 | 10 | 'max' = 1;
let mobileView: 'farm' | 'shop' | 'goal' = 'farm';
let audioContext: AudioContext | null = null;
let lastSoundAt = 0;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = [
  '<header class="topbar">',
  '  <div class="brand"><span class="brand-mark">✿</span><div><strong>HEMOFARM</strong><small>COLHEITA DA LUA RUBRA</small></div></div>',
  '  <div class="top-stats"><div class="stat-pill blood-pill"><img class="stat-icon pixel-icon" src="/assets/eclipse/icon-blood.svg" alt="" /><span><small>SANGUE</small><strong id="blood-value">0</strong></span></div><div class="stat-pill power-pill"><img class="stat-icon pixel-icon" src="/assets/eclipse/icon-moon.svg" alt="" /><span><small>POR TOQUE</small><strong id="power-value">1</strong></span></div></div>',
  '  <button class="icon-button settings-button" id="settings-button" aria-label="Abrir ajustes">⚙</button>',
  '</header>',
  '<main class="layout" data-view="farm">',
  '  <aside class="side-panel goal-panel">',
  '    <section class="pixel-panel objective-panel"><div class="eyebrow">MISSÃO PRINCIPAL</div><h2>Restaure a Lua Rubra</h2><p class="objective-copy">Colha sangue, desperte sete selos e devolva a luz à fazenda.</p><div class="seal-track" id="seal-track"></div><div class="phase-name" id="phase-name"></div><div class="progress-row"><strong id="goal-current">0</strong><span id="goal-target">/ 500</span></div><div class="progress-bar"><div class="progress-fill" id="goal-progress"></div></div><p class="phase-story" id="phase-story"></p><button class="primary-button ritual-button" id="ritual-button">REALIZAR RITUAL</button><p class="ritual-hint">Cada selo reinicia a colheita e fortalece para sempre seus toques.</p></section>',
  '    <section class="pixel-panel stat-panel"><div class="eyebrow">A SUA COLHEITA</div><div class="detail-row"><span>Toques realizados</span><strong id="total-taps">0</strong></div><div class="detail-row"><span>Crítico</span><strong id="crit-value">4%</strong></div><div class="detail-row"><span>Força dos selos</span><strong id="seal-power">×1</strong></div><div class="detail-row"><span>Sangue total</span><strong id="lifetime-value">0</strong></div></section>',
  '  </aside>',
  '  <section class="farm-panel" aria-label="Fazenda de sangue"><div class="scene-shade"></div><div class="scene-top"><span class="scene-tag">✦ A FAZENDA ESTÁ VIVA ✦</span><h1>Toque para colher</h1><p>Faça a fruta sangrar. Faça a lua florescer.</p></div><div class="harvest-stage"><div class="harvest-halo"></div><button id="harvest-button" class="harvest-button" aria-label="Colher sangue"><img src="/assets/eclipse/blood-fruit.png" alt="Fruto de sangue" draggable="false" /></button><div class="floating-layer" id="floating-layer"></div></div><div class="farm-bottom"><div class="combo-line"><span id="combo-label">COMBO 0</span><span id="surge-label">SURTO DA LUA</span></div><div class="surge-meter"><div id="surge-fill"></div></div><button class="surge-button" id="surge-button">COLHA 30 VEZES PARA CARREGAR</button><small>Toque no fruto ou pressione Espaço</small></div></section>',
  '  <aside class="side-panel shop-panel"><section class="pixel-panel shop-inner"><div class="shop-heading"><div><div class="eyebrow">EVOLUÇÃO MANUAL</div><h2>Melhorias</h2></div><span class="shop-badge">SEM PRODUÇÃO PASSIVA</span></div><p class="shop-intro">Tudo fortalece sua próxima colheita. Nada produz sozinho.</p><div class="quantity-switch" role="group" aria-label="Quantidade para comprar"><button class="is-active" data-qty="1">×1</button><button data-qty="10">×10</button><button data-qty="max">MÁX</button></div><div class="upgrade-list" id="upgrade-list"></div></section></aside>',
  '</main>',
  '<nav class="mobile-nav" aria-label="Navegação"><button class="is-active" data-view="farm"><span>✿</span>COLHER</button><button data-view="shop"><span>✦</span>MELHORIAS</button><button data-view="goal"><span>☾</span>LUA RUBRA</button></nav>',
  '<div class="modal-backdrop" id="settings-modal" hidden><div class="modal pixel-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button class="modal-close" id="close-settings" aria-label="Fechar">×</button><div class="eyebrow">OPÇÕES</div><h2 id="settings-title">Ajustes</h2><p>Seu progresso é salvo automaticamente neste navegador.</p><button class="secondary-button" id="sound-button">Som: ligado</button><button class="danger-button" id="reset-button">RECOMEÇAR JOGO</button></div></div>',
  '<div class="modal-backdrop" id="victory-modal" hidden><div class="modal pixel-panel victory-modal" role="dialog" aria-modal="true" aria-labelledby="victory-title"><div class="victory-moon">☾</div><div class="eyebrow">LENDA COMPLETA</div><h2 id="victory-title">A Lua Rubra floresceu!</h2><p>Sete selos despertos. A fazenda vive para sempre sob o seu eclipse.</p><button class="primary-button" id="close-victory">CONTINUAR COLHENDO</button></div></div>',
  '<div class="toast" id="toast" role="status" aria-live="polite"></div>',
].join('');

const query = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const bloodValue = query<HTMLElement>('#blood-value');
const powerValue = query<HTMLElement>('#power-value');
const harvestButton = query<HTMLButtonElement>('#harvest-button');
const ritualButton = query<HTMLButtonElement>('#ritual-button');
const surgeButton = query<HTMLButtonElement>('#surge-button');
const shopList = query<HTMLElement>('#upgrade-list');
const layout = query<HTMLElement>('.layout');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function sound(type: 'tap' | 'buy' | 'ritual' | 'error') {
  if (!game.state.sound) return;
  const now = performance.now();
  if (type === 'tap' && now - lastSoundAt < 60) return;
  lastSoundAt = now;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type === 'ritual' ? 'triangle' : 'square';
    const frequency = type === 'tap' ? 280 : type === 'buy' ? 490 : type === 'ritual' ? 620 : 140;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.65), audioContext.currentTime + 0.09);
    gain.gain.setValueAtTime(type === 'tap' ? 0.025 : 0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.13);
  } catch { /* Audio is optional. */ }
}

let toastTimer = 0;
function toast(message: string) {
  const element = query<HTMLElement>('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('show'), 2200);
}

function floating(amount: number, critical: boolean) {
  if (reducedMotion.matches) return;
  const layer = query<HTMLElement>('#floating-layer');
  if (layer.childElementCount > 12) layer.firstElementChild?.remove();
  const label = document.createElement('span');
  label.className = 'floating-number' + (critical ? ' is-critical' : '');
  label.textContent = '+' + formatNumber(amount) + (critical ? ' CRÍTICO!' : '');
  label.style.setProperty('--offset', String(Math.round((Math.random() - 0.5) * 150)) + 'px');
  layer.append(label);
  window.setTimeout(() => label.remove(), 850);
}

function harvest() {
  const result = game.harvest();
  floating(result.amount, result.critical);
  harvestButton.classList.remove('is-hit');
  void harvestButton.offsetWidth;
  harvestButton.classList.add('is-hit');
  sound('tap');
  render();
}

function offer(id: UpgradeId): { count: number; cost: number } {
  const upgrade = UPGRADES.find((item) => item.id === id)!;
  const level = game.state.upgrades[id];
  const limit = buyQuantity === 'max' ? 1000 : buyQuantity;
  let cost = 0;
  let count = 0;
  for (let index = 0; index < limit; index++) {
    const next = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level + index));
    if (!Number.isFinite(next)) break;
    if (buyQuantity === 'max' && cost + next > game.state.blood) break;
    cost += next;
    count++;
  }
  if (buyQuantity === 'max' && !count) return { count: 0, cost: game.cost(id) };
  return { count, cost };
}

function makeUpgradeCards() {
  for (const upgrade of UPGRADES) {
    const card = document.createElement('article');
    card.className = 'upgrade-card';
    card.dataset.id = upgrade.id;
    card.innerHTML = '<div class="upgrade-icon">' + upgrade.icon + '</div><div class="upgrade-copy"><div class="upgrade-title-row"><strong>' + upgrade.name + '</strong><span class="upgrade-level">Nv. 0</span></div><p>' + upgrade.description + '</p><div class="unlock-note"></div></div><button class="buy-button" aria-label="Comprar ' + upgrade.name + '"><span class="buy-cost">0</span><span class="mini-drop"></span></button>';
    const button = card.querySelector<HTMLButtonElement>('.buy-button')!;
    button.addEventListener('click', () => {
      const bought = game.buy(upgrade.id, buyQuantity);
      if (bought) { sound('buy'); toast(upgrade.name + ' • +' + bought + ' nível' + (bought === 1 ? '' : 'is')); render(); }
      else sound('error');
    });
    shopList.append(card);
  }
}

function renderShop() {
  for (const card of shopList.querySelectorAll<HTMLElement>('.upgrade-card')) {
    const id = card.dataset.id as UpgradeId;
    const upgrade = UPGRADES.find((item) => item.id === id)!;
    const unlocked = game.unlocked(id);
    const selectedOffer = offer(id);
    const canBuy = unlocked && selectedOffer.count > 0 && game.state.blood >= selectedOffer.cost;
    card.classList.toggle('is-locked', !unlocked);
    card.classList.toggle('can-buy', canBuy);
    card.querySelector<HTMLElement>('.upgrade-level')!.textContent = 'Nv. ' + game.state.upgrades[id];
    card.querySelector<HTMLElement>('.unlock-note')!.textContent = unlocked ? '' : 'Libera com ' + formatNumber(upgrade.unlockAt) + ' sangue nesta colheita';
    card.querySelector<HTMLElement>('.buy-cost')!.textContent = !unlocked ? 'BLOQUEADO' : buyQuantity === 'max' && selectedOffer.count > 0 ? '×' + selectedOffer.count + ' · ' + formatNumber(selectedOffer.cost) : formatNumber(selectedOffer.cost);
    card.querySelector<HTMLButtonElement>('.buy-button')!.disabled = !canBuy;
  }
}

function render() {
  const state = game.state;
  const goal = game.goal;
  const now = Date.now();
  bloodValue.textContent = formatNumber(state.blood);
  powerValue.textContent = formatNumber(game.tapPower);
  query<HTMLElement>('#total-taps').textContent = formatNumber(state.totalTaps);
  query<HTMLElement>('#crit-value').textContent = Math.round(game.criticalChance * 100) + '%';
  query<HTMLElement>('#seal-power').textContent = '×' + game.permanentMultiplier.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  query<HTMLElement>('#lifetime-value').textContent = formatNumber(state.lifetimeHarvest);
  query<HTMLElement>('#combo-label').textContent = 'COMBO ' + (now - game.lastTapAt < 1800 ? game.combo : 0) + ' / 25';
  query<HTMLElement>('#surge-fill').style.width = (game.surgeUntil > now ? 100 : game.charge / 30 * 100) + '%';
  if (game.surgeUntil > now) {
    query<HTMLElement>('#surge-label').textContent = 'SURTO ATIVO ×3';
    surgeButton.textContent = 'SURTO DA LUA · ' + Math.ceil((game.surgeUntil - now) / 1000) + 's';
    surgeButton.disabled = true;
  } else {
    query<HTMLElement>('#surge-label').textContent = 'SURTO DA LUA · ' + game.charge + '/30';
    surgeButton.textContent = game.charge >= 30 ? 'ATIVAR SURTO ×3 POR 12s' : 'COLHA ' + (30 - game.charge) + ' VEZES PARA CARREGAR';
    surgeButton.disabled = game.charge < 30;
  }
  query<HTMLElement>('.farm-panel').classList.toggle('surge-active', game.surgeUntil > now);
  const sealTrack = query<HTMLElement>('#seal-track');
  sealTrack.innerHTML = RITUALS.map((_, index) => '<span class="seal ' + (index < state.seals ? 'is-done' : index === state.seals ? 'is-current' : '') + '">' + (index < state.seals ? '✦' : index + 1) + '</span>').join('');
  query<HTMLElement>('#phase-name').textContent = goal ? 'SELO ' + (state.seals + 1) + ' · ' + goal.name : 'OS SETE SELOS DESPERTARAM';
  query<HTMLElement>('#goal-current').textContent = formatNumber(goal ? Math.min(state.runHarvest, goal.amount) : state.lifetimeHarvest);
  query<HTMLElement>('#goal-target').textContent = goal ? '/ ' + formatNumber(goal.amount) : ' · LENDA COMPLETA';
  query<HTMLElement>('#goal-progress').style.width = goal ? Math.min(100, state.runHarvest / goal.amount * 100) + '%' : '100%';
  query<HTMLElement>('#phase-story').textContent = goal ? goal.story : 'A Lua Rubra brilha sobre sua fazenda.';
  ritualButton.hidden = !goal;
  ritualButton.disabled = !game.canRitual;
  ritualButton.textContent = game.canRitual ? 'DESPERTAR SELO ' + (state.seals + 1) : 'COLHA ATÉ ' + formatNumber(goal?.amount ?? 0);
  renderShop();
}

makeUpgradeCards();
harvestButton.addEventListener('click', harvest);
surgeButton.addEventListener('click', () => { if (game.activateSurge()) { sound('ritual'); toast('Surto da Lua: colheita tripla por 12 segundos!'); render(); } });
ritualButton.addEventListener('click', () => {
  if (!game.ritual()) return;
  sound('ritual');
  render();
  if (game.completed) query<HTMLElement>('#victory-modal').hidden = false;
  else { toast('Selo desperto! Seus toques ficaram mais fortes.'); setView('farm'); }
});
query<HTMLElement>('.quantity-switch').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-qty]');
  if (!button) return;
  buyQuantity = button.dataset.qty === 'max' ? 'max' : button.dataset.qty === '10' ? 10 : 1;
  query<HTMLElement>('.quantity-switch').querySelectorAll('button').forEach((item) => item.classList.toggle('is-active', item === button));
  renderShop();
});

function setView(view: 'farm' | 'shop' | 'goal') {
  mobileView = view;
  layout.dataset.view = mobileView;
  document.querySelectorAll<HTMLButtonElement>('.mobile-nav button').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
}
document.querySelectorAll<HTMLButtonElement>('.mobile-nav button').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view as 'farm' | 'shop' | 'goal')));

const settingsModal = query<HTMLElement>('#settings-modal');
query<HTMLButtonElement>('#settings-button').addEventListener('click', () => { settingsModal.hidden = false; query<HTMLButtonElement>('#sound-button').textContent = 'Som: ' + (game.state.sound ? 'ligado' : 'desligado'); });
query<HTMLButtonElement>('#close-settings').addEventListener('click', () => settingsModal.hidden = true);
settingsModal.addEventListener('click', (event) => { if (event.target === settingsModal) settingsModal.hidden = true; });
query<HTMLButtonElement>('#sound-button').addEventListener('click', (event) => { game.state.sound = !game.state.sound; (event.currentTarget as HTMLButtonElement).textContent = 'Som: ' + (game.state.sound ? 'ligado' : 'desligado'); game.save(); });
query<HTMLButtonElement>('#reset-button').addEventListener('click', () => {
  if (!window.confirm('Apagar toda a colheita, melhorias e selos desta versão?')) return;
  game.reset(); settingsModal.hidden = true; setView('farm'); render(); toast('Nova colheita iniciada.');
});
query<HTMLButtonElement>('#close-victory').addEventListener('click', () => query<HTMLElement>('#victory-modal').hidden = true);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { settingsModal.hidden = true; query<HTMLElement>('#victory-modal').hidden = true; return; }
  if (event.code === 'Space' && !event.repeat && settingsModal.hidden && query<HTMLElement>('#victory-modal').hidden && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); harvest(); }
});
window.addEventListener('pagehide', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
window.setInterval(() => game.save(), 10000);
window.setInterval(render, 150);
render();
