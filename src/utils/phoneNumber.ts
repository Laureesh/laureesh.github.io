const NON_PHONE_CHARACTERS = /[^\d+]/g;
const PHONE_DIGITS = /\D/g;

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed.replace(NON_PHONE_CHARACTERS, "");

  if (!sanitized) {
    return null;
  }

  let normalized: string;

  if (sanitized.startsWith("+")) {
    const digits = sanitized.slice(1).replace(PHONE_DIGITS, "");

    if (digits.length < 10 || digits.length > 15) {
      throw new Error("Use a valid international phone number with 10 to 15 digits.");
    }

    normalized = `+${digits}`;
  } else {
    const digits = sanitized.replace(PHONE_DIGITS, "");

    if (digits.length === 10) {
      normalized = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      normalized = `+${digits}`;
    } else {
      throw new Error("Enter a phone number like +1 123-456-7890 or a 10-digit US number.");
    }
  }

  return normalized;
}

export function formatPhoneNumber(phoneNumber: string | null | undefined) {
  if (!phoneNumber) {
    return "";
  }

  const digits = phoneNumber.replace(PHONE_DIGITS, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `+1 ${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }

  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }

  return `+${digits}`;
}

export function maskPhoneNumber(phoneNumber: string | null | undefined) {
  const formatted = formatPhoneNumber(phoneNumber);

  if (!formatted) {
    return "No phone number saved";
  }

  const digits = formatted.replace(PHONE_DIGITS, "");

  if (digits.length >= 11 && digits.startsWith("1")) {
    const lastFour = digits.slice(-4);
    return `+1 ***-***-${lastFour}`;
  }

  if (digits.length > 4) {
    return `${formatted.slice(0, 3)}***${formatted.slice(-4)}`;
  }

  return formatted;
}

export function buildOneTimeCode(length = 6) {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }

  return code;
}
