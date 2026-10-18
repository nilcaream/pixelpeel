// A button that asks before it acts: the first tap arms it, a second tap within the window acts, and a tap
// after the window has passed arms it again. Time is passed in, so the page uses the clock and a test
// uses numbers.

/** How long an armed button waits for the second tap, in ms. */
export const CONFIRM_MS = 1000;

export interface Confirm {
  /** A tap at `now`: 'arm' when it only asks, 'act' when it is the second tap in time. */
  tap(now: number): 'arm' | 'act';
  /** Whether a tap at `now` would act. */
  armed(now: number): boolean;
  /** Back to unarmed, as when the menu is opened again. */
  reset(): void;
}

export function confirmTaps(windowMs = CONFIRM_MS): Confirm {
  let armedAt = Number.NEGATIVE_INFINITY;
  const armed = (now: number): boolean => now - armedAt < windowMs;
  return {
    tap(now) {
      if (armed(now)) {
        armedAt = Number.NEGATIVE_INFINITY;
        return 'act';
      }
      armedAt = now;
      return 'arm';
    },
    armed,
    reset() {
      armedAt = Number.NEGATIVE_INFINITY;
    },
  };
}
