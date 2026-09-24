// One UI, two layout modes. The DOM is identical in both; CSS (styles.css) rearranges it per mode.
// Landscape is the primary target (desktop + phones held sideways); portrait follows the mobile mockups.
import { bus, type Rect } from '../../core/EventBus';
import type { LayoutMode } from '../../core/Constants';

/** Phones in landscape have little height: tighter chrome, same arrangement. */
const COMPACT_HEIGHT = 560;

export function detectLayout(w: number, h: number): { mode: LayoutMode; compact: boolean } {
  const mode: LayoutMode = w >= h * 0.9 ? 'DESKTOP_LANDSCAPE' : 'MOBILE_PORTRAIT';
  const compact = mode === 'DESKTOP_LANDSCAPE' ? h < COMPACT_HEIGHT : w < 380;
  return { mode, compact };
}

export class ResponsiveLayout {
  mode: LayoutMode = 'DESKTOP_LANDSCAPE';
  compact = false;
  farmArea: Rect = { x: 0, y: 0, w: innerWidth, h: innerHeight };

  constructor(private root: HTMLElement, private farmEl: HTMLElement) {
    const ro = new ResizeObserver(() => this.measure());
    ro.observe(this.root);
    ro.observe(this.farmEl);
    window.addEventListener('resize', () => this.measure());
    window.addEventListener('orientationchange', () => setTimeout(() => this.measure(), 250));
    this.measure();
  }

  measure() {
    const { mode, compact } = detectLayout(window.innerWidth, window.innerHeight);
    this.mode = mode;
    this.compact = compact;
    this.root.dataset.layout = mode === 'DESKTOP_LANDSCAPE' ? 'landscape' : 'portrait';
    this.root.classList.toggle('is-compact', compact);
    // Phones (portrait, or landscape with little height) get the lean UI: fewer words, same actions.
    this.root.classList.toggle('is-lean', mode === 'MOBILE_PORTRAIT' || compact);
    const r = this.farmEl.getBoundingClientRect();
    const area = { x: r.left, y: r.top, w: Math.max(50, r.width), h: Math.max(50, r.height) };
    const a = this.farmArea;
    if (a.x === area.x && a.y === area.y && a.w === area.w && a.h === area.h) return;
    this.farmArea = area;
    bus.emit('layout:changed', { mode, farmArea: area });
  }
}
