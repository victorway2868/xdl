/**
 * Check if latest.yml file exists
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Path to check
const filePath = path.join(rootDir, 'dist', 'latest.yml');

console.log(`Checking if file exists: ${filePath}`);
if (fs.existsSync(filePath)) {
  console.log(`File exists: ${filePath}`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('File content:');
    console.log(content);
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
  }
} else {
  console.log(`File does not exist: ${filePath}`);
}
