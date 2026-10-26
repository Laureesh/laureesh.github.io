/** Presentation only: current calculator values are primary; old comparisons stay collapsed. */
export function groupFitnessHistory(root: Element): void {
  const plan = root.querySelector('[data-personal-fitness-note]');
  if (!plan || plan.querySelector('[data-fitness-history]')) return;
  const titles = new Set(['My recorded profile — December 2024', 'Calories and timelines — checked calculations', 'Original macro targets — not yet reconciled', 'Movement and hydration notes']);
  const history = document.createElement('details');
  history.setAttribute('data-fitness-history', '');
  const summary = document.createElement('summary');
  summary.textContent = 'Original records (December 2024)';
  history.append(summary);
  for (const heading of [...plan.querySelectorAll('h2')]) {
    if (!titles.has(heading.textContent?.trim() ?? '')) continue;
    const section: Element[] = [heading];
    let next = heading.nextElementSibling;
    while (next && !/^H[12]$/.test(next.tagName)) { section.push(next); next = next.nextElementSibling; }
    // Never hide tasks or change their order/progress counters.
    if (section.some(node => node.matches('ul.notebook-todo') || node.querySelector('ul.notebook-todo'))) continue;
    history.append(...section);
  }
  // The former blank profile is replaced by the working calculator inputs.
  for (const p of plan.querySelectorAll('p')) {
    if (p.textContent?.trim() === 'Current weight: ______ lb · Measured on: ______ · Current age: ______ · Chosen goal: ______ lb') p.remove();
  }
  if (history.children.length > 1) plan.append(history);
}
