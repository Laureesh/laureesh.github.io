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
  if (doc.querySelector(".notebook-steps")) return html;
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
  const sectionHeading = headings.find(node => node !== headings[0] && node.tagName > headings[0].tagName) ?? headings[0];
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
    return steps.children.length ? doc.body.innerHTML : null;
  }
  const list = doc.body.querySelector("ol");
  if (!list) return null;
  list.classList.add("notebook-steps");
  list.setAttribute("data-step-source", "list");
  return doc.body.innerHTML;
}
