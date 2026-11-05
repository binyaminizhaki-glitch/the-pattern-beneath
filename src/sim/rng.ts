/** Stateless event noise: adding a new draw cannot shift another event's noise. */
export function randomAt(seed: number, turn: number, agentId: string, eventType: string): number {
  const key = `${seed}|${turn}|${agentId}|${eventType}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
export const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
export const mean = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
