/** Split one pasted question; return null when the choice boundary is unclear. */
export function parseQuestionPaste(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").trim().split("\n").map(line => line.trim()).filter(Boolean);
  const labeled = /^(?:\(([A-Za-z]|\d{1,2})\)|([A-Za-z]|\d{1,2})[.)\]:-])(?:\s+|$)(.*)$/;
  const standalone = /^([A-Za-z]|\d{1,2})$/;
  const bullet = /^[-*•○◯☐□]\s+(.*)$/;
  for (let start = 1; start < lines.length; start += 1) {
    const choices: string[] = [];
    let kind = "";
    let valid = true;
    for (let index = start; index < lines.length; index += 1) {
      const match = lines[index].match(labeled);
      const bare = lines[index].match(standalone);
      const point = lines[index].match(bullet);
      if (match || bare) {
        const label = match ? match[1] ?? match[2] : bare![1];
        const labelKind = /^\d+$/.test(label) ? "number" : "letter";
        const ordinal = labelKind === "number" ? Number(label) : label.toUpperCase().charCodeAt(0) - 64;
        if ((kind && kind !== labelKind) || ordinal !== choices.length + 1) { valid = false; break; }
        kind = labelKind;
        const value = match?.[3] || lines[++index];
        if (!value || labeled.test(value) || standalone.test(value)) { valid = false; break; }
        choices.push(value);
      } else if (point) {
        if (kind && kind !== "bullet") { valid = false; break; }
        kind = "bullet";
        choices.push(point[1]);
      } else if (choices.length) {
        choices[choices.length - 1] += `\n${lines[index]}`;
      } else { valid = false; break; }
    }
    if (valid && choices.length >= 2 && choices.length <= 26) {
      const term = lines.slice(0, start).join("\n").replace(/\n(?:answers?|(?:answer\s+)?choices)\s*:?$/i, "");
      return { term, choices };
    }
  }
  // Unlabeled choices need an explicit question/choices boundary.
  const boundary = lines.findIndex(line => /\?$/.test(line) || /^(?:answer\s+)?choices\s*:?$/i.test(line));
  if (boundary >= 0 && lines.length - boundary - 1 >= 2 && lines.length - boundary - 1 <= 26) {
    const promptLines = lines.slice(0, boundary + 1);
    if (/^(?:answer\s+)?choices\s*:?$/i.test(promptLines.at(-1)!)) promptLines.pop();
    if (promptLines.length) return { term: promptLines.join("\n"), choices: lines.slice(boundary + 1) };
  }
  return null;
}
