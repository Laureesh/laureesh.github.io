import { getFileUrl, removeFile, uploadFile, userStoragePath } from "../firebase/storage";

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_REQUEST_TIMEOUT_MS = 20_000;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = PROFILE_PHOTO_REQUEST_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function getProfilePhotoErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    if (error.code === "storage/unauthorized") {
      return "Firebase Storage blocked the upload. Enable Storage and deploy storage.rules, then try again.";
    }

    if (error.code === "storage/canceled") {
      return "The photo upload was canceled before it finished.";
    }

    if (error.code === "storage/quota-exceeded") {
      return "Your Firebase Storage bucket is out of quota right now.";
    }

    if (error.code === "storage/no-default-bucket") {
      return "Firebase Storage is not configured yet. Check VITE_FIREBASE_STORAGE_BUCKET and enable Storage in Firebase.";
    }

    if (error.code === "storage/retry-limit-exceeded") {
      return "The photo upload timed out. Check your Firebase Storage bucket, rules, and network, then try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to update the profile photo right now.";
}

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    return false;
  }

  const octets = match.slice(1).map(Number);
  const [a, b] = octets;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function inferExtension(file: File) {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/avif") return "avif";
  return "bin";
}

export function validateProfilePhotoFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WEBP, or AVIF image.";
  }

  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return "Profile photos must be 5 MB or smaller.";
  }

  return null;
}

export function normalizeProfilePhotoUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Enter an image URL or upload a file.");
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid image URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Use an HTTPS image URL.");
  }

  if (url.username || url.password) {
    throw new Error("Profile photo links cannot contain embedded credentials.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Local or private-network image URLs are not allowed.");
  }

  if (url.pathname.toLowerCase().endsWith(".svg")) {
    throw new Error("SVG profile photo links are not allowed.");
  }

  return url.toString();
}

export async function verifyProfilePhotoUrl(url: string) {
  await withTimeout(new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("That image link could not be loaded."));
    image.src = url;
  }), "That image link took too long to load. Try another image URL.");
}

export async function uploadProfilePhoto(uid: string, file: File) {
  const validationError = validateProfilePhotoFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const extension = inferExtension(file);
  const path = userStoragePath(uid, "avatars", `avatar-${Date.now()}.${extension}`);

  try {
    await withTimeout(
      uploadFile(path, file, {
        contentType: file.type,
        cacheControl: "public,max-age=3600",
      }),
      "The photo upload took too long. Confirm Firebase Storage is enabled and try again.",
    );

    const url = await withTimeout(
      getFileUrl(path),
      "The upload finished, but the photo URL could not be retrieved. Check Firebase Storage rules and try again.",
    );

    return {
      path,
      url,
    };
  } catch (error) {
    throw new Error(getProfilePhotoErrorMessage(error));
  }
}

export async function removeProfilePhoto(path: string | null | undefined) {
  if (!path) {
    return;
  }

  try {
    await removeFile(path);
  } catch {
    // Best-effort cleanup only.
  }
}
