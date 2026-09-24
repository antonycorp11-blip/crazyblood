// Holds the live GameState. Replaced wholesale on load/import/reset (listeners get 'state:replaced').
import { createNewState, type GameState } from './GameState';
import { bus } from './EventBus';

class Store {
  state: GameState = createNewState();

  replace(next: GameState) {
    this.state = next;
    bus.emit('state:replaced');
  }
}

export const store = new Store();
