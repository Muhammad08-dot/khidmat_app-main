/**
 * Minimal in-memory event emitter.
 *
 * The web app's Mock Firebase fallback uses `window.dispatchEvent(new
 * CustomEvent(...))` + `window.addEventListener(...)` to broadcast mock
 * booking/message updates between tabs. React Native has no `window` CustomEvent
 * model, so this emitter reproduces that contract with a module-local registry.
 */
type Listener = (detail?: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

export function dispatchEvent(name: string, detail?: unknown): void {
  const set = listeners.get(name);
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn(detail);
    } catch (e) {
      console.warn("[eventEmitter] listener threw for", name, e);
    }
  });
}

export function addEventListener(name: string, fn: Listener): () => void {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name)!.add(fn);
  return () => removeEventListener(name, fn);
}

export function removeEventListener(name: string, fn: Listener): void {
  listeners.get(name)?.delete(fn);
}
