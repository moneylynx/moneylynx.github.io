import { K } from './constants.js';
import { saveRaw, loadRaw } from './helpers.js';

// ─── Binary helpers ───────────────────────────────────────────────────────────
export const hexToBytes = h => new Uint8Array(h.match(/.{2}/g).map(b=>parseInt(b,16)));
export const bytesToHex = b => Array.from(b).map(x=>x.toString(16).padStart(2,"0")).join("");
export const bytesToB64 = b => btoa(String.fromCharCode(...b));
export const b64ToBytes = s => new Uint8Array(atob(s).split("").map(c=>c.charCodeAt(0)));

// ─── Key derivation ───────────────────────────────────────────────────────────
export const deriveEncKey = async (pin, saltHex) => {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt:hexToBytes(saltHex), iterations:100000, hash:"SHA-256" },
    km, { name:"AES-GCM", length:256 }, true, ["encrypt","decrypt"]
  );
};

export const hashPinV2 = async (pin, saltHex) => {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name:"PBKDF2", salt:hexToBytes(saltHex), iterations:100000, hash:"SHA-256" }, km, 256
  );
  return bytesToB64(new Uint8Array(bits));
};

export const hashPinLegacy = async p => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p+"ml_salt"));
  return bytesToHex(new Uint8Array(buf));
};

// ─── AES-GCM encryption ──────────────────────────────────────────────────────
const ENC_PREFIX = "ENC2:";

export const encryptJSON = async (key, data) => {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name:"AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data))
  );
  return ENC_PREFIX + bytesToB64(iv) + ":" + bytesToB64(new Uint8Array(enc));
};

export const decryptJSON = async (key, raw, fallback) => {
  if (!raw) return fallback;
  if (!raw.startsWith(ENC_PREFIX)) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  if (!key) return fallback;
  try {
    const rest = raw.slice(ENC_PREFIX.length);
    const colonIdx = rest.indexOf(":");
    const iv   = b64ToBytes(rest.slice(0, colonIdx));
    const data = b64ToBytes(rest.slice(colonIdx + 1));
    const dec  = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, data);
    return JSON.parse(new TextDecoder().decode(dec));
  } catch { return fallback; }
};

// ─── Bulk encrypt/decrypt ─────────────────────────────────────────────────────
export const encryptAndSaveAll = async (key, { txs, drafts, lists, user }) => {
  const [eTxs, eDrafts, eLists, eUser] = await Promise.all([
    encryptJSON(key, txs),
    encryptJSON(key, drafts),
    encryptJSON(key, lists),
    encryptJSON(key, user),
  ]);
  saveRaw(K.db, eTxs); saveRaw(K.drf, eDrafts); saveRaw(K.lst, eLists); saveRaw(K.usr, eUser);
};

export const loadAndDecryptAll = async (key, defLists) => {
  const [txs, drafts, lists, user] = await Promise.all([
    decryptJSON(key, loadRaw(K.db),  []),
    decryptJSON(key, loadRaw(K.drf), []),
    decryptJSON(key, loadRaw(K.lst), defLists),
    decryptJSON(key, loadRaw(K.usr), {}),
  ]);
  return { txs, drafts, lists, user };
};

// ─── Session key cache (localStorage with 7-day expiry) ──────────────────────
const SESSION_KEY = "ml_sk";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const cacheKeyToSession = async (key) => {
  try {
    const raw = await crypto.subtle.exportKey("raw", key);
    const payload = { k: bytesToB64(new Uint8Array(raw)), t: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch { /* non-critical */ }
};

export const loadKeyFromSession = async () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { k, t } = JSON.parse(raw);
    if (!k || !t || Date.now() - t > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return crypto.subtle.importKey("raw", b64ToBytes(k), { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
  } catch { return null; }
};

export const clearSessionKey = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
};
