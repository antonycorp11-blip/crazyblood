// First screen: logo, START or CONTINUE, Settings. Fast — no extra menus.
import { t } from '../data/localization';
import { h, onTap } from './dom';

export function showTitle(parent: HTMLElement, hasSave: boolean, onPlay: () => void, onSettings: () => void): () => void {
  const play = h('button', { class: 'btn btn-title' }, hasSave ? t('title.continue') : t('title.start'));
  const settings = h('button', { class: 'btn btn-dark btn-title-settings' }, t('title.settings'));
  // PLACEHOLDER logo_hemofarm: typographic until the final logo exists.
  const root = h('div', { class: 'title-screen' },
    h('div', { class: 'title-logo', 'aria-label': 'Hemofarm' },
      h('span', { class: 'logo-word' }, 'Hem', h('span', { class: 'logo-drop' }, 'o'), 'farm')),
    h('p', { class: 'title-tagline' }, t('title.tagline')),
    play,
    settings,
    h('div', { class: 'title-version' }, `v${__APP_VERSION__}`),
  );
  onTap(play, () => { root.classList.add('is-leaving'); setTimeout(() => root.remove(), 350); onPlay(); }, 'sfx_unlock');
  onTap(settings, onSettings);
  parent.append(root);
  return () => root.remove();
}
