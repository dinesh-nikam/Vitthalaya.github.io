/**
 * Digital Pandharpur — Pure player logic (no I/O, unit-tested).
 *
 * Repeat modes:
 *   'off' — advance; stop at the end of the queue
 *   'all' — advance; wrap around
 *   'one' — replay the current track
 */

export type RepeatMode = 'off' | 'all' | 'one';

export const REPEAT_CYCLE: RepeatMode[] = ['off', 'all', 'one'];

export function cycleRepeatMode(mode: RepeatMode): RepeatMode {
  const idx = REPEAT_CYCLE.indexOf(mode);
  return REPEAT_CYCLE[(idx + 1) % REPEAT_CYCLE.length];
}

/**
 * Fisher–Yates shuffle of queue indices, keeping `keepFirst` first so
 * toggling shuffle mid-playback doesn't jump tracks.
 */
export function generateShuffleOrder(length: number, keepFirst: number, random: () => number = Math.random): number[] {
  if (length <= 1) return [0];
  const keep = Math.min(Math.max(keepFirst, 0), length - 1);
  const indices = Array.from({ length }, (_, i) => i).filter((i) => i !== keep);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [keep, ...indices];
}

export interface NextIndexInput {
  queueLength: number;
  currentIndex: number;
  shuffleOrder: number[];
  isShuffle: boolean;
}

/** Next track index honoring shuffle + repeat-adjacent ordering. */
export function nextIndex({ queueLength, currentIndex, shuffleOrder, isShuffle }: NextIndexInput): number {
  if (queueLength <= 0) return 0;
  if (isShuffle && shuffleOrder.length === queueLength) {
    const pos = shuffleOrder.indexOf(currentIndex);
    return shuffleOrder[(pos + 1) % shuffleOrder.length];
  }
  return (currentIndex + 1) % queueLength;
}

/** Previous track index honoring shuffle. */
export function prevIndex({ queueLength, currentIndex, shuffleOrder, isShuffle }: NextIndexInput): number {
  if (queueLength <= 0) return 0;
  if (isShuffle && shuffleOrder.length === queueLength) {
    const pos = shuffleOrder.indexOf(currentIndex);
    return shuffleOrder[(pos - 1 + shuffleOrder.length) % shuffleOrder.length];
  }
  return (currentIndex - 1 + queueLength) % queueLength;
}

export function formatPlayerTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Whether a track change should autoplay: always for user-triggered plays,
 * and for repeat-adjacent advances it's the audio element's `ended` handler
 * that calls play() — so this helper is mostly used by tests to assert the
 * transport contract.
 */
export function shouldAutoPlayOnIndexChange(index: number, activeIndex: number): boolean {
  return index === activeIndex;
}
