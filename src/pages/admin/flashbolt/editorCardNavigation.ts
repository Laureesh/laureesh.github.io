// Deferred cards and auto-sized textareas can move the destination after the
// initial jump. Keep it aligned only until that layout settles, or the user acts.
export function jumpToEditorCard(element: HTMLElement, topbar: HTMLElement | null) {
  let frame = 0;
  let settledTimer = 0;
  let deadlineTimer = 0;
  let stopped = false;
  const observer = new ResizeObserver(schedule);
  const cancelEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(settledTimer);
    window.clearTimeout(deadlineTimer);
    observer.disconnect();
    cancelEvents.forEach(type => window.removeEventListener(type, stop, true));
  }
  function align() {
    if (stopped) return;
    if (!element.isConnected) { stop(); return; }
    const offset = (topbar?.getBoundingClientRect().bottom ?? 76) + 12;
    const delta = element.getBoundingClientRect().top - offset;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
    window.clearTimeout(settledTimer);
    settledTimer = window.setTimeout(stop, 250);
  }
  function schedule() {
    window.clearTimeout(settledTimer);
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(align);
  }

  element.dispatchEvent(new Event("reveal-editor-card"));
  element.querySelector<HTMLTextAreaElement>(".card-text-field textarea")?.focus({ preventScroll: true });
  observer.observe(element.closest(".card-editor-list") ?? element);
  cancelEvents.forEach(type => window.addEventListener(type, stop, { capture: true, passive: true }));
  deadlineTimer = window.setTimeout(stop, 2000);
  align();
  schedule();
  return stop;
}
