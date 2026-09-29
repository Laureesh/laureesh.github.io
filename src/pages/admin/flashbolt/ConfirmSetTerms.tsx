import Confirmation from "./Confirmation";

export default function ConfirmSetTerms({ title, count, onCancel, onConfirm }: {
  title: string; count: number; onCancel: () => void; onConfirm: () => void;
}) {
  return <Confirmation title="Remove all terms?" message={`Remove ${count} ${count === 1 ? "term" : "terms"} from “${title}”? The set will remain. This cannot be undone.`} confirmLabel="Remove all terms" onCancel={onCancel} onConfirm={onConfirm} />;
}
