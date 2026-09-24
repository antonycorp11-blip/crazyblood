// Internal analytics hook. Nothing leaves the device yet: events go to a ring buffer (visible in the
// debug panel) and, later, to whichever PlatformAdapter / analytics service gets wired in.
export type AnalyticsEvent =
  | 'game_started' | 'tutorial_started' | 'tutorial_step_completed' | 'human_bought' | 'upgrade_bought'
  | 'contract_accepted' | 'contract_completed' | 'market_opened' | 'legacy_opened' | 'prestige_completed'
  | 'session_end';

export interface AnalyticsRecord { event: AnalyticsEvent; at: number; data?: Record<string, unknown> }

const MAX = 200;
const buffer: AnalyticsRecord[] = [];
type Sink = (r: AnalyticsRecord) => void;
const sinks: Sink[] = [];

export const Analytics = {
  track(event: AnalyticsEvent, data?: Record<string, unknown>) {
    const r = { event, at: Date.now(), data };
    buffer.push(r);
    if (buffer.length > MAX) buffer.shift();
    for (const s of sinks) s(r);
  },
  addSink(s: Sink) { sinks.push(s); },
  recent(): readonly AnalyticsRecord[] { return buffer; },
};
