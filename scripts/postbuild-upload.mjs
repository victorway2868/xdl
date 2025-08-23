import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

// Usage: node scripts/postbuild-upload.mjs windows
const platformArg = process.argv[2] || 'windows';

const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.error(`dist directory not found at ${distDir}. Did you run the build?`);
  process.exit(1);
}


function findLatestFileByExt(dir, ext) {
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(ext))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);
  return files.length > 0 ? files[0].name : null;
}

function sha512Hex(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
  const version = pkg.version;

  let artifactName;
  if (platformArg === 'windows') {
    artifactName = findLatestFileByExt(distDir, '.exe');
  } else if (platformArg === 'macos') {
    artifactName = findLatestFileByExt(distDir, '.dmg');
  } else if (platformArg === 'linux') {
    artifactName = findLatestFileByExt(distDir, '.AppImage');
  }

  if (!artifactName) {
    console.error(`No build artifact found in ${distDir} for platform ${platformArg}.`);
    process.exit(1);
  }

  const installerPath = path.join(distDir, artifactName);
  const sha512 = await sha512Hex(installerPath);

  const args = [
    `--installerPath=${installerPath}`,
    `--platform=${platformArg}`,
    `--version=${version}`,
    `--sha512=${sha512}`,
    `--fileName=${artifactName}`,
  ];

  console.log('Calling upload-to-r2 with args:', args.join(' '));
  const result = spawnSync('node', ['scripts/upload-to-r2.mjs', ...args], { stdio: 'inherit' });
  process.exit(result.status || 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

