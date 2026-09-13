const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineMarkdown(text: string): string {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map(part => {
    if (part.startsWith("`") && part.endsWith("`")) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    if (part.startsWith("**") && part.endsWith("**")) return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    return escapeHtml(part);
  }).join("");
}

/** Convert the lab-note Markdown subset without interpreting raw HTML as markup. */
export function labMarkdownToHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let list: "ol" | "ul" | null = null;
  let expectedNumber = 0;
  let code: string[] | null = null;
  const closeList = () => { if (list) output.push(`</${list}>`); list = null; };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^```/.test(line)) {
      closeList();
      if (code) { output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = null; }
      else code = [];
      continue;
    }
    if (code) { code.push(raw); continue; }
    if (!line) { closeList(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const title = heading[2].replace(/&#x20;|&#32;|&nbsp;/gi, " ").trim();
      output.push(`<h${heading[1].length}>${inlineMarkdown(title)}</h${heading[1].length}>`);
      continue;
    }
    const item = line.match(/^(?:(\d+)[.)]|([-*]))\s+(.+)$/);
    if (item) {
      const kind = item[1] ? "ol" : "ul";
      const number = Number(item[1]);
      if (list !== kind || (kind === "ol" && number !== expectedNumber)) {
        closeList(); output.push(kind === "ol" ? `<ol start="${number}">` : "<ul>"); list = kind;
      }
      output.push(`<li>${inlineMarkdown(item[3])}</li>`); expectedNumber = number + 1;
      continue;
    }
    closeList(); output.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList();
  if (code) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return output.join("");
}

function editorPlainText(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach(node => node.replaceWith("\n"));
  clone.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, pre").forEach(node => node.append("\n"));
  return clone.textContent ?? "";
}

export function removeStepLayout(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("ol.notebook-steps").forEach(list => {
    if (list.getAttribute("data-step-source") === "list") {
      list.removeAttribute("class"); list.removeAttribute("data-step-source");
    } else {
      const fragment = doc.createDocumentFragment();
      [...list.children].forEach(step => fragment.append(...step.childNodes));
      list.replaceWith(fragment);
    }
  });
  return doc.body.innerHTML;
}

export function formatStepLayout(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.querySelector(".notebook-steps")) return normalizeStepTitles(html);
  const text = editorPlainText(doc.body);
  if (!doc.querySelector("h1,h2,h3,h4,h5,h6,ol") && /(^|\n)\s*(?:#{1,6}\s|```|\d+[.)]\s)/.test(text)) {
    doc.body.innerHTML = labMarkdownToHtml(text);
  }
  // Pasted rich text may wrap the entire note in a single container.
  while (doc.body.children.length === 1 && /^(DIV|ARTICLE|SECTION)$/.test(doc.body.firstElementChild!.tagName)) {
    doc.body.innerHTML = doc.body.firstElementChild!.innerHTML;
  }
  const children = [...doc.body.childNodes];
  const headings = [...doc.body.children].filter(node => /^H[1-6]$/.test(node.tagName));
  // A title may precede smaller section headings, as in “Lab Steps” followed by H3s.
  const sectionHeading = headings.length === 1 && doc.body.querySelector("ol") ? undefined
    : headings.find(node => node !== headings[0] && node.tagName > headings[0].tagName) ?? headings[0];
  if (sectionHeading) {
    const level = sectionHeading.tagName;
    const steps = doc.createElement("ol"); steps.className = "notebook-steps";
    let current: HTMLLIElement | null = null;
    for (const node of children) {
      if (node instanceof Element && node.tagName === level) {
        if (!current) doc.body.insertBefore(steps, node);
        current = doc.createElement("li"); steps.append(current);
        // Preserve the original wording; numbering is supplied by the timeline.
        current.append(node);
      } else if (current) current.append(node);
    }
    return steps.children.length ? normalizeStepTitles(doc.body.innerHTML) : null;
  }
  const list = doc.body.querySelector("ol");
  if (!list) return null;
  list.classList.add("notebook-steps");
  list.setAttribute("data-step-source", "list");
  return doc.body.innerHTML;
}

export type StepChange =
  | { type: "add"; index: number }
  | { type: "remove" | "duplicate" | "up" | "down" | "complete"; index: number }
  | { type: "title"; index: number; title: string };

export function getLayoutSteps(html: string): { title: string; completed: boolean }[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const list = doc.querySelector("ol.notebook-steps");
  return list ? [...list.children].map((step, index) => ({
    title: step.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6")?.textContent ?? `Step ${index + 1}`,
    completed: step.getAttribute("data-completed") === "true",
  })) : [];
}

export function changeStepLayout(html: string, change: StepChange): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const list = doc.querySelector("ol.notebook-steps");
  if (!list) return html;
  const steps = [...list.children];
  const step = steps[change.index];
  if (change.type === "add") {
    const newStep = doc.createElement("li");
    newStep.innerHTML = "<h3>New step</h3><p><br></p>";
    list.insertBefore(newStep, steps[change.index] ?? null);
  } else if (step) {
    switch (change.type) {
      case "remove": step.remove(); break;
      case "duplicate": {
        const copy = step.cloneNode(true) as Element;
        copy.removeAttribute("data-completed");
        copy.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
        copy.removeAttribute("id");
        step.after(copy);
        break;
      }
      case "up": if (change.index > 0) steps[change.index - 1].before(step); break;
      case "down": if (change.index < steps.length - 1) steps[change.index + 1].after(step); break;
      case "complete":
        if (step.getAttribute("data-completed") === "true") step.removeAttribute("data-completed");
        else step.setAttribute("data-completed", "true");
        break;
      case "title": {
        let heading = step.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6");
        if (!heading) { heading = doc.createElement("h3"); step.prepend(heading); }
        heading.textContent = change.title.trim() || "Untitled step";
        break;
      }
    }
  }
  return normalizeStepTitles(doc.body.innerHTML);
}

export function startStepLayout(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const list = doc.createElement("ol"); list.className = "notebook-steps";
  const step = doc.createElement("li");
  const heading = doc.createElement("h3"); heading.textContent = "First step";
  step.append(heading, ...doc.body.childNodes);
  list.append(step); doc.body.append(list);
  if (step.children.length === 1) step.insertAdjacentHTML("beforeend", "<p><br></p>");
  return doc.body.innerHTML;
}

/** Require instructional structure, not just an ordinary numbered list. */
export function detectStepLayout(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.querySelector(".notebook-steps")) return null;
  const text = editorPlainText(doc.body);
  const outsideCode = doc.body.cloneNode(true) as HTMLElement;
  outsideCode.querySelectorAll("pre, code").forEach(node => node.remove());
  const readable = editorPlainText(outsideCode).replace(/```[^\n]*\n[\s\S]*?(?:```|$)/g, "");
  const headings = [...outsideCode.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(node => node.textContent ?? "");
  const lines = readable.split(/\n/).map(line => line.replace(/^#{1,6}\s+/, "").replace(/&#x20;|&#32;|&nbsp;/gi, " ").trim());
  const explicitSteps = [...headings, ...lines].filter(line => /^(?:step\s+\d+\b|\d+[.)]\s+(?:enable|disable|open|click|select|type|enter|press|run|check|verify|create|install|configure|save|connect|add|remove|restart|start|stop|navigate|at the prompt)\b)/i.test(line));
  const hasGuideTitle = [...headings, ...lines].some(line => /^(?:lab\s+)?(?:steps|instructions|procedure|walkthrough)\b/i.test(line));
  const listItems = outsideCode.querySelectorAll("ol > li").length;
  const instructionalItems = [...outsideCode.querySelectorAll("ol > li")].filter(node => /^(?:open|click|select|type|enter|press|run|check|verify|create|install|configure|save|connect|add|remove|restart|enable|disable)\b/i.test((node.textContent ?? "").trim())).length;
  const numberedLines = lines.filter(line => /^\d+[.)]\s+\S/.test(line)).length;
  if (new Set(explicitSteps).size < 2 && instructionalItems < 2 && !(hasGuideTitle && (listItems >= 2 || numberedLines >= 2))) return null;
  // formatStepLayout supports rich headings, numbered lists, and pasted Markdown.
  const result = formatStepLayout(html);
  if (result) return result;
  // Plain “Step 1: …” lines need headings before they can become a timeline.
  const markdown = text.replace(/^(\s*)(Step\s+\d+\b[^\n]*)/gim, '$1### $2');
  return markdown !== text ? formatStepLayout(labMarkdownToHtml(markdown)) : null;
}

export function stripStepTitleNumber(title: string): string {
  return title.replace(/^\s*\d+[.)]\s+/, "");
}

/** Remove redundant labels only from timeline headings, preserving inline formatting. */
export function normalizeStepTitles(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  let changed = false;
  doc.querySelectorAll("ol.notebook-steps > li > :is(h1,h2,h3,h4,h5,h6)").forEach(heading => {
    const title = heading.textContent ?? "";
    let remaining = title.length - stripStepTitleNumber(title).length;
    if (!remaining) return;
    changed = true;
    const walker = doc.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && remaining > 0) {
      const text = node as Text;
      const count = Math.min(text.length, remaining);
      text.deleteData(0, count);
      remaining -= count;
      node = walker.nextNode();
    }
  });
  return changed ? doc.body.innerHTML : html;
}
