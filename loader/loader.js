/* Enero Marso Cafe — logo loader
   Progress follows real page loading (images, fonts, window load), paced so the
   logo intro always finishes before the loader lifts. */
(function () {
  const INTRO_MS = 3550;   // until "Premier" finishes writing
  const RULE_START_MS = 1900;
  const SHINE_MS = 1050;
  const MAX_WAIT_MS = 9000; // never hold visitors longer than this

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function run(loader) {
    const status = loader.querySelector("[data-em-status]");
    const root = document.documentElement;
    root.classList.add("em-locked");
    // Reset instantly (no reverse transitions), then reflow so animations restart
    const mark = loader.querySelector(".em-mark");
    loader.style.transition = mark.style.transition = "none";
    loader.classList.remove("is-playing", "is-finishing", "is-leaving", "is-gone");
    loader.style.setProperty("--em-progress", 0);
    void loader.offsetWidth;
    loader.style.transition = mark.style.transition = "";
    loader.setAttribute("aria-busy", "true");

    // Count what the page still has to load (the loader's own artwork excluded)
    const images = Array.from(document.images).filter((img) => !loader.contains(img));
    let total = images.length + 2; // + fonts + window load
    let done = 0;
    const tick = () => { done = Math.min(total, done + 1); };
    images.forEach((img) => {
      if (img.complete) tick();
      else {
        img.addEventListener("load", tick, { once: true });
        img.addEventListener("error", tick, { once: true });
      }
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(tick);
    if (document.readyState === "complete") tick();
    else window.addEventListener("load", tick, { once: true });

    const art = new Image();
    art.src = loader.dataset.emSrc || "assets/enero-marso-logo.jpg";
    const ready = art.decode ? art.decode().catch(() => {}) : Promise.resolve();

    ready.then(() => {
      const start = performance.now();
      const intro = reduced.matches ? 900 : INTRO_MS;
      const ruleStart = reduced.matches ? 0 : RULE_START_MS;
      let shown = 0;
      let lastAnnounced = -1;
      loader.classList.add("is-playing");

      function frame(now) {
        const t = now - start;
        const target = done / total;
        // The rules may not run ahead of the intro, nor ahead of real loading
        const pace = Math.max(0, Math.min(1, (t - ruleStart) / (intro - ruleStart + 250)));
        const goal = Math.min(target, pace);
        shown += (goal - shown) * 0.12;
        if (goal - shown < 0.002) shown = goal;
        loader.style.setProperty("--em-progress", shown.toFixed(4));

        const pct = Math.round(shown * 10) * 10;
        if (pct !== lastAnnounced) {
          lastAnnounced = pct;
          loader.setAttribute("aria-valuenow", pct);
          if (status) status.textContent = pct + "% loaded";
        }

        const loaded = shown >= 0.999 && t >= intro;
        if (loaded || t >= MAX_WAIT_MS) finish();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });

    function finish() {
      loader.style.setProperty("--em-progress", 1);
      loader.classList.add("is-finishing");
      setTimeout(() => {
        loader.classList.add("is-leaving");
        loader.setAttribute("aria-busy", "false");
        root.classList.remove("em-locked");
        setTimeout(() => {
          loader.classList.add("is-gone");
          loader.dispatchEvent(new CustomEvent("em:loaded", { bubbles: true }));
        }, reduced.matches ? 450 : 1400);
      }, reduced.matches ? 150 : SHINE_MS - 150);
    }
  }

  const loader = document.querySelector("[data-em-loader]");
  if (!loader) return;
  run(loader);
  window.EneroMarsoLoader = { replay: () => run(loader) };
})();
