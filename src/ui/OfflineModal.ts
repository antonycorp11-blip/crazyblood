import { assetUrl } from '../data/assets';
import { t } from '../data/localization';
import { Progression } from '../data/progression';
import { AudioManager } from '../systems/AudioManager';
import { formatDuration, formatNumber } from '../utils/format';
import { openModal } from './components/Modal';
import { h } from './dom';

export function openOfflineReport(layer: HTMLElement, r: { seconds: number; blood: number; gold: number; tank: number }) {
  const row = (icon: 'icon_blood' | 'icon_gold' | 'icon_time', label: string, value: string) =>
    h('div', { class: 'offline-row' }, h('img', { src: assetUrl(icon), alt: '' }), h('span', {}, label), h('strong', {}, value));
  const rows = [row('icon_time', t('offline.away'), formatDuration(r.seconds))];
  if (r.blood > 0) rows.push(row('icon_blood', t('offline.blood'), `+${formatNumber(r.blood)}`));
  if (r.tank > 0) rows.push(row('icon_blood', t('offline.tank'), `+${formatNumber(r.tank)}`));
  if (r.gold > 0) rows.push(row('icon_gold', t('offline.gold'), `+${formatNumber(r.gold)}`));
  const notes = [h('p', { class: 'offline-note' }, t('offline.note', { n: Math.round(Progression.offlineEfficiency * 100), h: Progression.offlineCapSec / 3600 }))];
  if (r.tank > 0 && r.blood === 0) notes.push(h('p', { class: 'offline-note' }, t('offline.noCollect')));
  AudioManager.play('sfx_gold');
  openModal(layer, {
    title: t('offline.title'),
    className: 'modal-offline',
    body: [h('img', { class: 'offline-portrait', src: assetUrl('npc_mordecai'), alt: '' }), h('div', { class: 'offline-rows' }, ...rows), ...notes],
    actions: [{ label: t('offline.ok'), primary: true }],
  });
}
