"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { canInstall, catchInstallPrompt, install, installSubscribe, isIos, isStandalone, registration } from "@/lib/push-client";

let started = false;
const noSubscribe = () => () => {};

/** Registers the service worker (it makes the clock-in screen installable) and listens for the install offer */
export default function KioskApp() {
  useEffect(() => {
    if (started || !("serviceWorker" in navigator)) return;
    started = true;
    catchInstallPrompt();
    registration().catch(() => {});
  }, []);
  return null;
}

/**
 * "Install the clock-in app": the browser's own install on Android and computers, the Share steps on
 * an iPad. Nothing once it's running as the app. An iPad app keeps its own sign-ins, so the steps
 * say to set the tablet up again inside the app.
 */
export function InstallKiosk({ dismissible = false }: { dismissible?: boolean }) {
  const standalone = useSyncExternalStore(noSubscribe, isStandalone, () => true);
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  const installable = useSyncExternalStore(installSubscribe, canInstall, () => false);
  const hidden = useSyncExternalStore(noSubscribe, () => {
    try {
      return dismissible && localStorage.getItem("em-kiosk-install-hidden") === "1";
    } catch {
      return false;
    }
  }, () => true);
  const [closed, setClosed] = useState(false);
  if (standalone || hidden || closed || (!installable && !ios)) return null;

  const close = () => {
    try {
      localStorage.setItem("em-kiosk-install-hidden", "1");
    } catch {}
    setClosed(true);
  };
  return (
    <div className="kiosk-install" role="region" aria-label="Install the clock-in app">
      {installable ? (
        <>
          <p>Install the clock-in app: it opens straight to this screen, full screen, from the home screen.</p>
          <button type="button" className="kiosk-install-go" onClick={() => install()}>Install the app</button>
        </>
      ) : (
        <p>
          To open this full screen: tap <b>Share</b>, then <b>Add to Home Screen</b>. Open <b>EM Clock-in</b> from the home screen and set the tablet up
          there once (the app keeps its own sign-in).
        </p>
      )}
      {dismissible && <button type="button" className="kiosk-install-later" onClick={close}>Not now</button>}
    </div>
  );
}
