"use client";

import { useEffect } from "react";

/**
 * Puts something in the browser tab's title ("(1) Your order…"), so it's seen from another tab.
 * Next sets its own title after ours on every navigation, so ours is put back whenever it changes.
 */
export function useTabTitle(title: string) {
  useEffect(() => {
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => watch.disconnect();
  }, [title]);
}
