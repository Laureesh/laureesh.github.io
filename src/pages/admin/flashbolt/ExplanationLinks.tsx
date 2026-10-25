import { Fragment } from "react";

import { referenceUrl } from "./referenceUrl";

/** Keep imported explanation text intact while making its web links usable. */
function LinkedText({ text }: { text: string }) {
  return <>{text.split(/((?:https?:\/\/|www\.)[^\s<>]+)/g).map((part, index) => {
    const link = part.replace(/[.,;:!?]+$/, "");
    const href = referenceUrl(link);
    return href ? <Fragment key={index}><a href={href} target="_blank" rel="noopener noreferrer">{link}</a>{part.slice(link.length)}</Fragment> : part;
  })}</>;
}

/** Render supported formatting as React elements, never as raw HTML. */
export default function ExplanationLinks({ text }: { text: string }) {
  return <>{text.split(/(\*\*[\s\S]+?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={index}><LinkedText text={part.slice(2, -2)} /></strong>
      : <LinkedText key={index} text={part} />
  )}</>;
}
