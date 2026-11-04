/**
 * Publishes the stable API consumed by code injected into the game bundle.
 * Reuses an existing bridge so references held by patches remain valid.
 * @param {Window & { __fx?: Record<string, unknown> }} target
 * @param {Record<string, unknown>} api
 */
export function publishFxBridge(target, api) {
  const bridge = target.__fx || (target.__fx = {});
  Object.assign(bridge, api);
  return bridge;
}
