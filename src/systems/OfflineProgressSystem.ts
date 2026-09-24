// Offline / background catch-up. Used both on load (time since lastSaveTimestamp) and when the tab comes
// back after being hidden — we never rely on JS timers running in the background.
import { bus } from '../core/EventBus';
import { OFFLINE_REPORT_MIN_SEC } from '../core/Constants';
import { Progression } from '../data/progression';
import { EconomySystem } from './EconomySystem';
import { LegacySystem } from './LegacySystem';

export const OfflineProgressSystem = {
  efficiency(): number { return Math.min(1, Progression.offlineEfficiency + LegacySystem.effect('offlineEfficiency')); },
  capSeconds(): number { return Progression.offlineCapSec + LegacySystem.effect('offlineCapHours') * 3600; },

  apply(elapsedSec: number) {
    const seconds = Math.min(Math.max(0, elapsedSec), this.capSeconds());
    if (seconds <= 0) return;
    const r = EconomySystem.simulate(seconds, this.efficiency());
    if (seconds >= OFFLINE_REPORT_MIN_SEC) {
      bus.emit('offline:report', { seconds: elapsedSec, blood: r.collected, gold: r.gold, tank: r.tankGain });
    }
  },
};
