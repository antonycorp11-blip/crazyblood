import { store } from '../../core/Store';
import { assetUrl } from '../../data/assets';
import { t } from '../../data/localization';
import { MissionSystem } from '../../systems/MissionSystem';
import { formatNumber } from '../../utils/format';
import { h, onTap, setText, toggleClass } from '../dom';

export class MissionCard {
  readonly root: HTMLElement;
  private text = h('div', { class: 'mission-text' });
  private fill = h('div', { class: 'bar-fill' });
  private barText = h('div', { class: 'bar-text' });
  private reward = h('div', { class: 'mission-reward' });
  private rewardIcon = h('img', { alt: '' });
  private rewardValue = h('span');
  private claim = h('button', { class: 'btn btn-claim' }, t('mission.claim'));

  constructor() {
    this.reward.append(this.rewardIcon, this.rewardValue);
    this.root = h('div', { class: 'mission-card panel-parchment' },
      h('img', { class: 'mission-portrait', src: assetUrl('icon_quest'), alt: '' }),
      h('div', { class: 'mission-main' },
        h('div', { class: 'mission-title' }, t('mission.title')),
        this.text,
        h('div', { class: 'bar' }, this.fill, this.barText),
      ),
      this.reward,
      this.claim,
    );
    onTap(this.claim, () => MissionSystem.claim(), 'sfx_unlock');
  }

  update() {
    const m = MissionSystem.current();
    const done = store.state.mission.complete;
    setText(this.text, MissionSystem.text());
    const p = MissionSystem.progress();
    const pct = Math.min(100, (p.value / p.target) * 100);
    this.fill.style.width = `${pct}%`;
    setText(this.barText, m ? `${formatNumber(Math.min(p.value, p.target))}/${formatNumber(p.target)}` : '✓');
    toggleClass(this.root, 'is-complete', done);
    toggleClass(this.root, 'is-empty', !m);
    this.claim.hidden = !done;
    if (m) {
      const essence = m.reward.essence ?? 0;
      const src = assetUrl(essence ? 'icon_ancestral_essence' : 'icon_gold');
      if (this.rewardIcon.getAttribute('src') !== src) this.rewardIcon.src = src;
      setText(this.rewardValue, formatNumber(essence || m.reward.gold || 0));
    }
    this.reward.hidden = !m || done;
  }
}
