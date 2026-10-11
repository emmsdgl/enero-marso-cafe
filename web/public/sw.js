/*
 * Enero Marso staff app: shows push notifications (new orders, payments to check, customer
 * messages) and opens the order when one is tapped. It caches nothing on purpose, so staff
 * always see the live board.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Enero Marso", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Enero Marso", {
      body: data.body || "",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      icon: "/icons/staff-192.png",
      badge: "/icons/staff-badge.png",
      timestamp: data.at || Date.now(),
      data: { url: data.url || "/staff/orders" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/staff/orders", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const same = open.find((c) => c.url === url);
      if (same) return same.focus();
      // Reuse a staff window that's already open rather than stacking new ones
      const staff = open.find((c) => new URL(c.url).pathname.startsWith("/staff"));
      if (staff) {
        await staff.focus();
        return staff.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
