// ─── Vitest global setup ──────────────────────────────────────────────────────
// Polyfills for jsdom environment (Web Crypto, TextEncoder, etc.)

import { vi } from 'vitest';

// Web Crypto API — Node 18+ has this natively, but jsdom needs the pointer
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}

// TextEncoder / TextDecoder
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = await import('node:util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// localStorage mock
const storage = {};
globalThis.localStorage = {
  getItem:    (k)    => storage[k] ?? null,
  setItem:    (k, v) => { storage[k] = String(v); },
  removeItem: (k)    => { delete storage[k]; },
  clear:      ()     => { Object.keys(storage).forEach(k => delete storage[k]); },
};
