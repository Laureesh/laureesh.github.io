const DEFAULT_ADMIN_IDLE_TIMEOUT_MINUTES = 15;
const MIN_ADMIN_IDLE_TIMEOUT_MINUTES = 5;

function resolveAdminIdleTimeoutMinutes() {
  const parsed = Number.parseInt(import.meta.env.VITE_ADMIN_IDLE_TIMEOUT_MINUTES ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < MIN_ADMIN_IDLE_TIMEOUT_MINUTES) {
    return DEFAULT_ADMIN_IDLE_TIMEOUT_MINUTES;
  }

  return parsed;
}

export const ADMIN_IDLE_TIMEOUT_MINUTES = resolveAdminIdleTimeoutMinutes();
export const ADMIN_IDLE_TIMEOUT_MS = ADMIN_IDLE_TIMEOUT_MINUTES * 60 * 1000;
export const ADMIN_TOTP_ISSUER = "Laureesh Portfolio Admin";
