// Population milestones: the classic incremental "jump". Each one multiplies production and gets a
// celebration on the map. Thresholds keep going past the table so there is always a next one.
export const MILESTONE_TABLE = [10, 25, 50, 100, 200, 300, 400, 500, 750, 1000];
export const MILESTONE_PAST_TABLE_STEP = 250;
export const MILESTONE_BASE_MULT = 2;

export function milestoneThreshold(index: number): number {
  const t = MILESTONE_TABLE;
  return index < t.length ? t[index] : t[t.length - 1] + (index - t.length + 1) * MILESTONE_PAST_TABLE_STEP;
}

/** How many milestones `humans` has reached. */
export function milestonesReached(humans: number): number {
  let n = 0;
  while (humans >= milestoneThreshold(n)) n++;
  return n;
}
