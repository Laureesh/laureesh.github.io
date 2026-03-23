export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  label: "Weak" | "Medium" | "Strong";
  tone: "weak" | "medium" | "strong";
  color: string;
  isValid: boolean;
  isCommonPassword: boolean;
  warning: string | null;
  suggestions: string[];
  rules: PasswordRule[];
}

const COMMON_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "admin",
  "abc123",
  "dragon",
  "iloveyou",
  "letmein",
  "login",
  "monkey",
  "password",
  "password1",
  "password123",
  "passw0rd",
  "princess",
  "qwerty",
  "qwerty123",
  "welcome",
]);

const PASS_PHRASE_SUGGESTIONS = [
  "BlueTiger!2026",
  "NeonMaple#Orbit77",
  "GoldenRiver$Pixel42",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const value = password ?? "";
  const trimmedValue = value.trim();
  const normalizedValue = trimmedValue.toLowerCase();
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(value);
  const hasMinLength = value.length >= 12;
  const isCommonPassword = COMMON_PASSWORDS.has(normalizedValue);
  const hasRepeatedPattern = /(.)\1{2,}/.test(value);
  const hasKeyboardPattern = /(qwerty|asdf|zxcv|1234|abcd|password)/i.test(value);
  const wordCount = trimmedValue ? trimmedValue.split(/\s+/).filter(Boolean).length : 0;
  const characterVariety = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  let score = 0;
  score += clamp(Math.round((Math.min(value.length, 20) / 20) * 45), 0, 45);
  score += characterVariety * 10;

  if (value.length >= 16) {
    score += 10;
  }
  if (value.length >= 20) {
    score += 5;
  }
  if (wordCount >= 3) {
    score += 5;
  }
  if (hasRepeatedPattern) {
    score -= 8;
  }
  if (hasKeyboardPattern) {
    score -= 12;
  }
  if (isCommonPassword) {
    score -= 40;
  }

  score = clamp(score, 0, 100);

  const rules: PasswordRule[] = [
    { id: "length", label: "At least 12 characters", met: hasMinLength },
    { id: "uppercase", label: "Contains uppercase letter", met: hasUppercase },
    { id: "lowercase", label: "Contains lowercase letter", met: hasLowercase },
    { id: "number", label: "Contains number", met: hasNumber },
    { id: "special", label: "Contains special character", met: hasSpecial },
    { id: "common", label: "Not a common password", met: !isCommonPassword },
  ];

  const isValid = rules.every((rule) => rule.met);
  let label: PasswordStrengthResult["label"] = "Weak";
  let tone: PasswordStrengthResult["tone"] = "weak";
  let color = "#ef4444";

  if (isValid && score > 70) {
    label = "Strong";
    tone = "strong";
    color = "#22c55e";
  } else if (!isCommonPassword && score > 40) {
    label = "Medium";
    tone = "medium";
    color = "#f59e0b";
  }

  let warning: string | null = null;

  if (isCommonPassword) {
    warning = "That password is too common and easy to guess.";
  } else if (value.length > 0 && !hasMinLength) {
    warning = "12+ characters is the safer modern baseline.";
  } else if (hasRepeatedPattern || hasKeyboardPattern) {
    warning = "Avoid repeated patterns and easy keyboard sequences.";
  }

  return {
    score,
    label,
    tone,
    color,
    isValid,
    isCommonPassword,
    warning,
    suggestions: PASS_PHRASE_SUGGESTIONS,
    rules,
  };
}
