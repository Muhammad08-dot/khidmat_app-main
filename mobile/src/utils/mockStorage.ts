import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Synchronous in-memory `localStorage` shim backed by AsyncStorage.
 *
 * The web app's Mock Firebase fallback reads/writes `localStorage`
 * synchronously (JSON.parse at call time). AsyncStorage is async-only, so to
 * keep the ported mock logic faithful we hold the data in an in-memory Map and
 * mirror it to AsyncStorage so it survives app restarts.
 *
 * Call `hydrateMockStorage()` once (see app/_layout) before rendering so the
 * Map is populated from disk.
 */
const store = new Map<string, string>();

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

export async function hydrateMockStorage(): Promise<void> {
  if (hydrated) return hydratePromise ?? Promise.resolve();
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entries = await AsyncStorage.multiGet(keys);
      entries.forEach(([key, value]) => {
        if (value != null) store.set(key, value);
      });
      hydrated = true;
    } catch (e) {
      console.warn("[mockStorage] hydrate failed:", e);
    }
  })();
  return hydratePromise;
}

// ── debounced persistence ────────────────────────────────────────────────
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  const entries = Array.from(pending);
  pending.clear();
  const toSet: [string, string][] = [];
  const toRemove: string[] = [];
  entries.forEach((key) => {
    const value = store.get(key);
    if (value != null) toSet.push([key, value]);
    else toRemove.push(key);
  });
  try {
    if (toSet.length) await AsyncStorage.multiSet(toSet);
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    console.warn("[mockStorage] persist failed:", e);
  }
}

function schedulePersist(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, 120);
}

export const localStorage: Storage = {
  get length() {
    return store.size;
  },
  clear() {
    store.clear();
    pending.clear();
    void AsyncStorage.clear();
  },
  getItem(key) {
    return store.has(key) ? store.get(key)! : null;
  },
  key(index) {
    return Array.from(store.keys())[index] ?? null;
  },
  removeItem(key) {
    store.delete(key);
    pending.add(key);
    schedulePersist();
  },
  setItem(key, value) {
    store.set(key, String(value));
    pending.add(key);
    schedulePersist();
  },
};
