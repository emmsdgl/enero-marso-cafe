import "server-only";
import Pusher from "pusher";

/**
 * Live updates through Pusher Channels. Events only say "this changed" (no names, phones or
 * items), and pages then fetch the details from our own server, so no personal data passes
 * through Pusher. Without keys this does nothing, and pages fall back to checking every 20 s.
 */
let client: Pusher | null | undefined;
function pusher() {
  if (client === undefined) {
    const { PUSHER_APP_ID: appId, PUSHER_SECRET: secret, NEXT_PUBLIC_PUSHER_KEY: key, NEXT_PUBLIC_PUSHER_CLUSTER: cluster } = process.env;
    client = appId && secret && key && cluster ? new Pusher({ appId, key, secret, cluster, useTLS: true }) : null;
  }
  return client;
}

export const channels = {
  branch: (branchId: string) => `branch-${branchId}`,
  order: (orderId: string) => `order-${orderId}`,
};

export async function announce(names: string[]) {
  const p = pusher();
  if (!p) return;
  try {
    await p.trigger(names, "changed", { at: Date.now() });
  } catch (e) {
    // A missed ping is harmless: pages also check on their own
    console.error("Live update failed", e);
  }
}
