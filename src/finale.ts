// The screen after the last level: the header says every level is peeled, the panel congratulates, and
// there is nothing left to play on it, so a tap anywhere opens the menu (replay a level, clear progress).

/** The panel's word once every level is peeled. */
export const FINALE_TEXT = 'Congratulations!';

/** Where a tap lands, and what is on screen when it does. */
export interface Tap {
  /** The final screen is showing. */
  finale: boolean;
  /** The menu is already open. */
  menuOpen: boolean;
  /** The tap is on a control that handles it itself: the menu, its button, the end button. */
  handled: boolean;
}

/** Whether a tap opens the menu: on the final screen, anywhere no control already handles it. */
export function tapOpensMenu(t: Tap): boolean {
  return t.finale && !t.menuOpen && !t.handled;
}
