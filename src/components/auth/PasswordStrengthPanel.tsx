import { Check, ShieldAlert, Sparkles, X } from "lucide-react";
import { evaluatePasswordStrength } from "../../utils/passwordSecurity";
import "./PasswordStrengthPanel.css";

interface PasswordStrengthPanelProps {
  password: string;
  visible: boolean;
  onUseSuggestion?: (suggestion: string) => void;
}

export default function PasswordStrengthPanel({
  password,
  visible,
  onUseSuggestion,
}: PasswordStrengthPanelProps) {
  const strength = evaluatePasswordStrength(password);

  if (!visible) {
    return null;
  }

  return (
    <div className="password-strength-panel" aria-live="polite">
      <div className="password-strength-header">
        <div>
          <p className="password-strength-kicker">Password strength</p>
          <h3 className={`password-strength-title password-strength-title--${strength.tone}`}>
            {strength.label}
          </h3>
        </div>
        <span
          className={`password-strength-score password-strength-score--${strength.tone}`}
        >
          {strength.score}/100
        </span>
      </div>

      <div
        className="password-strength-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={strength.score}
        aria-label="Password strength score"
      >
        <span
          className={`password-strength-progress-fill password-strength-progress-fill--${strength.tone}`}
          style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
        />
      </div>

      {strength.warning ? (
        <div className="password-strength-warning">
          <ShieldAlert size={16} />
          <span>{strength.warning}</span>
        </div>
      ) : null}

      <div className="password-rule-list">
        {strength.rules.map((rule) => (
          <div
            key={rule.id}
            className={`password-rule ${rule.met ? "password-rule--met" : "password-rule--unmet"}`}
          >
            {rule.met ? <Check size={14} /> : <X size={14} />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>

      <div className="password-suggestions">
        <div className="password-suggestions-header">
          <Sparkles size={16} />
          <span>Try a memorable passphrase</span>
        </div>
        <p className="password-suggestions-copy">
          Longer memorable phrases are easier to recall and harder to crack than short random strings.
        </p>
        <div className="password-suggestion-list">
          {strength.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="password-suggestion-chip"
              onClick={() => onUseSuggestion?.(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
