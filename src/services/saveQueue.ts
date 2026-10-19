// Keep saves for one library in order without blocking other users/libraries.
export function createSaveQueue() {
  const pending = new Map<string, Promise<unknown>>();
  return function enqueue<T>(key: string, save: () => Promise<T>): Promise<T> {
    const previous = pending.get(key) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(save);
    pending.set(key, result);
    const cleanup = () => {
      if (pending.get(key) === result) pending.delete(key);
    };
    void result.then(cleanup, cleanup);
    return result;
  };
}
