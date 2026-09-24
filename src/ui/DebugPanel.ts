// Development-only tools (never bundled into production: the import is behind import.meta.env.DEV).
// Toggle with the backtick key (`) or the DEV button.
import { bus } from '../core/EventBus';
import { store } from '../core/Store';
import { Analytics } from '../core/Analytics';
import { EconomySystem } from '../systems/EconomySystem';
import { OfflineProgressSystem } from '../systems/OfflineProgressSystem';
import { ProductionSystem } from '../systems/ProductionSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { PrestigeSystem } from '../systems/PrestigeSystem';
import { getFarmStage } from '../world/FarmVisualState';
import { formatNumber } from '../utils/format';
import { h, setText } from './dom';

export interface DebugHooks { resetSave: () => void; getLayout: () => string; saveStatus: () => string }

export function mountDebug(parent: HTMLElement, hooks: DebugHooks) {
  const btn = (label: string, fn: () => void) => {
    const b = h('button', { class: 'dbg-btn' }, label);
    b.addEventListener('click', () => { fn(); bus.emit('resources:changed'); });
    return b;
  };
  const s = () => store.state;
  const panel = h('div', { class: 'debug-panel', hidden: true },
    h('div', { class: 'dbg-title' }, 'DEBUG'),
    btn('+100 Gold', () => EconomySystem.addGold(100)),
    btn('+10K Gold', () => EconomySystem.addGold(10_000)),
    btn('+1000 Blood', () => EconomySystem.addBlood(1000)),
    btn('+10 Humans', () => { s().humans += 10; bus.emit('human:bought', { total: s().humans }); }),
    btn('+50 Essence', () => EconomySystem.addEssence(50)),
    btn('+1M blood produced', () => { s().stats.bloodProduced += 1e6; }),
    btn('New Lineage now', () => PrestigeSystem.performReset()),
    btn('Fill tank', () => { s().tank = ProductionSystem.tankCapacity(); }),
    btn('Unlock Market', () => { s().unlocks.market = true; }),
    btn('Unlock Legacy', () => { s().unlocks.legacy = true; }),
    btn('Skip tutorial', () => TutorialSystem.skip()),
    btn('Simulate 1h offline', () => OfflineProgressSystem.apply(3600)),
    btn('Reset save', () => hooks.resetSave()),
    h('div', { class: 'dbg-row' }, 'Farm stage:',
      ...[null, 0, 1, 2, 3, 4, 5].map((n) => btn(n === null ? 'auto' : String(n), () => bus.emit('debug:setStage', { stage: n })))),
    h('div', { class: 'dbg-log' }),
  );
  const toggle = h('button', { class: 'dbg-toggle' }, 'DEV');
  toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  window.addEventListener('keydown', (e) => { if (e.key === '`') panel.hidden = !panel.hidden; });

  // Dev HUD (§59): FPS, resolution, layout mode, humans, production, stage, save status.
  const hud = h('div', { class: 'dev-hud' });
  let frames = 0, last = performance.now(), fps = 0;
  const loop = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 500) {
      fps = Math.round((frames * 1000) / (now - last)); frames = 0; last = now;
      setText(hud, `${fps} fps · ${innerWidth}×${innerHeight} · ${hooks.getLayout()} · humans ${s().humans} · ${formatNumber(ProductionSystem.bloodPerSecond())}/s · stage ${getFarmStage(s())} · ${hooks.saveStatus()}`);
      const log = panel.querySelector('.dbg-log')!;
      log.textContent = Analytics.recent().slice(-6).map((r) => r.event).join(' › ');
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  parent.append(panel, toggle, hud);
}
