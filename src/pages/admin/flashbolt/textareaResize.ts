const pending = new Set<HTMLTextAreaElement>();
let frame: number | undefined;

// Reset all heights before measuring any field. Interleaving writes and reads
// forces a separate layout for every textarea in a large set.
export function scheduleTextareaResize(textarea: HTMLTextAreaElement) {
  pending.add(textarea);
  if (frame === undefined) {
    frame = requestAnimationFrame(() => {
      frame = undefined;
      const fields = [...pending].filter(field => field.isConnected);
      pending.clear();
      fields.forEach(field => { field.style.height = "auto"; });
      const heights = fields.map(field => field.scrollHeight);
      fields.forEach((field, index) => { field.style.height = `${heights[index]}px`; });
    });
  }
  return () => {
    pending.delete(textarea);
    if (!pending.size && frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
  };
}
