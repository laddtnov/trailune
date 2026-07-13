import 'fake-indexeddb/auto';

// Polyfill localStorage if not available or if it throws
const store: Record<string, string> = {};
try {
  // Try to access localStorage - it might throw in jsdom without proper setup
  localStorage.length;
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
      },
      length: 0
    } as Storage,
    writable: true,
    configurable: true
  });

  // Make length property dynamic
  Object.defineProperty(window.localStorage, 'length', {
    get: () => Object.keys(store).length
  });
}
