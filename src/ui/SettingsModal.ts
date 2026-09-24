import { bus } from '../core/EventBus';
import { store } from '../core/Store';
import { LOCALES, setLocale, t, type Locale } from '../data/localization';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';
import { openModal } from './components/Modal';
import { h, onTap } from './dom';

export interface SettingsHooks { onReset: () => void; onImport: (code: string) => boolean }

function toggleRow(label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
  const btn = h('button', { class: 'btn btn-toggle' });
  const sync = () => { btn.textContent = get() ? t('settings.on') : t('settings.off'); btn.classList.toggle('is-on', get()); };
  sync();
  onTap(btn, () => { set(!get()); sync(); bus.emit('settings:changed'); });
  return h('div', { class: 'settings-row' }, h('span', {}, label), btn);
}

export function openSettings(layer: HTMLElement, hooks: SettingsHooks) {
  const s = () => store.state.settings;

  const volume = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s().master * 100), class: 'range' }) as HTMLInputElement;
  volume.addEventListener('input', () => { s().master = Number(volume.value) / 100; AudioManager.refresh(); });
  volume.addEventListener('change', () => { AudioManager.ui(); bus.emit('settings:changed'); });

  const lang = h('select', { class: 'select' }, ...LOCALES.map((l) => h('option', { value: l, selected: l === s().language }, l === 'pt-BR' ? 'Português (BR)' : 'English (US)')));
  lang.addEventListener('change', () => {
    s().language = lang.value as Locale;
    setLocale(s().language);
    bus.emit('settings:changed');
    close();
    openSettings(layer, hooks); // reopen so labels update
  });

  const fs = h('button', { class: 'btn btn-dark' }, t('settings.fullscreen'));
  onTap(fs, () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  });

  const exp = h('button', { class: 'btn btn-dark' }, t('settings.export'));
  onTap(exp, async () => {
    const code = SaveSystem.exportSave();
    try { await navigator.clipboard.writeText(code); bus.emit('toast', { text: t('settings.exported') }); }
    catch { window.prompt(t('settings.export'), code); }
  });
  const imp = h('button', { class: 'btn btn-dark' }, t('settings.import'));
  onTap(imp, () => {
    const code = window.prompt(t('settings.importPrompt'));
    if (!code) return;
    if (hooks.onImport(code)) { close(); bus.emit('toast', { text: t('toast.imported'), kind: 'reward' }); }
    else bus.emit('toast', { text: t('toast.importFailed'), kind: 'error' });
  });
  const reset = h('button', { class: 'btn btn-danger' }, t('settings.reset'));
  onTap(reset, () => {
    if (!window.confirm(t('settings.resetConfirm'))) return;
    close();
    hooks.onReset();
  });

  const close = openModal(layer, {
    title: t('settings.title'),
    className: 'modal-settings',
    body: [
      toggleRow(t('settings.music'), () => s().music, (v) => { s().music = v; AudioManager.refresh(); }),
      toggleRow(t('settings.sfx'), () => s().sfx, (v) => { s().sfx = v; }),
      h('div', { class: 'settings-row' }, h('span', {}, t('settings.volume')), volume),
      toggleRow(t('settings.reducedEffects'), () => s().reducedEffects, (v) => { s().reducedEffects = v; }),
      h('div', { class: 'settings-row' }, h('span', {}, t('settings.language')), lang),
      h('div', { class: 'settings-buttons' }, fs, exp, imp, reset),
    ],
  });
}
