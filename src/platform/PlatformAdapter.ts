// Portal integration boundary (CrazyGames / Poki / ATHG). Game code talks only to this interface.
// Rewarded ads are always optional bonuses — the economy must never depend on them.
export interface PlatformUser { id: string; name: string }

export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  showRewardedAd(): Promise<boolean>;
  showInterstitial(): Promise<void>;
  gameplayStart(): void;
  gameplayStop(): void;
  happyTime(): void;
  cloudSave(data: string): Promise<boolean>;
  getUser(): Promise<PlatformUser | null>;
}

export class LocalPlatformAdapter implements PlatformAdapter {
  readonly name = 'local';
  async init() {}
  async showRewardedAd() { return false; }
  async showInterstitial() {}
  gameplayStart() {}
  gameplayStop() {}
  happyTime() {}
  async cloudSave() { return false; }
  async getUser() { return null; }
}

export const platform: PlatformAdapter = new LocalPlatformAdapter();
