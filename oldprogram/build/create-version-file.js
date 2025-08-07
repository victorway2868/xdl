/**
 * Create Version File Script
 *
 * This script creates a latest.yml version file for software updates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load package.json to get the current version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const { version, build } = packageJson;
const productName = build?.productName || "小斗笠直播助手";

// Path to the installer file
const installerFileName = `小斗笠直播助手-Setup-${version}.exe`;
// Get the output directory from package.json or use the same as in build.js
const outputDir = packageJson.build?.directories?.output || 'dist';
const outputDirPath = path.join(rootDir, outputDir);

// Create output directory if it doesn't exist
console.log(`Checking if output directory exists: ${outputDirPath}`);
if (!fs.existsSync(outputDirPath)) {
  console.log(`Creating output directory: ${outputDirPath}`);
  fs.mkdirSync(outputDirPath, { recursive: true });
} else {
  console.log(`Output directory already exists: ${outputDirPath}`);
}

// Get file size if installer exists
const installerPath = path.join(outputDirPath, installerFileName);
let fileSize = null;

if (fs.existsSync(installerPath)) {
  try {
    const stats = fs.statSync(installerPath);
    const fileSizeBytes = stats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    fileSize = `${fileSizeMB} MB`;
    console.log(`Installer file size: ${fileSize} (${fileSizeBytes} bytes)`);
  } catch (error) {
    console.warn(`Could not get file size: ${error.message}`);
  }
} else {
  console.warn(`Installer file not found at: ${installerPath}`);
}

// Create version info file
const versionInfo = {
  version,
  productName,
  releaseDate: new Date().toISOString(),
  downloadUrl: `https://example.com/downloads/${installerFileName}`,
  fileName: installerFileName,
  ...(fileSize && { fileSize }), // Only add fileSize if it exists
  sha512: '', // We could add a hash here if needed
};

const versionInfoPath = path.join(outputDirPath, 'latest.yml');
console.log(`Writing version info file to: ${versionInfoPath}`);
try {
  fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
  console.log(`Successfully wrote version info file to: ${versionInfoPath}`);
} catch (error) {
  console.error(`Error writing version info file: ${error.message}`);
}

console.log(`Version info file created at: ${versionInfoPath}`);
console.log('Version info content:');
console.log(JSON.stringify(versionInfo, null, 2));
