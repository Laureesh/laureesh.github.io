import React from "react";
import "./Input.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
  leadingAddon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, leadingAddon, suffix, className, type, id, ...rest }, ref) => {
    const inputId = id || (label ? `ui-input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

    const containerClasses = [
      "ui-input-container",
      error && "ui-input-container--error",
    ]
      .filter(Boolean)
      .join(" ");

    const inputClasses = [
      "ui-input",
      type === "password" && "ui-input--password",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="ui-input-wrapper">
        {label && (
          <label className="ui-input-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className={containerClasses}>
          {leadingAddon && <span className="ui-input-prefix">{leadingAddon}</span>}
          {icon && <span className="ui-input-icon">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={inputClasses}
            {...rest}
          />
          {suffix && <span className="ui-input-suffix">{suffix}</span>}
        </div>
        {error && <span className="ui-input-error">{error}</span>}
        {!error && hint && <span className="ui-input-hint">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
