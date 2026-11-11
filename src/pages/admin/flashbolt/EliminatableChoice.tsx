import type { ReactNode } from "react";

export default function EliminatableChoice({ choice, eliminated, answered, onToggle, children }: {
  choice: string;
  eliminated: boolean;
  answered: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const action = eliminated ? "Restore" : "Eliminate";
  return <div className={`eliminatable-choice${eliminated && !answered ? " is-eliminated" : ""}`}>
    {children}
    <button type="button" className="choice-eliminate-button" onClick={onToggle}
      disabled={answered} aria-label={`${action} choice: ${choice}`} aria-pressed={eliminated}
      title={`${action} this choice`}>
      <span aria-hidden="true">{eliminated ? "↶" : "−"}</span>
    </button>
  </div>;
}
