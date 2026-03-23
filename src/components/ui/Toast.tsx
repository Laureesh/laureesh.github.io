import { useEffect, useState } from "react";
import "./Toast.css";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  onClose: (id: number) => void;
}

const ICONS: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2715",
  info: "i",
};

export function Toast({ id, message, type, duration, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => {
      onClose(id);
    }, 250); // match slide-out animation duration
    return () => clearTimeout(timer);
  }, [exiting, id, onClose]);

  const handleClose = () => {
    setExiting(true);
  };

  return (
    <div
      className={`ui-toast ui-toast--${type}${exiting ? " ui-toast--exiting" : ""}`}
      role="alert"
    >
      <span className="ui-toast__icon">{ICONS[type]}</span>
      <span className="ui-toast__message">{message}</span>
      <button
        className="ui-toast__close"
        onClick={handleClose}
        aria-label="Dismiss notification"
        type="button"
      >
        &#x2715;
      </button>
      <div
        className="ui-toast__progress"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
}
