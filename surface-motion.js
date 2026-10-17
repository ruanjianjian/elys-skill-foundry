// Page-surface motion only. Media playback and sound belong to app.js.
export function initSurfaceMotion({ grid, items, reduced, hoverMedia }) {
  if (!grid) return () => {};
  const cards = items.filter((item) => item.card && item.preview);
  const removers = [];
  const flashes = new Map();
  const entrances = new Map();
  const entered = new WeakSet();
  let active = null;
  let pointer = null;
  let focused = null;
  let leaveTimer;
  let disposed = false;

  const allowed = () => !disposed && !document.hidden && !reduced();
  const desktop = () => allowed() && innerWidth >= 1041 && hoverMedia.matches;
  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    removers.push(() => target.removeEventListener(name, callback, options));
  }
  function clearLeave() {
    clearTimeout(leaveTimer);
    leaveTimer = undefined;
  }
  function paintIntent(item) {
    active = desktop() ? item : null;
    for (const candidate of cards)
      candidate.card.classList.toggle("has-intent", candidate === active);
    if (!desktop()) {
      grid.style.removeProperty("grid-template-columns");
      return;
    }
    const column = active ? cards.indexOf(active) % 3 : -1;
    grid.style.gridTemplateColumns = Array.from(
      { length: 3 },
      (_, index) =>
        "minmax(0, " +
        (column < 0 ? "1fr" : index === column ? "1.24fr" : "0.88fr") +
        ")",
    ).join(" ");
  }
  function clearFlash(item) {
    clearTimeout(flashes.get(item));
    flashes.delete(item);
    item.card.classList.remove("is-flashing");
  }
  function cancelEntrance(item) {
    const animation = entrances.get(item);
    if (animation) animation.cancel();
    entrances.delete(item);
  }
  function clearVisuals() {
    clearLeave();
    pointer = null;
    focused = null;
    for (const item of cards) {
      clearFlash(item);
      cancelEntrance(item);
    }
    paintIntent(null);
  }
  function fallBackSoon() {
    clearLeave();
    leaveTimer = setTimeout(() => {
      leaveTimer = undefined;
      if (!disposed) paintIntent(focused || pointer);
    }, 160);
  }
  function sync() {
    if (!desktop()) clearVisuals();
    else paintIntent(active);
  }
  function enterOnce(item, index) {
    if (entered.has(item.card)) return;
    entered.add(item.card);
    if (!allowed() || typeof item.card.animate !== "function") return;
    // Content is visible before and throughout enhancement; no JS-hidden state.
    const animation = item.card.animate(
      [
        { opacity: 0.84, transform: "translateY(7px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 220,
        delay: index < 3 ? index * 40 : 0,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "none",
      },
    );
    entrances.set(item, animation);
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (entrances.get(item) === animation) entrances.delete(item);
      });
  }

  for (const item of cards) {
    listen(item.card, "pointerenter", (event) => {
      if (event.pointerType !== "mouse" || !desktop()) return;
      clearLeave();
      pointer = item;
      paintIntent(item);
    });
    listen(item.card, "pointerleave", (event) => {
      if (event.pointerType !== "mouse") return;
      if (pointer === item) pointer = null;
      if (focused === item) paintIntent(item);
      else fallBackSoon();
    });
    listen(item.card, "focusin", (event) => {
      if (!desktop() || !event.target.matches(":focus-visible")) return;
      clearLeave();
      focused = item;
      paintIntent(item);
    });
    listen(item.card, "focusout", (event) => {
      if (item.card.contains(event.relatedTarget)) return;
      if (focused === item) focused = null;
      if (pointer) {
        clearLeave();
        paintIntent(pointer);
      } else fallBackSoon();
    });
  }

  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const index = cards.findIndex(
                (item) => item.card === entry.target,
              );
              if (index < 0) continue;
              const item = cards[index];
              if (!entry.isIntersecting) {
                clearFlash(item);
                cancelEntrance(item);
                if (pointer === item) pointer = null;
                if (focused === item) focused = null;
                if (active === item) {
                  clearLeave();
                  paintIntent(focused || pointer);
                }
              } else if (entry.intersectionRatio >= 0.08)
                enterOnce(item, index);
            }
          },
          { threshold: [0, 0.08] },
        )
      : null;
  if (observer) for (const item of cards) observer.observe(item.card);

  listen(document, "foundry:copy-success", (event) => {
    if (!allowed()) return;
    const id = event.detail?.cardId;
    const item = cards.find(
      (item) => item.card.id === id || item.card.dataset.skill === id,
    );
    if (!item) return;
    clearFlash(item);
    // Restart CSS pulse on repeated copies, with only one expiry timer per card.
    void item.card.offsetWidth;
    item.card.classList.add("is-flashing");
    flashes.set(
      item,
      setTimeout(() => {
        flashes.delete(item);
        item.card.classList.remove("is-flashing");
      }, 380),
    );
  });
  listen(document, "foundry:motion-change", sync);
  listen(document, "visibilitychange", () => {
    if (document.hidden) clearVisuals();
    else sync();
  });
  listen(window, "resize", sync, { passive: true });
  listen(hoverMedia, "change", sync);
  sync();

  return function cleanup() {
    if (disposed) return;
    disposed = true;
    clearVisuals();
    observer?.disconnect();
    for (const remove of removers) remove();
    grid.style.removeProperty("grid-template-columns");
    for (const item of cards)
      item.card.classList.remove("has-intent", "is-flashing");
  };
}
