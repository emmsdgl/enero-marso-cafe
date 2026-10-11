"use client";

import { useEffect } from "react";
import { refreshPush } from "@/app/staff/account/push-actions";
import { catchInstallPrompt, pushSupported, registration } from "@/lib/push-client";

let started = false;

/**
 * Runs on every staff page: registers the service worker (it shows notifications and makes the
 * portal installable), listens for the browser's install offer, and once a day sends this
 * device's push keys to the server, since browsers can renew them.
 */
export default function StaffApp() {
  useEffect(() => {
    if (started || !("serviceWorker" in navigator)) return;
    started = true;
    catchInstallPrompt();
    registration()
      .then(async (reg) => {
        if (!pushSupported() || Notification.permission !== "granted") return;
        const sub = await reg.pushManager.getSubscription();
        const today = new Date().toDateString();
        let last: string | null = null;
        try {
          last = localStorage.getItem("em-push-refreshed");
        } catch {}
        if (!sub || last === today) return;
        await refreshPush(sub.toJSON());
        try {
          localStorage.setItem("em-push-refreshed", today);
        } catch {}
      })
      .catch(() => {});
  }, []);
  return null;
}
