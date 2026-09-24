// Drives Mordecai's onboarding from data/tutorial.ts. The UI reads view() and renders the bubble/highlight.
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { Analytics } from '../core/Analytics';
import { TUTORIAL, type TutorialTarget } from '../data/tutorial';

export interface TutorialView { lineKey: string; params?: Record<string, string | number>; target?: TutorialTarget; tapToContinue: boolean; reaction: boolean }

let reaction: { key: string; params?: Record<string, string | number>; until: number } | null = null;
let startedStep = -1;

export const TutorialSystem = {
  isActive(): boolean {
    return !store.state.tutorial.done;
  },

  /** What to show right now, or null (hidden / waiting silently). */
  view(now = Date.now()): TutorialView | null {
    if (reaction && now < reaction.until) return { lineKey: reaction.key, params: reaction.params, tapToContinue: false, reaction: true };
    if (!this.isActive()) return null;
    const step = TUTORIAL[store.state.tutorial.step];
    if (!step) return null;
    if (step.showWhen && !step.showWhen(store.state)) return null;
    return { lineKey: step.lineKey, target: step.target, tapToContinue: !step.complete, reaction: false };
  },

  update(now = Date.now()) {
    const s = store.state;
    if (reaction && now >= reaction.until) { reaction = null; bus.emit('tutorial:changed'); }
    if (s.tutorial.done) return;
    const step = TUTORIAL[s.tutorial.step];
    if (!step) { this.finish(); return; }
    const visible = !step.showWhen || step.showWhen(s);
    if (visible && startedStep !== s.tutorial.step) {
      startedStep = s.tutorial.step;
      if (s.tutorial.step === 0) Analytics.track('tutorial_started');
      step.onStart?.(s);
      if (step.onStart) bus.emit('resources:changed');
      bus.emit('tutorial:changed');
    }
    if (step.complete && step.complete(s)) this.advance(now);
  },

  /** Tap on the bubble: advances steps that have no completion condition. */
  next(now = Date.now()) {
    if (reaction) { reaction = null; bus.emit('tutorial:changed'); return; }
    const step = TUTORIAL[store.state.tutorial.step];
    if (step && !step.complete) this.advance(now);
  },

  advance(now = Date.now()) {
    const s = store.state;
    const step = TUTORIAL[s.tutorial.step];
    Analytics.track('tutorial_step_completed', { step: step?.id });
    if (step?.doneKey) reaction = { key: step.doneKey, until: now + 4500 };
    s.tutorial.step++;
    if (s.tutorial.step >= TUTORIAL.length) this.finish();
    bus.emit('tutorial:changed');
  },

  /** One-off Mordecai line outside the tutorial (hints). Returns false if he is already talking. */
  say(key: string, params?: Record<string, string | number>, ms = 7000, now = Date.now()): boolean {
    if ((reaction && now < reaction.until) || this.view(now)) return false;
    reaction = { key, params, until: now + ms };
    bus.emit('tutorial:changed');
    return true;
  },

  skip() {
    reaction = null;
    this.finish();
    bus.emit('tutorial:changed');
  },

  finish() {
    const s = store.state;
    s.tutorial.done = true;
    s.unlocks.market = true; // never gate core content behind a skipped tutorial
    bus.emit('resources:changed');
  },

  reset() { reaction = null; startedStep = -1; },
};
