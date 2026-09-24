// Mordecai speaks: portrait + speech bubble + highlight on the relevant control. No text walls, no
// full-screen blockers — only the highlighted control pulses.
import { assetUrl, type SfxKey } from '../../data/assets';
import { t } from '../../data/localization';
import { TutorialSystem } from '../../systems/TutorialSystem';
import { AudioManager } from '../../systems/AudioManager';
import { h, onTap, setText } from '../dom';

const VOICES: SfxKey[] = ['voice_mordecai_1', 'voice_mordecai_2', 'voice_mordecai_3', 'voice_mordecai_4'];

export class TutorialBubble {
  readonly root: HTMLElement;
  private text = h('p', { class: 'tut-text' });
  private hint = h('div', { class: 'tut-hint' });
  private lastKey = '';

  constructor() {
    const skip = h('button', { class: 'tut-skip' }, t('tut.skip'));
    onTap(skip, (e) => { e.stopPropagation(); TutorialSystem.skip(); });
    this.root = h('div', { class: 'tutorial', hidden: true },
      h('img', { class: 'tut-portrait', src: assetUrl('npc_mordecai'), alt: 'Mordecai' }),
      h('div', { class: 'tut-bubble' }, h('div', { class: 'tut-name' }, 'Mordecai'), this.text, this.hint, skip),
    );
    onTap(this.root, () => TutorialSystem.next(), null);
  }

  update() {
    const v = TutorialSystem.view();
    this.root.hidden = !v;
    const key = v ? v.lineKey + JSON.stringify(v.params ?? {}) : '';
    if (key !== this.lastKey) {
      this.lastKey = key;
      if (v) {
        setText(this.text, t(v.lineKey, v.params));
        this.root.classList.remove('is-in');
        void this.root.offsetWidth;
        this.root.classList.add('is-in');
        AudioManager.play(VOICES[Math.floor(Math.random() * VOICES.length)], 'ui');
      }
    }
    setText(this.hint, v?.tapToContinue || v?.reaction ? t('tut.next') : '');
    this.highlight(v?.reaction ? '' : v?.target ?? '');
  }

  private highlight(target: string) {
    // Re-query each tick: targets may be rebuilt (contract cards) or appear later (screens).
    document.querySelectorAll('.tut-target').forEach((el) => {
      if (!target || !el.matches(this.selector(target))) el.classList.remove('tut-target');
    });
    if (!target || target.startsWith('world:')) return;
    document.querySelectorAll(this.selector(target)).forEach((el) => el.classList.add('tut-target'));
  }

  private selector(target: string): string {
    if (target === 'contract:any') return '.contract-card[data-status="ACTIVE"]';
    return `[data-tut="${target}"]`;
  }
}
