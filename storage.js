// Storage adapter. Browser storage can be missing or throw (private windows,
// blocked site data), so every call is guarded and falls back to memory.

export function createStorage(backend = safeLocalStorage()) {
  const memory = new Map();
  return {
    get persistent() { return !!backend; },
    get(key) {
      try { if (backend) return backend.getItem(key); } catch { /* fall through */ }
      return memory.has(key) ? memory.get(key) : null;
    },
    set(key, value) {
      memory.set(key, value);
      try { backend?.setItem(key, value); return !!backend; } catch { return false; }
    },
    remove(key) {
      memory.delete(key);
      try { backend?.removeItem(key); } catch { /* ignore */ }
    },
  };
}

function safeLocalStorage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const k = '__tma_probe__'; ls.setItem(k, '1'); ls.removeItem(k);
    return ls;
  } catch { return null; }
}
