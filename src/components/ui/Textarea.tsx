import React from "react";
import "./Textarea.css";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, rows = 4, id, ...rest }, ref) => {
    const textareaId = id || (label ? `ui-textarea-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

    const textareaClasses = [
      "ui-textarea",
      error && "ui-textarea--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="ui-textarea-wrapper">
        {label && (
          <label className="ui-textarea-label" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          rows={rows}
          {...rest}
        />
        {error && <span className="ui-textarea-error">{error}</span>}
        {!error && hint && <span className="ui-textarea-hint">{hint}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
