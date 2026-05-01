import { useState, useRef, useEffect } from 'react';
import { K, DEF_LISTS } from '../lib/constants.js';
import { save, load } from '../lib/helpers.js';
import {
  bytesToHex, deriveEncKey, hashPinV2,
  encryptAndSaveAll, loadAndDecryptAll,
  cacheKeyToSession, loadKeyFromSession, clearSessionKey,
} from '../lib/crypto.js';

// ─── useAppSecurity ───────────────────────────────────────────────────────────
// Owns all security state and crypto callbacks:
//   • PIN + biometry lock / unlock
//   • First-time PIN setup
//   • PIN change and removal (re-encrypts all data)
//   • Visibility-change handler (locks app on backgrounding)
//   • Full wipe
//
// Setters from useAppData are injected so the crypto callbacks can populate
// React state once data is decrypted (avoids circular hook dependency).
//
// Returns:
//   sec, setSec     — security config object
//   secRef          — always-current ref used inside async callbacks
//   encKey          — AES-256 CryptoKey | null
//   setEncKey
//   unlocked        — boolean
//   setUnlocked
//   setupMode       — boolean (user is in the "set your first PIN" flow)
//   setSetupMode
//   handleCryptoUnlock, handleFirstSetPin, handleChangePinCrypto,
//   handleRemovePinCrypto, wipe
// ─────────────────────────────────────────────────────────────────────────────
export function useAppSecurity({ setTxs, setDrafts, setLists, setUser }) {
  const [sec, setSec] = useState(() =>
    load(K.sec, {
      pinHash: null, bioEnabled: false, bioCredId: null,
      attempts: 0, totalFailed: 0, lockedUntil: null,
    })
  );
  const [encKey,    setEncKey]    = useState(null);
  const [unlocked,  setUnlocked]  = useState(() => !load(K.sec, {}).pinHash);
  const [setupMode, setSetupMode] = useState(false);

  // secRef is always current inside async callbacks (avoids stale closure).
  const secRef = useRef(sec);
  useEffect(() => { secRef.current = sec; }, [sec]);

  // ── Visibility-change: lock on background ────────────────────────────────
  useEffect(() => {
    const fn = async () => {
      if (!secRef.current.pinHash) return;
      if (document.hidden) {
        setUnlocked(false);
        // Routing back to dashboard is handled by App.
      } else {
        const hasBio = secRef.current.bioEnabled && secRef.current.bioCredId;
        if (!hasBio) {
          setUnlocked(false);
        } else {
          try {
            const cachedKey = await loadKeyFromSession();
            if (cachedKey) {
              const data = await loadAndDecryptAll(cachedKey, DEF_LISTS);
              setTxs(data.txs); setDrafts(data.drafts);
              setLists(data.lists); setUser(data.user);
              setEncKey(cachedKey);
              setUnlocked(true);
            }
          } catch { /* stay locked */ }
        }
      }
    };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);

  // ── Unlock (PIN verified by LockScreen) ──────────────────────────────────
  // Derives AES key, decrypts all data, populates React state.
  // When isLegacyHash is true, migrates from old SHA-256 PIN format to PBKDF2.
  const handleCryptoUnlock = async (pin, isLegacyHash) => {
    try {
      let key;
      if (isLegacyHash) {
        // Transparent PBKDF2 migration.
        const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const encSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const pinHash = await hashPinV2(pin, pinSalt);
        key = await deriveEncKey(pin, encSalt);
        const { loadRaw } = await import('../lib/helpers.js');
        const rawTxs    = JSON.parse(loadRaw(K.db)  || '[]');
        const rawDrafts = JSON.parse(loadRaw(K.drf) || '[]');
        const rawLists  = (() => { try { return JSON.parse(loadRaw(K.lst)); } catch { return DEF_LISTS; } })();
        const rawUser   = (() => { try { return JSON.parse(loadRaw(K.usr)); } catch { return {}; } })();
        const data = { txs: rawTxs, drafts: rawDrafts, lists: rawLists || DEF_LISTS, user: rawUser || {} };
        await encryptAndSaveAll(key, data);
        setSec(v => ({ ...v, pinHash, pinSalt, encSalt, pinHashVersion: 'v2', attempts: 0, totalFailed: 0 }));
        setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
      } else {
        key  = await deriveEncKey(pin, secRef.current.encSalt);
        const data = await loadAndDecryptAll(key, DEF_LISTS);
        setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
      }
      setEncKey(key);
      await cacheKeyToSession(key);
      setUnlocked(true);
    } catch (e) {
      console.error('Crypto unlock failed:', e);
    }
  };

  // ── First PIN setup ───────────────────────────────────────────────────────
  // Called by SetupPin when the user sets their very first PIN.
  // Encrypts existing plaintext data with the new key.
  const handleFirstSetPin = async (pin) => {
    const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const encSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const pinHash = await hashPinV2(pin, pinSalt);
    const key     = await deriveEncKey(pin, encSalt);
    // We need current txs/drafts/lists/user — read them directly as we don't
    // have them here; App passes them via the callback below.
    // NOTE: actual state values are accessed via the callback signature in App.
    const newSec = {
      ...secRef.current, pinHash, pinSalt, encSalt, pinHashVersion: 'v2',
      attempts: 0, totalFailed: 0, lockedUntil: null,
    };
    save(K.sec, newSec);
    setSec(newSec);
    secRef.current = newSec;
    setEncKey(key);
    setUnlocked(true);
    setSetupMode(false);
    return { key, newSec };
  };

  // ── Change PIN ────────────────────────────────────────────────────────────
  // Called after old PIN verified. Re-encrypts everything with the new key.
  // Actual data payload is passed in by App (it has the live state).
  const handleChangePinCrypto = async (newPin, dataPayload) => {
    const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const encSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const pinHash = await hashPinV2(newPin, pinSalt);
    const newKey  = await deriveEncKey(newPin, encSalt);
    await encryptAndSaveAll(newKey, dataPayload);
    const newSec = { ...secRef.current, pinHash, pinSalt, encSalt, pinHashVersion: 'v2', attempts: 0, totalFailed: 0 };
    save(K.sec, newSec);
    setSec(newSec);
    secRef.current = newSec;
    setEncKey(newKey);
    clearSessionKey();
  };

  // ── Remove PIN ────────────────────────────────────────────────────────────
  // Called after PIN verified during removal. Saves all data as plaintext.
  const handleRemovePinCrypto = (dataPayload) => {
    save(K.db,  dataPayload.txs);
    save(K.drf, dataPayload.drafts);
    save(K.lst, dataPayload.lists);
    save(K.usr, dataPayload.user);
    setSec(v => ({
      ...v, pinHash: null, pinSalt: null, encSalt: null, pinHashVersion: null,
      attempts: 0, totalFailed: 0,
    }));
    setEncKey(null);
    clearSessionKey();
  };

  // ── Full wipe ─────────────────────────────────────────────────────────────
  const wipe = () => {
    setTxs([]); setDrafts([]);
    save(K.db, []); save(K.drf, []);
    setSec({ pinHash: null, bioEnabled: false, bioCredId: null, attempts: 0, totalFailed: 0, lockedUntil: null });
    setUnlocked(true);
  };

  return {
    sec, setSec, secRef,
    encKey, setEncKey,
    unlocked, setUnlocked,
    setupMode, setSetupMode,
    handleCryptoUnlock,
    handleFirstSetPin,
    handleChangePinCrypto,
    handleRemovePinCrypto,
    wipe,
  };
}
