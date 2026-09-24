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
  /** Portal asked the game to pause/resume (tab switch inside the portal, ad break…). */
  onPauseChange(fn: (paused: boolean) => void): void;
}

export class LocalPlatformAdapter implements PlatformAdapter {
  readonly name: string = 'local';
  async init() {}
  async showRewardedAd() { return false; }
  async showInterstitial() {}
  gameplayStart() {}
  gameplayStop() {}
  happyTime() {}
  async cloudSave() { return false; }
  async getUser() { return null; }
  onPauseChange(_fn: (paused: boolean) => void) {}
}

const ATHG_ORIGIN = 'https://athg.antonycorp11.workers.dev';

interface AthgSdk {
  ready(): void;
  gameStarted(): void;
  showRewardedAd(): Promise<{ status: string; rewarded: boolean }>;
  on(event: 'pause' | 'resume' | 'init', fn: (data?: unknown) => void): void;
}

/**
 * ATHG portal: the game runs on its own Cloudflare Worker, embedded in an iframe by the portal. The SDK is
 * loaded from the portal's origin; if it cannot load, everything silently falls back to local behaviour.
 */
export class AthgPlatformAdapter extends LocalPlatformAdapter {
  override readonly name = 'athg';
  private sdk: AthgSdk | null = null;
  private started = false;

  override async init() {
    this.sdk = await new Promise<AthgSdk | null>((resolve) => {
      const script = document.createElement('script');
      script.src = `${ATHG_ORIGIN}/sdk/athg-sdk.js`;
      script.onload = () => resolve((window as unknown as { ATHG?: AthgSdk }).ATHG ?? null);
      script.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 4000);
      document.head.append(script);
    });
    this.sdk?.ready();
  }

  override gameplayStart() {
    if (this.started) return;
    this.started = true; // ATHG counts one "game started" per session
    this.sdk?.gameStarted();
  }

  override async showRewardedAd() {
    const r = await this.sdk?.showRewardedAd();
    return Boolean(r?.rewarded);
  }

  override onPauseChange(fn: (paused: boolean) => void) {
    this.sdk?.on('pause', () => fn(true));
    this.sdk?.on('resume', () => fn(false));
  }
}

const inIframe = typeof window !== 'undefined' && window.parent !== window;
export const platform: PlatformAdapter = inIframe ? new AthgPlatformAdapter() : new LocalPlatformAdapter();
