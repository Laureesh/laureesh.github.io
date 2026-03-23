import React from "react";
import "./Select.css";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className, id, ...rest }, ref) => {
    const selectId = id || (label ? `ui-select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

    const selectClasses = [
      "ui-select",
      error && "ui-select--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="ui-select-wrapper">
        {label && (
          <label className="ui-select-label" htmlFor={selectId}>
            {label}
          </label>
        )}
        <div className="ui-select-container">
          <select ref={ref} id={selectId} className={selectClasses} {...rest}>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="ui-select-arrow" />
        </div>
        {error && <span className="ui-select-error">{error}</span>}
        {!error && hint && <span className="ui-select-hint">{hint}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
