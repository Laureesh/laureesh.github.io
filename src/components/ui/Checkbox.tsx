import React, { useId } from "react";
import "./Checkbox.css";

interface CheckboxProps {
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  const id = useId();

  const wrapperClasses = [
    "ui-checkbox",
    disabled && "ui-checkbox--disabled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={wrapperClasses} htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="ui-checkbox__mark" />
      <span className="ui-checkbox__text">
        <span className="ui-checkbox__label">{label}</span>
        {description && (
          <span className="ui-checkbox__description">{description}</span>
        )}
      </span>
    </label>
  );
};

export default Checkbox;
