/**
 * Generate latest.yml version file
 * 
 * This script generates a latest.yml file with version information and file size
 * for software update checking.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load package.json to get the current version
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const { version, build } = packageJson;
const productName = build?.productName || "小斗笠直播助手";

// Path to the installer file
const installerFileName = `小斗笠直播助手-Setup-${version}.exe`;
const outputDir = packageJson.build?.directories?.output || 'dist';
const outputDirPath = path.join(rootDir, outputDir);
const installerPath = path.join(outputDirPath, installerFileName);

console.log(`Generating latest.yml for version ${version}...`);
console.log(`Looking for installer at: ${installerPath}`);

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDirPath)) {
  console.log(`Creating output directory: ${outputDirPath}`);
  fs.mkdirSync(outputDirPath, { recursive: true });
}

// Get file size if installer exists
let fileSize = null;
if (fs.existsSync(installerPath)) {
  try {
    const stats = fs.statSync(installerPath);
    const fileSizeBytes = stats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    fileSize = `${fileSizeMB} MB`;
    console.log(`✓ Installer file found`);
    console.log(`  File size: ${fileSize} (${fileSizeBytes.toLocaleString()} bytes)`);
  } catch (error) {
    console.warn(`⚠ Could not get file size: ${error.message}`);
  }
} else {
  console.warn(`⚠ Installer file not found at: ${installerPath}`);
  console.warn(`  This is normal if you haven't built the installer yet.`);
}

// Create version info file
const versionInfo = {
  version,
  productName,
  releaseDate: new Date().toISOString(),
  downloadUrl: `https://84794ee73142290fa69ac64ae8fc7bee.r2.cloudflarestorage.com/xiaodouliupdates/${installerFileName}`,
  fileName: installerFileName,
  ...(fileSize && { fileSize }), // Only add fileSize if it exists
  sha512: '', // We could add a hash here if needed
};

const versionInfoPath = path.join(outputDirPath, 'latest.yml');
console.log(`Writing version info to: ${versionInfoPath}`);

try {
  fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
  console.log(`✓ Successfully generated latest.yml`);
  console.log('\nGenerated content:');
  console.log('─'.repeat(50));
  console.log(JSON.stringify(versionInfo, null, 2));
  console.log('─'.repeat(50));
} catch (error) {
  console.error(`✗ Error writing version info file: ${error.message}`);
  process.exit(1);
}

console.log('\n✓ latest.yml generation completed!');
