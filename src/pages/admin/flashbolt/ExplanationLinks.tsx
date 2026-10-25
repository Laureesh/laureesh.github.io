import { Fragment } from "react";

import { referenceUrl } from "./referenceUrl";

/** Keep imported explanation text intact while making its web links usable. */
export default function ExplanationLinks({ text }: { text: string }) {
  return <>{text.split(/((?:https?:\/\/|www\.)[^\s<>]+)/g).map((part, index) => {
    const link = part.replace(/[.,;:!?]+$/, "");
    const href = referenceUrl(link);
    return href ? <Fragment key={index}><a href={href} target="_blank" rel="noopener noreferrer">{link}</a>{part.slice(link.length)}</Fragment> : part;
  })}</>;
}
