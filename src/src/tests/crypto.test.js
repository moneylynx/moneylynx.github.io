// ─── crypto.js — test suite ───────────────────────────────────────────────────
// Covers: key derivation, AES-256-GCM encrypt/decrypt, PIN hashing,
//         session key cache, bulk encrypt/decrypt
// All tests are async (Web Crypto API)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import {
  deriveEncKey,
  hashPinV2,
  hashPinLegacy,
  encryptJSON,
  decryptJSON,
  encryptAndSaveAll,
  loadAndDecryptAll,
  cacheKeyToSession,
  loadKeyFromSession,
  clearSessionKey,
  hexToBytes,
  bytesToHex,
  bytesToB64,
  b64ToBytes,
} from '../lib/crypto.js';

// ── Binary helpers ────────────────────────────────────────────────────────────
describe('Binary helpers', () => {
  it('hexToBytes / bytesToHex roundtrip', () => {
    const hex = 'deadbeef01234567';
    const bytes = hexToBytes(hex);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytesToHex(bytes)).toBe(hex);
  });

  it('bytesToB64 / b64ToBytes roundtrip', () => {
    const original = new Uint8Array([1, 2, 3, 255, 128, 0]);
    const b64 = bytesToB64(original);
    const restored = b64ToBytes(b64);
    expect(Array.from(restored)).toEqual(Array.from(original));
  });

  it('hexToBytes produces correct length', () => {
    const hex = '00112233445566778899aabbccddeeff';
    expect(hexToBytes(hex).length).toBe(16);
  });
});

// ── Key derivation ────────────────────────────────────────────────────────────
describe('deriveEncKey', () => {
  const SALT = 'a'.repeat(64); // 32 hex bytes

  it('returns a CryptoKey', async () => {
    const key = await deriveEncKey('1234', SALT);
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
  });

  it('same PIN + salt → same key material', async () => {
    const k1 = await deriveEncKey('5678', SALT);
    const k2 = await deriveEncKey('5678', SALT);
    const raw1 = await crypto.subtle.exportKey('raw', k1);
    const raw2 = await crypto.subtle.exportKey('raw', k2);
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
  });

  it('different PIN → different key', async () => {
    const k1 = await deriveEncKey('1234', SALT);
    const k2 = await deriveEncKey('9999', SALT);
    const raw1 = await crypto.subtle.exportKey('raw', k1);
    const raw2 = await crypto.subtle.exportKey('raw', k2);
    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
  });

  it('different salt → different key', async () => {
    const SALT2 = 'b'.repeat(64);
    const k1 = await deriveEncKey('1234', SALT);
    const k2 = await deriveEncKey('1234', SALT2);
    const raw1 = await crypto.subtle.exportKey('raw', k1);
    const raw2 = await crypto.subtle.exportKey('raw', k2);
    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
  });
});

// ── PIN hashing ───────────────────────────────────────────────────────────────
describe('hashPinV2', () => {
  const SALT = 'f'.repeat(64);

  it('returns a non-empty string', async () => {
    const hash = await hashPinV2('1234', SALT);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(10);
  });

  it('same PIN + salt → same hash (deterministic)', async () => {
    const h1 = await hashPinV2('4321', SALT);
    const h2 = await hashPinV2('4321', SALT);
    expect(h1).toBe(h2);
  });

  it('different PINs → different hashes', async () => {
    const h1 = await hashPinV2('1111', SALT);
    const h2 = await hashPinV2('2222', SALT);
    expect(h1).not.toBe(h2);
  });
});

describe('hashPinLegacy', () => {
  it('returns a hex string of length 64', async () => {
    const hash = await hashPinLegacy('test');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});

// ── AES-256-GCM encrypt / decrypt ────────────────────────────────────────────
describe('encryptJSON / decryptJSON', () => {
  let key;

  beforeEach(async () => {
    key = await deriveEncKey('testpin', 'c'.repeat(64));
  });

  it('encrypts and decrypts simple object', async () => {
    const data = { txs: [{ id: '1', amount: 100 }], name: 'Test' };
    const enc = await encryptJSON(key, data);
    expect(typeof enc).toBe('string');
    expect(enc.startsWith('ENC2:')).toBe(true);
    const dec = await decryptJSON(key, enc, null);
    expect(dec).toEqual(data);
  });

  it('decrypts array correctly', async () => {
    const arr = [1, 2, 3, { nested: true }];
    const enc = await encryptJSON(key, arr);
    const dec = await decryptJSON(key, enc, []);
    expect(dec).toEqual(arr);
  });

  it('each encryption produces unique ciphertext (random IV)', async () => {
    const data = { a: 1 };
    const enc1 = await encryptJSON(key, data);
    const enc2 = await encryptJSON(key, data);
    expect(enc1).not.toBe(enc2); // different IVs
  });

  it('returns fallback when given null input', async () => {
    const result = await decryptJSON(key, null, 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns plain JSON when not ENC2 prefixed (legacy data)', async () => {
    const plain = JSON.stringify({ x: 42 });
    const result = await decryptJSON(key, plain, null);
    expect(result).toEqual({ x: 42 });
  });

  it('returns fallback on wrong key', async () => {
    const wrongKey = await deriveEncKey('wrongpin', 'c'.repeat(64));
    const enc = await encryptJSON(key, { secret: true });
    const result = await decryptJSON(wrongKey, enc, 'fallback');
    expect(result).toBe('fallback');
  });

  it('handles large payloads (1000 transactions)', async () => {
    const bigData = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i), amount: i * 10, description: `Transaction ${i}`,
      category: 'Hrana', date: '2026-05-01',
    }));
    const enc = await encryptJSON(key, bigData);
    const dec = await decryptJSON(key, enc, []);
    expect(dec.length).toBe(1000);
    expect(dec[999].id).toBe('999');
  });
});

// ── Session key cache ─────────────────────────────────────────────────────────
describe('Session key cache', () => {
  beforeEach(() => clearSessionKey());

  it('cacheKeyToSession / loadKeyFromSession roundtrip', async () => {
    const key = await deriveEncKey('session_test', 'd'.repeat(64));
    await cacheKeyToSession(key);
    const loaded = await loadKeyFromSession();
    expect(loaded).not.toBeNull();

    // Verify the loaded key can decrypt what the original encrypted
    const data = { msg: 'hello' };
    const enc = await encryptJSON(key, data);
    const dec = await decryptJSON(loaded, enc, null);
    expect(dec).toEqual(data);
  });

  it('loadKeyFromSession returns null when nothing cached', async () => {
    const result = await loadKeyFromSession();
    expect(result).toBeNull();
  });

  it('clearSessionKey removes cached key', async () => {
    const key = await deriveEncKey('clear_test', 'e'.repeat(64));
    await cacheKeyToSession(key);
    clearSessionKey();
    const result = await loadKeyFromSession();
    expect(result).toBeNull();
  });
});
