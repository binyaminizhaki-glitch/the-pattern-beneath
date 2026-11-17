import { useEffect, useRef } from 'react';

// One timer for the visible shot/phase. Pausing preserves its remaining time.
export function useSceneTimer(
  key: string | null,
  duration: number,
  paused: boolean,
  onDone: () => void,
) {
  const callback = useRef(onDone);
  callback.current = onDone;
  const clock = useRef({
    key,
    remaining: duration,
    started: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  useEffect(() => {
    const state = clock.current;
    if (state.key !== key) {
      state.key = key;
      state.remaining = duration;
    }
    if (!key || paused) return;
    state.started = performance.now();
    state.timer = setTimeout(() => {
      state.timer = null;
      state.remaining = 0;
      callback.current();
    }, state.remaining);
    return () => {
      if (state.timer !== null) {
        clearTimeout(state.timer);
        state.timer = null;
        state.remaining = Math.max(0, state.remaining - (performance.now() - state.started));
      }
    };
  }, [key, duration, paused]);

  // The supplied game client advances short frames without waiting for wall-clock time.
  return (milliseconds: number): number => {
    const state = clock.current;
    if (!key || paused || state.key !== key || !Number.isFinite(milliseconds) || milliseconds <= 0)
      return 0;
    const elapsed = state.timer === null ? 0 : performance.now() - state.started;
    state.remaining = Math.max(0, state.remaining - elapsed);
    if (state.timer !== null) clearTimeout(state.timer);
    const consumed = Math.min(milliseconds, state.remaining);
    state.remaining -= consumed;
    state.started = performance.now();
    if (state.remaining <= 0) {
      state.timer = null;
      callback.current();
    } else {
      state.timer = setTimeout(() => {
        state.timer = null;
        state.remaining = 0;
        callback.current();
      }, state.remaining);
    }
    return consumed;
  };
}
