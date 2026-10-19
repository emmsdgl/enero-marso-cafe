/**
 * Browser side of the staff app: what this device can do, the "install" prompt, and push keys.
 * iPhones only allow notifications in the installed app (Add to Home Screen, iOS 16.4 or later).
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The VAPID public key as the bytes PushManager.subscribe wants */
export function keyBytes(base64url: string) {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function registration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

// ——— "Install the staff app" (Chrome and Edge on Android and computers) ———
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export function catchInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of the browser's banner
    deferred = e as InstallPrompt;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}
export const installSubscribe = (f: () => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};
export const canInstall = () => deferred !== null;
export async function install() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice.catch(() => null);
  deferred = null;
  listeners.forEach((f) => f());
}
