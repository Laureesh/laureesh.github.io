import { useEffect, useMemo, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import "./OtpCodeInput.css";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

function sanitizeDigit(value: string) {
  return value.replace(/\D/g, "");
}

export default function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const characters = useMemo(
    () => Array.from({ length }, (_, index) => value[index] ?? ""),
    [length, value],
  );

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }

    inputRefs.current[0]?.focus();
  }, [autoFocus, disabled]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const updateCharacters = (nextCharacters: string[]) => {
    onChange(nextCharacters.join("").slice(0, length));
  };

  const handleChange = (index: number, nextValue: string) => {
    const digits = sanitizeDigit(nextValue);

    if (!digits) {
      const nextCharacters = [...characters];
      nextCharacters[index] = "";
      updateCharacters(nextCharacters);
      return;
    }

    const nextCharacters = [...characters];

    for (let offset = 0; offset < digits.length && index + offset < length; offset += 1) {
      nextCharacters[index + offset] = digits[offset];
    }

    updateCharacters(nextCharacters);

    const nextIndex = Math.min(index + digits.length, length - 1);
    focusInput(nextIndex);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !characters[index] && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = sanitizeDigit(event.clipboardData.getData("text"));

    if (!pasted) {
      return;
    }

    event.preventDefault();
    updateCharacters(Array.from({ length }, (_, index) => pasted[index] ?? ""));
    focusInput(Math.min(pasted.length, length) - 1);
  };

  return (
    <div className="otp-code-input" role="group" aria-label="One-time passcode">
      {characters.map((character, index) => (
        <div key={index} className="otp-code-input__slot-wrap">
          <input
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            className="otp-code-input__slot"
            value={character}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            disabled={disabled}
            aria-label={`OTP digit ${index + 1}`}
          />
          {index === 2 ? <span className="otp-code-input__separator">-</span> : null}
        </div>
      ))}
    </div>
  );
}
