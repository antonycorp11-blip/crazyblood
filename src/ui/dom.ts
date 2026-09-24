// Tiny DOM helpers. The UI is plain DOM over the Phaser canvas: crisp text at any DPI, CSS layout for the
// two layout modes, safe-area support and native accessibility for free.
import { AudioManager } from '../systems/AudioManager';
import type { SfxKey } from '../data/assets';

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** Only touches the DOM when the value actually changed (UI refreshes several times per second). */
export function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

export function toggleClass(el: Element, cls: string, on: boolean) {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

/** Click handler with the standard UI click sound; `sound: null` for silent buttons. */
export function onTap(el: HTMLElement, fn: (e: MouseEvent) => void, sound: SfxKey | null = 'sfx_click') {
  el.addEventListener('click', (e) => {
    if (sound) AudioManager.ui(sound);
    fn(e);
  });
}

/** Restarts a CSS animation class (purchase pulse, shake…). */
export function flash(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
