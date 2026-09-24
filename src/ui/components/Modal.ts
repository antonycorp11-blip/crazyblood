import { AudioManager } from '../../systems/AudioManager';
import { h, onTap } from '../dom';

/** Generic modal on the modal layer. Returns a close() function. */
export function openModal(layer: HTMLElement, opts: { title: string; body: Node[]; actions?: { label: string; primary?: boolean; onClick?: () => void }[]; dismissable?: boolean; className?: string }): () => void {
  AudioManager.ui('sfx_open');
  const close = () => {
    backdrop.classList.add('is-closing');
    setTimeout(() => backdrop.remove(), 200);
  };
  const actions = (opts.actions ?? []).map((a) => {
    const b = h('button', { class: `btn ${a.primary ? 'btn-buy is-affordable' : 'btn-dark'}` }, a.label);
    onTap(b, () => { a.onClick?.(); close(); });
    return b;
  });
  const closeBtn = opts.dismissable !== false ? h('button', { class: 'modal-close', 'aria-label': 'Close' }, '✕') : null;
  const panel = h('div', { class: `modal panel-dark ${opts.className ?? ''}`, role: 'dialog', 'aria-modal': 'true' },
    closeBtn,
    h('h2', { class: 'modal-title' }, opts.title),
    h('div', { class: 'modal-body' }, ...opts.body),
    actions.length ? h('div', { class: 'modal-actions' }, ...actions) : null,
  );
  const backdrop = h('div', { class: 'modal-backdrop' }, panel);
  if (closeBtn) onTap(closeBtn, close, 'sfx_close');
  if (opts.dismissable !== false) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  layer.append(backdrop);
  return close;
}
