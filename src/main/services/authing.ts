import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import { app, shell, BrowserWindow } from 'electron';
import keytar from 'keytar';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// ---- Authing OIDC fixed endpoints (from provided config) ----
const AUTHING_URL = 'https://fboz85pty1tn-xiaodouli.authing.cn';
const AUTHING_ISSUER = `${AUTHING_URL}/oidc`;
const AUTH_ENDPOINT = `${AUTHING_ISSUER}/auth`;
const TOKEN_ENDPOINT = `${AUTHING_ISSUER}/token`;
const USERINFO_ENDPOINT = `${AUTHING_ISSUER}/me`;


// Client/App configuration - App ID provided by user
const CLIENT_ID = '68b8b03ae7edf77d1dc8227d'; // TODO: if有变更请告知，我再统一改为从配置读取

// Loopback candidate ports (in order)
const LOOPBACK_PORTS = [16266, 26266, 36266, 46266, 56266];

// Keytar service/account keys
const KEYTAR_SERVICE = 'xiaodouli-authing';
const KEYTAR_ACCOUNT_REFRESH = 'refresh_token';

// Offline profile cache file
const PROFILE_FILE = path.join(app.getPath('userData'), 'authing_profile.json');

// Types
export interface AuthingUserSnapshot {
  loggedIn: boolean;
  isMember: boolean;
  isStale?: boolean;
  expiryTextCN?: string | null;
  membershipExpiryRaw?: string | null;
  membershipExpiryDate?: number | null; // UTC ms
  user?: {
    sub: string;
    email?: string;
    nicknameRaw?: string;
    website?: string;
    name?: string;
  } | null;
  lastSyncAt?: number;
}

// In-memory state (not persisted across runs)
let memoryAccessToken: { token: string; expiresAt: number } | null = null;
let memorySnapshot: AuthingUserSnapshot | null = null;
let hasAutoFetchedThisRun = false;
let inFlightPromise: Promise<AuthingUserSnapshot> | null = null;

function b64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest();
}

function genRandom(size = 48) {
  return b64url(crypto.randomBytes(size));
}

function sendToRenderer(channel: string, payload: any) {
  const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
  try { win?.webContents.send(channel, payload); } catch {}
}

// Parse nickname like "m2025092916r2025080903" → first 10 digits → 2025092916 (Beijing time)
function parseMembershipFromNickname(nickname?: string): {
  raw: string | null; ms: number | null; textCN: string | null; isMember: boolean;
} {
  let raw: string | null = null;
  let ms: number | null = null;
  let textCN: string | null = null;
  let isMember = false;
  if (nickname) {
    const m = nickname.match(/(\d{10})/);
    if (m) {
      raw = m[1];
      const year = Number(raw.slice(0, 4));
      const month = Number(raw.slice(4, 6));
      const day = Number(raw.slice(6, 8));
      const hour = Number(raw.slice(8, 10));
      // Beijing time (UTC+8) → convert to UTC ms for comparison
      const utcMs = Date.UTC(year, month - 1, day, hour - 8, 0, 0, 0);
      ms = utcMs;
      textCN = `${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日${String(hour).padStart(2, '0')}时`;
      isMember = Date.now() < (utcMs ?? 0);
    }
  }
  return { raw, ms, textCN, isMember };
}

async function loadOfflineSnapshot(): Promise<AuthingUserSnapshot | null> {
  try {
    const txt = await fs.readFile(PROFILE_FILE, 'utf8');
    const parsed = JSON.parse(txt) as AuthingUserSnapshot;
    return parsed || null;
  } catch {
    return null;
  }
}

async function saveOfflineSnapshot(s: AuthingUserSnapshot) {
  try {
    await fs.mkdir(path.dirname(PROFILE_FILE), { recursive: true });
    await fs.writeFile(PROFILE_FILE, JSON.stringify(s, null, 2), 'utf8');
  } catch {}
}

async function getStoredRefreshToken(): Promise<string | null> {
  try { return await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_REFRESH); } catch { return null; }
}

async function setStoredRefreshToken(token: string | null): Promise<void> {
  try {
    if (token) await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_REFRESH, token);
    else await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_REFRESH);
  } catch {}
}

async function refreshAccessTokenIfNeeded(): Promise<boolean> {
  // If we have a non-expired token, reuse
  if (memoryAccessToken && memoryAccessToken.expiresAt - Date.now() > 60_000) return true;
  const refresh = await getStoredRefreshToken();
  if (!refresh) return false;
  try {
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refresh);
    form.set('client_id', CLIENT_ID);
    const { data } = await axios.post(TOKEN_ENDPOINT, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
    const at = data.access_token as string;
    const expiresIn = Number(data.expires_in || 3600);
    memoryAccessToken = { token: at, expiresAt: Date.now() + expiresIn * 1000 };
    if (data.refresh_token && data.refresh_token !== refresh) {
      await setStoredRefreshToken(data.refresh_token);
    }
    return true;
  } catch {
    // refresh failed, clear stored refresh token
    await setStoredRefreshToken(null);
    memoryAccessToken = null;
    return false;
  }
}

async function fetchUserInfoOnce(): Promise<AuthingUserSnapshot> {
  // single-flight guard
  if (inFlightPromise) return inFlightPromise;
  inFlightPromise = (async () => {
    let loggedIn = false;
    let isStale = false;
    let snapshot: AuthingUserSnapshot | null = null;

    const ok = await refreshAccessTokenIfNeeded();
    if (!ok) {
      // No token, try offline snapshot
      const offline = await loadOfflineSnapshot();
      if (offline) {
        snapshot = { ...offline, isStale: true };
        isStale = true;
      } else {
        snapshot = { loggedIn: false, isMember: false, user: null };
      }
      memorySnapshot = snapshot;
      return snapshot;
    }
    loggedIn = true;

    try {
      const { data } = await axios.get(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${memoryAccessToken!.token}` },
        timeout: 15000,
      });
      const sub: string = data.sub;
      const email: string | undefined = data.email;
      const nicknameRaw: string | undefined = data.nickname;
      const website: string | undefined = data.website;
      const name: string | undefined = data.name;

      const parsed = parseMembershipFromNickname(nicknameRaw);
      const snap: AuthingUserSnapshot = {
        loggedIn,
        isMember: parsed.isMember,
        expiryTextCN: parsed.textCN,
        membershipExpiryRaw: parsed.raw,
        membershipExpiryDate: parsed.ms,
        user: { sub, email, nicknameRaw, website, name },
        lastSyncAt: Date.now(),
      };
      memorySnapshot = snap;
      await saveOfflineSnapshot(snap);
      return snap;
    } catch {
      // Network fail: fallback offline
      const offline = await loadOfflineSnapshot();
      if (offline) {
        const snap = { ...offline, isStale: true };
        memorySnapshot = snap;
        return snap;
      }
      const snap: AuthingUserSnapshot = { loggedIn: false, isMember: false, user: null };
      memorySnapshot = snap;
      return snap;
    }
  })();

  try { return await inFlightPromise; } finally { inFlightPromise = null; }
}

export async function getStatus(autoFetchOnce = true): Promise<AuthingUserSnapshot> {
  if (autoFetchOnce && !hasAutoFetchedThisRun) {
    hasAutoFetchedThisRun = true;
    return await fetchUserInfoOnce();
  }
  if (memorySnapshot) return memorySnapshot;
  // No cached snapshot; try offline cache without network
  const offline = await loadOfflineSnapshot();
  if (offline) return { ...offline, isStale: true };
  return { loggedIn: false, isMember: false, user: null };
}

export async function startLoginInteractive(): Promise<void> {
  // Prepare PKCE, state, nonce
  const codeVerifier = genRandom(48);
  const codeChallenge = b64url(sha256(codeVerifier));
  const state = genRandom(16);
  const nonce = genRandom(16);

  // Find an available loopback port
  let selectedPort: number | null = null;
  for (const p of LOOPBACK_PORTS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const srv = http.createServer((_req, res) => {
          res.statusCode = 404; res.end();
        });
        srv.once('error', reject);
        srv.listen(p, '127.0.0.1', () => srv.close(() => resolve()));
      });
      selectedPort = p; break;
    } catch {}
  }
  if (!selectedPort) throw new Error('本地回调端口不可用');

  const redirectUri = `http://127.0.0.1:${selectedPort}/callback`;

  // Create callback server for a single hit
  const codePromise = new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url || '', `http://127.0.0.1:${selectedPort}`);
        if (u.pathname !== '/callback') { res.statusCode = 404; return res.end('Not Found'); }
        const code = u.searchParams.get('code');
        const st = u.searchParams.get('state');
        if (!code || !st || st !== state) { res.statusCode = 400; return res.end('Invalid State'); }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<html><body>登录完成，您可以关闭此页面并返回应用。</body></html>');
        server.close();
        resolve(code);
      } catch (e) {
        try { server.close(); } catch {}
        reject(e);
      }
    });
    server.listen(selectedPort!, '127.0.0.1');
  });

  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid profile offline_access');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);

  await shell.openExternal(authUrl.toString());
  const code = await codePromise; // wait for callback

  // Exchange token
  const form = new URLSearchParams();
  form.set('grant_type', 'authorization_code');
  form.set('code', code);
  form.set('client_id', CLIENT_ID);
  form.set('redirect_uri', redirectUri);
  form.set('code_verifier', codeVerifier);
  const { data } = await axios.post(TOKEN_ENDPOINT, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  const at = data.access_token as string;
  const expiresIn = Number(data.expires_in || 3600);
  memoryAccessToken = { token: at, expiresAt: Date.now() + expiresIn * 1000 };
  if (data.refresh_token) await setStoredRefreshToken(data.refresh_token);

  // Fetch userinfo once and broadcast
  const snap = await fetchUserInfoOnce();
  memorySnapshot = snap;
  sendToRenderer('authing-updated', snap);
}

export async function logout(): Promise<void> {
  await setStoredRefreshToken(null);
  memoryAccessToken = null;
  memorySnapshot = { loggedIn: false, isMember: false, user: null };
  await saveOfflineSnapshot(memorySnapshot);
  sendToRenderer('authing-updated', memorySnapshot);
}

