// ─── Google Drive Backup ─────────────────────────────────────────────────────
// Saves / loads Money Lynx backup JSON to the user's Google Drive using the
// Google Identity Services (GIS) library and the Drive REST API.
//
// SETUP REQUIRED:
//   1. Create a project in Google Cloud Console
//   2. Enable the Google Drive API
//   3. Create an OAuth 2.0 Web Client ID
//      — Authorised JavaScript origins: your site URL
//      — Authorised redirect URIs: your site URL
//   4. Add the client ID as VITE_GOOGLE_CLIENT_ID in your GitHub Secrets
//      (and as an env var in your Vite config)
//
// The app requests the narrow `drive.appdata` scope so it can only see files
// it created — it never has access to the user's other Drive files.
// ─────────────────────────────────────────────────────────────────────────────

const CLIENT_ID    = import.meta.env?.VITE_GOOGLE_CLIENT_ID || null;
const SCOPE        = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY    = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_NAME  = 'moneylynx_backup.json';
const FOLDER       = 'appDataFolder'; // hidden app-specific folder in Drive

// ─── Load the GIS + gapi scripts dynamically ─────────────────────────────────
let _gapiReady  = false;
let _tokenClient = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureGapiLoaded() {
  if (_gapiReady) return;
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise((resolve, reject) => {
    window.gapi.load('client', { callback: resolve, onerror: reject });
  });
  await window.gapi.client.init({});
  await window.gapi.client.load(DISCOVERY);
  _gapiReady = true;
}

// ─── Token / auth ─────────────────────────────────────────────────────────────

let _cachedToken   = null;
let _tokenExpireAt = 0;

function isTokenValid() {
  return _cachedToken && Date.now() < _tokenExpireAt - 60_000;
}

/**
 * Obtain a Google OAuth token via the GIS popup flow.
 * Resolves with an access-token string.
 * Rejects if the user cancels or CLIENT_ID is not configured.
 */
export function getGoogleToken() {
  return new Promise(async (resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not configured.'));
      return;
    }
    if (isTokenValid()) { resolve(_cachedToken); return; }

    await loadScript('https://accounts.google.com/gsi/client');

    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPE,
      callback:  (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        _cachedToken   = resp.access_token;
        _tokenExpireAt = Date.now() + (resp.expires_in || 3600) * 1000;
        resolve(_cachedToken);
      },
    });

    // If we have a cached (but expired) token, request silently first.
    _tokenClient.requestAccessToken({ prompt: isTokenValid() ? '' : 'consent' });
  });
}

/** Revoke the cached token (call on sign-out). */
export function revokeGoogleToken() {
  if (_cachedToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(_cachedToken, () => {});
  }
  _cachedToken = null; _tokenExpireAt = 0;
}

// ─── Drive helpers ────────────────────────────────────────────────────────────

async function driveRequest(method, path, params = {}, body = null, token) {
  const url = new URL(`https://www.googleapis.com/drive/v3${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers = { Authorization: `Bearer ${token}` };
  if (body && typeof body === 'string') headers['Content-Type'] = 'application/json';
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Drive API error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Find existing backup file ID in appDataFolder, or null. */
async function findBackupFileId(token) {
  const res = await driveRequest('GET', '/files', {
    spaces:  FOLDER,
    fields:  'files(id,name,modifiedTime)',
    q:       `name='${BACKUP_NAME}'`,
  }, null, token);
  return res?.files?.[0] || null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save backup JSON to Google Drive (creates or overwrites the backup file).
 * @param {object} backupData — the full backup object
 * @returns {Promise<{ fileId, updatedAt }>}
 */
export async function saveToGoogleDrive(backupData) {
  const token   = await getGoogleToken();
  const content = JSON.stringify(backupData, null, 0);
  const existing = await findBackupFileId(token);

  let fileId;
  if (existing) {
    // PATCH multipart — update content of existing file
    const boundary = 'moneylynx_boundary';
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify({ name: BACKUP_NAME, mimeType: 'application/json' }),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n');

    const url = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`;
    const res = await fetch(url, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error(`Drive upload error ${res.status}`);
    const data = await res.json();
    fileId = data.id;
  } else {
    // POST multipart — create new file in appDataFolder
    const boundary = 'moneylynx_boundary';
    const metadata = JSON.stringify({ name: BACKUP_NAME, parents: [FOLDER], mimeType: 'application/json' });
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n');

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
    const res = await fetch(url, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error(`Drive upload error ${res.status}`);
    const data = await res.json();
    fileId = data.id;
  }

  return { fileId, updatedAt: new Date().toISOString() };
}

/**
 * Load the latest backup JSON from Google Drive.
 * Returns null if no backup exists.
 */
export async function loadFromGoogleDrive() {
  const token    = await getGoogleToken();
  const existing = await findBackupFileId(token);
  if (!existing) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive download error ${res.status}`);
  return res.json();
}

/**
 * Check when the last backup was saved to Drive (returns ISO string or null).
 */
export async function getLastBackupTime() {
  try {
    const token    = await getGoogleToken();
    const existing = await findBackupFileId(token);
    return existing?.modifiedTime || null;
  } catch {
    return null;
  }
}

/** Returns true if CLIENT_ID is configured (Drive feature is available). */
export const isDriveConfigured = () => !!CLIENT_ID;
