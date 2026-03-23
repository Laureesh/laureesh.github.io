const SIGNUP_RATE_LIMIT_KEY = "portfolio-signup-attempts";
const SIGNUP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_RATE_LIMIT_MAX_ATTEMPTS = 5;

export interface SignupRateLimitStatus {
  blocked: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
}

function readAttempts() {
  if (typeof window === "undefined") {
    return [] as number[];
  }

  try {
    const rawValue = window.localStorage.getItem(SIGNUP_RATE_LIMIT_KEY);

    if (!rawValue) {
      return [] as number[];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [] as number[];
  }
}

function writeAttempts(attempts: number[]) {
  if (typeof window === "undefined") {
    return;
  }

  if (attempts.length === 0) {
    window.localStorage.removeItem(SIGNUP_RATE_LIMIT_KEY);
    return;
  }

  window.localStorage.setItem(SIGNUP_RATE_LIMIT_KEY, JSON.stringify(attempts));
}

function getActiveAttempts() {
  const cutoff = Date.now() - SIGNUP_RATE_LIMIT_WINDOW_MS;
  const attempts = readAttempts().filter((attempt) => attempt > cutoff);
  writeAttempts(attempts);
  return attempts;
}

export function getSignupRateLimitStatus(): SignupRateLimitStatus {
  const attempts = getActiveAttempts();
  const blocked = attempts.length >= SIGNUP_RATE_LIMIT_MAX_ATTEMPTS;
  const retryAfterMs = blocked
    ? Math.max(SIGNUP_RATE_LIMIT_WINDOW_MS - (Date.now() - attempts[0]), 0)
    : 0;

  return {
    blocked,
    remainingAttempts: Math.max(SIGNUP_RATE_LIMIT_MAX_ATTEMPTS - attempts.length, 0),
    retryAfterMs,
  };
}

export function recordSignupAttempt() {
  const attempts = getActiveAttempts();
  attempts.push(Date.now());
  writeAttempts(attempts);
}

export function clearSignupAttempts() {
  writeAttempts([]);
}

export function formatRetryAfter(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
