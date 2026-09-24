// Thin wrapper over Phaser's sound manager with categories (Music / SFX / UI / Ambient) and saved prefs.
import type Phaser from 'phaser';
import { store } from '../core/Store';
import type { SfxKey } from '../data/assets';

type Category = 'music' | 'sfx' | 'ui' | 'ambient';

const CATEGORY_VOLUME: Record<Category, number> = { music: 0.45, sfx: 0.7, ui: 0.5, ambient: 0.35 };
const MIN_GAP_MS = 60; // same sound retriggered faster than this is dropped (tap spam)

let sound: Phaser.Sound.BaseSoundManager | null = null;
let music: Phaser.Sound.BaseSound | null = null;
let musicKey: SfxKey | null = null;
const lastPlayed = new Map<string, number>();

function enabled(cat: Category): boolean {
  const s = store.state.settings;
  return cat === 'music' ? s.music : s.sfx;
}

export const AudioManager = {
  attach(manager: Phaser.Sound.BaseSoundManager) {
    sound = manager;
    sound.pauseOnBlur = true;
  },

  play(key: SfxKey, cat: Category = 'sfx', rate = 1) {
    if (!sound || !enabled(cat) || !sound.game.cache.audio.exists(key)) return;
    const now = performance.now();
    if (now - (lastPlayed.get(key) ?? 0) < MIN_GAP_MS) return;
    lastPlayed.set(key, now);
    sound.play(key, { volume: CATEGORY_VOLUME[cat] * store.state.settings.master, rate });
  },

  ui(key: SfxKey = 'sfx_click') { this.play(key, 'ui'); },

  playMusic(key: SfxKey) {
    if (!sound) return;
    musicKey = key;
    if (!store.state.settings.music) { this.stopMusic(); return; }
    if (music && music.key === key && music.isPlaying) return;
    if (!sound.game.cache.audio.exists(key)) return;
    this.stopMusic();
    music = sound.add(key, { loop: true, volume: CATEGORY_VOLUME.music * store.state.settings.master });
    music.play();
  },

  stopMusic() {
    music?.stop();
    music?.destroy();
    music = null;
  },

  /** Re-apply after a settings change. */
  refresh() {
    if (!sound) return;
    if (!store.state.settings.music) this.stopMusic();
    else if (musicKey) {
      if (music) (music as Phaser.Sound.WebAudioSound).setVolume?.(CATEGORY_VOLUME.music * store.state.settings.master);
      this.playMusic(musicKey);
    }
  },
};
