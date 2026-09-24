import { bus } from '../../core/EventBus';
import { h } from '../dom';

const MAX = 3;

export class Toasts {
  readonly root = h('div', { class: 'toasts', 'aria-live': 'polite' });

  constructor() {
    bus.on('toast', ({ text, kind }) => this.show(text, kind ?? 'info'));
  }

  show(text: string, kind: 'info' | 'reward' | 'error') {
    const el = h('div', { class: `toast toast-${kind}` }, text);
    this.root.append(el);
    while (this.root.children.length > MAX) this.root.firstElementChild?.remove();
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 300); }, 2600);
  }
}
