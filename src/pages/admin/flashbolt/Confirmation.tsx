import { useId } from "react";
import { X, TriangleAlert } from "lucide-react";
import Modal from "./Modal";

export default function Confirmation({ title, message, confirmLabel, onCancel, onConfirm }: {
  title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return <Modal className="set-terms-confirm" labelledBy={titleId} describedBy={descriptionId} onClose={onCancel}>
    <div className="set-terms-confirm-heading"><span className="set-terms-confirm-icon"><TriangleAlert aria-hidden="true" /></span><button type="button" className="set-terms-confirm-close" aria-label="Close confirmation" onClick={onCancel}><X aria-hidden="true" /></button></div>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{message}</p>
    <div className="set-terms-confirm-actions"><button autoFocus type="button" onClick={onCancel}>Cancel</button><button type="button" className="set-terms-confirm-remove" onClick={onConfirm}>{confirmLabel}</button></div>
  </Modal>;
}
