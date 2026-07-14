import 'fake-indexeddb/auto';

// CRITICAL: Node 25's native localStorage throws SecurityError when accessed under jsdom
// in this vitest config (even with standard environmentOptions.url). This polyfill
// provides a working in-memory implementation instead.
// NOTE: The module-scoped `store` object relies on Vitest's default `isolate: true`
// (fresh module graph per test file) to avoid leaking state between test files.
// If `test.isolate` is ever set to false or a shared worker pool is introduced,
// this assumption would break and tests may see stale data across files.
const store: Record<string, string> = {};
try {
  // Try to access localStorage - it might throw in jsdom without proper setup
  void localStorage.length;
} catch {
  // If it fails, polyfill it
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) {
          delete store[key];
        }
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }
    } as Storage,
    writable: true,
    configurable: true
  });

  // Make length property dynamic
  Object.defineProperty(window.localStorage, 'length', {
    get: () => Object.keys(store).length
  });
}
