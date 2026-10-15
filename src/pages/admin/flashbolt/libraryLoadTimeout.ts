// Firestore can keep a request pending while reconnecting. Loading must not
// leave the entire workspace inert indefinitely.
export async function withLibraryLoadTimeout<T>(request: Promise<T>, timeoutMs = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("Cloud loading timed out"), { code: "deadline-exceeded" })), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
