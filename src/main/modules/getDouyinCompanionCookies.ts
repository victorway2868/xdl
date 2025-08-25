import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { getPath, PathType } from '../utils/pathManager';

export interface CookieItem { name: string; value: string; domain?: string; path?: string }
export interface CookieResult { success: boolean; cookies?: CookieItem[]; cookieString?: string; error?: string }

async function loadSqlite() {
  try {
    const mod = await import('sqlite3');
    return (mod as any).default.verbose();
  } catch (e) {
    throw new Error('缺少 sqlite3 依赖，请先运行: npm install sqlite3');
  }
}

function getWebcastMatePaths() {
  const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return {
    cookies: path.join(APPDATA, 'webcast_mate', 'Network', 'Cookies'),
    localState: path.join(APPDATA, 'webcast_mate', 'Local State'),
  };
}

function decryptMasterKey(localStatePath: string, outKeyPath: string) {
  const content = fs.readFileSync(localStatePath, 'utf8');
  const json = JSON.parse(content);
  const encryptedKey = json?.os_crypt?.encrypted_key;
  if (!encryptedKey) throw new Error('Local State 中没有找到加密密钥');
  const ps = `
  $b=[Convert]::FromBase64String('${encryptedKey}')
  $b=$b[5..($b.Length-1)]
  Add-Type -AssemblyName System.Security
  $d=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser')
  [IO.File]::WriteAllBytes('${outKeyPath.replace(/\\/g,'\\\\')}', $d)
  `;
  const psFile = path.join(path.dirname(outKeyPath), 'decrypt_key.ps1');
  fs.writeFileSync(psFile, ps);
  execSync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`,{stdio:'ignore'});
  if (!fs.existsSync(outKeyPath)) throw new Error('主密钥解密失败');
  return fs.readFileSync(outKeyPath);
}

function copyLockedFile(src: string, dest: string) {
  if (fs.existsSync(dest)) try { fs.unlinkSync(dest); } catch {}
  const cmd = `Copy-Item -Path "${src}" -Destination "${dest}" -Force`;
  execSync(`powershell -Command "${cmd}"`, { stdio: 'ignore' });
  if (!fs.existsSync(dest)) throw new Error('复制 Cookies 数据库失败');
}

async function decryptCookieValue(encrypted: Buffer, masterKey: Buffer): Promise<string|null> {
  try {
    // v10 format: 'v10' + 12-byte nonce + ciphertext + 16-byte tag
    if (encrypted[0] === 118 && encrypted[1] === 49 && encrypted[2] === 48) {
      const nonce = encrypted.slice(3, 15);
      const ciphertext = encrypted.slice(15, encrypted.length - 16);
      const tag = encrypted.slice(encrypted.length - 16);
      const crypto = await import('crypto');
      const decipher = (crypto as any).default.createDecipheriv('aes-256-gcm', masterKey, nonce);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return dec.toString('utf8').replace(/[^\x20-\x7E]/g, '');
    }
  } catch {}
  // DPAPI fallback via PowerShell
  try {
    const tmpDir = getPath(PathType.TEMP);
    fs.mkdirSync(tmpDir, { recursive: true });
    const encPath = path.join(tmpDir, `enc_${Date.now()}.bin`);
    const decPath = path.join(tmpDir, `dec_${Date.now()}.bin`);
    const psPath = path.join(tmpDir, `dpapi_${Date.now()}.ps1`);
    fs.writeFileSync(encPath, encrypted);
    const script = `
    Add-Type -AssemblyName System.Security
    $b=[IO.File]::ReadAllBytes('${encPath.replace(/\\/g,'\\\\')}')
    try{ $d=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser'); [IO.File]::WriteAllBytes('${decPath.replace(/\\/g,'\\\\')}',$d)}catch{exit 1}
    `;
    fs.writeFileSync(psPath, script);
    execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`,{stdio:'ignore'});
    if (fs.existsSync(decPath)) {
      const out = fs.readFileSync(decPath).toString('utf8').replace(/[^\x20-\x7E]/g, '');
      try { fs.unlinkSync(encPath); fs.unlinkSync(decPath); fs.unlinkSync(psPath); } catch {}
      return out;
    }
  } catch {}
  return null;
}

export async function getDouyinCompanionCookies(): Promise<CookieResult> {
  try {
    const { cookies: sourceDb, localState } = getWebcastMatePaths();
    if (!fs.existsSync(sourceDb) || !fs.existsSync(localState)) {
      return { success: false, error: '未找到 webcast_mate 数据，请先安装并登录直播伴侣' };
    }
    const tempDir = getPath(PathType.TEMP);
    fs.mkdirSync(tempDir, { recursive: true });
    const tempDb = path.join(tempDir, 'cookies_tmp.db');
    copyLockedFile(sourceDb, tempDb);
    const masterKey = decryptMasterKey(localState, path.join(tempDir, 'master_key.bin'));

    const sqlite3 = await loadSqlite();
    const db = new sqlite3.Database(tempDb, sqlite3.OPEN_READONLY);

    const rows: any[] = await new Promise((resolve, reject) => {
      db.all("SELECT name, encrypted_value, host_key, path FROM cookies WHERE host_key LIKE '%.douyin.com'", [], (err: any, r: any[]) => {
        if (err) reject(err); else resolve(r);
      });
    }).finally(() => db.close());

    const cookies: CookieItem[] = [];
    for (const row of rows) {
      const buf: Buffer = row.encrypted_value;
      const val = await decryptCookieValue(buf, masterKey);
      if (val) cookies.push({ name: row.name, value: val, domain: row.host_key, path: row.path || '/' });
    }

    if (!cookies.length) return { success: false, error: '未解密到有效Cookie' };

    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const outFile = getPath(PathType.DOUYIN_COOKIES);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, cookieString, 'utf8');

    return { success: true, cookies, cookieString };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

