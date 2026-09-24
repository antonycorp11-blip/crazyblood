import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { FarmScene } from '../scenes/FarmScene';
import { Colors } from './Constants';

export function createPhaserConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: Colors.backgroundDark,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    // Economy runs on wall-clock time in Game.ts; Phaser only renders. Let it keep 60 fps targets.
    fps: { target: 60, smoothStep: true },
    input: { activePointers: 3 },
    audio: { disableWebAudio: false },
    scene: [BootScene, PreloadScene, FarmScene],
  };
}
