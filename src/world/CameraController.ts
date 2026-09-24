// Camera: frames the farm inside the free screen area left by the UI panels, zooming out as the estate
// grows. Players can drag (mouse/touch), wheel-zoom and pinch within limits; the default framing is
// always one tap away (recenter).
import Phaser from 'phaser';
import type { Rect } from '../core/EventBus';
import { ESTATE, type TileRect } from '../data/farmLayout';
import { iso } from './iso';

const DRAG_THRESHOLD = 8;
const USER_ZOOM_MIN = 0.6;
const USER_ZOOM_MAX = 2.2;
const BUILDING_HEADROOM = 120; // world px above the framing rect so rooftops are not cut
const FRAMING_CROP = 1.25;

function tileRectBounds(r: TileRect) {
  const top = iso(r.i0, r.j0), right = iso(r.i1 + 1, r.j0), bottom = iso(r.i1 + 1, r.j1 + 1), left = iso(r.i0, r.j1 + 1);
  return { x0: left.x, x1: right.x, y0: top.y - BUILDING_HEADROOM, y1: bottom.y };
}

export class CameraController {
  private area: Rect;
  private frame = { cx: 0, cy: 0, w: 1, h: 1 };
  private userZoom = 1;
  private pan = { x: 0, y: 0 };
  private zoom = 1;
  private targetZoom = 1;
  private dragStart?: { x: number; y: number; panX: number; panY: number };
  private pinch?: { dist: number; zoom: number };
  private readonly limits = tileRectBounds(ESTATE);

  constructor(private scene: Phaser.Scene) {
    this.area = { x: 0, y: 0, w: scene.scale.width, h: scene.scale.height };
    const input = scene.input;
    input.addPointer(1);

    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      scene.registry.set('dragging', false);
      this.dragStart = { x: p.x, y: p.y, panX: this.pan.x, panY: this.pan.y };
    });
    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const [a, b] = [input.pointer1, input.pointer2];
      if (a.isDown && b.isDown) {
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (!this.pinch) this.pinch = { dist, zoom: this.userZoom };
        this.setUserZoom(this.pinch.zoom * (dist / this.pinch.dist), true);
        scene.registry.set('dragging', true);
        return;
      }
      this.pinch = undefined;
      if (!p.isDown || !this.dragStart) return;
      const dx = p.x - this.dragStart.x, dy = p.y - this.dragStart.y;
      if (!scene.registry.get('dragging') && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      scene.registry.set('dragging', true);
      this.pan.x = this.dragStart.panX - dx / this.zoom;
      this.pan.y = this.dragStart.panY - dy / this.zoom;
      this.clampPan();
      this.apply();
    });
    let lastTap = 0;
    input.on('pointerup', (p: Phaser.Input.Pointer) => {
      // Double tap on empty ground recenters (replaces the button on phones).
      if (!scene.registry.get('dragging') && p.getDuration() < 250 && input.hitTestPointer(p).length === 0) {
        if (p.upTime - lastTap < 320) { this.recenter(); lastTap = 0; } else lastTap = p.upTime;
      }
      this.dragStart = undefined;
      if (!input.pointer1.isDown && !input.pointer2.isDown) this.pinch = undefined;
      // Let object 'pointerup' handlers see the drag flag first, then clear it.
      scene.time.delayedCall(0, () => scene.registry.set('dragging', false));
    });
    // Phaser's RESIZE can land after the DOM layout event: refit on both.
    const onResize = () => this.refit(true);
    scene.scale.on('resize', onResize);
    scene.events.once('shutdown', () => scene.scale.off('resize', onResize));
    input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.setUserZoom(this.userZoom * (dy > 0 ? 0.9 : 1.1), true);
    });
  }

  setArea(area: Rect) {
    this.area = area;
    this.refit(true);
  }

  setFraming(r: TileRect, instant: boolean) {
    const b = tileRectBounds(r);
    this.frame = { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, w: b.x1 - b.x0, h: b.y1 - b.y0 };
    this.refit(instant);
  }

  recenter() {
    this.pan = { x: 0, y: 0 };
    this.userZoom = 1;
    this.refit(false);
  }

  private fitZoom(): number {
    // Side panels only cover the edges of the world, and the corners of an iso framing rect are empty
    // grass — so fit against a slightly wider area and allow some corner cropping.
    const w = Math.max(this.area.w, this.scene.scale.width * 0.7);
    const z = Math.min(w / this.frame.w, this.area.h / this.frame.h) * FRAMING_CROP;
    return Phaser.Math.Clamp(z, 0.3, 1.6);
  }

  private refit(instant: boolean) {
    this.targetZoom = this.fitZoom() * this.userZoom;
    if (instant) this.zoom = this.targetZoom;
    this.clampPan();
    this.apply();
  }

  private setUserZoom(z: number, instant: boolean) {
    this.userZoom = Phaser.Math.Clamp(z, USER_ZOOM_MIN, USER_ZOOM_MAX);
    this.refit(instant);
  }

  private clampPan() {
    const L = this.limits;
    const maxX = Math.max(0, (L.x1 - L.x0) / 2 - this.area.w / (2 * this.zoom));
    const maxY = Math.max(0, (L.y1 - L.y0) / 2 - this.area.h / (2 * this.zoom));
    const cx = (L.x0 + L.x1) / 2, cy = (L.y0 + L.y1) / 2;
    const px = Phaser.Math.Clamp(this.frame.cx + this.pan.x, cx - maxX, cx + maxX);
    const py = Phaser.Math.Clamp(this.frame.cy + this.pan.y, cy - maxY, cy + maxY);
    this.pan.x = px - this.frame.cx;
    this.pan.y = py - this.frame.cy;
  }

  /** Eases zoom toward the target each frame (smooth zoom-out when the estate grows). */
  update(dt: number) {
    if (Math.abs(this.zoom - this.targetZoom) < 0.001) return;
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 3);
    this.apply();
  }

  private apply() {
    const cam = this.scene.cameras.main;
    const { width: w, height: h } = this.scene.scale;
    cam.setZoom(this.zoom);
    // Place world point (frame center + pan) at the center of the free UI area.
    const wx = this.frame.cx + this.pan.x, wy = this.frame.cy + this.pan.y;
    const sx = this.area.x + this.area.w / 2, sy = this.area.y + this.area.h / 2;
    cam.scrollX = wx - w / 2 - (sx - w / 2) / this.zoom;
    cam.scrollY = wy - h / 2 - (sy - h / 2) / this.zoom;
  }
}
