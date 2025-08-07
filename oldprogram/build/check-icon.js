import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check icon file
const iconPath = path.join(rootDir, 'public', 'xdllogo.ico');

console.log('Checking icon file...');
console.log('Icon path:', iconPath);
console.log('Icon exists:', fs.existsSync(iconPath));

if (fs.existsSync(iconPath)) {
  const stats = fs.statSync(iconPath);
  console.log('Icon size:', stats.size, 'bytes');
  
  // Read first few bytes to check format
  const buffer = fs.readFileSync(iconPath);
  console.log('First 4 bytes:', buffer.slice(0, 4).toString('hex'));
  
  // ICO files should start with 00 00 01 00
  const expectedHeader = Buffer.from([0x00, 0x00, 0x01, 0x00]);
  const actualHeader = buffer.slice(0, 4);
  
  if (actualHeader.equals(expectedHeader)) {
    console.log('✓ Icon file has correct ICO header');
    
    // Read number of images in the icon
    const numImages = buffer.readUInt16LE(4);
    console.log('Number of images in icon:', numImages);
    
    // Read image directory entries
    for (let i = 0; i < Math.min(numImages, 10); i++) {
      const offset = 6 + (i * 16);
      const width = buffer.readUInt8(offset);
      const height = buffer.readUInt8(offset + 1);
      const colorCount = buffer.readUInt8(offset + 2);
      const planes = buffer.readUInt16LE(offset + 4);
      const bitCount = buffer.readUInt16LE(offset + 6);
      const imageSize = buffer.readUInt32LE(offset + 8);
      
      console.log(`Image ${i + 1}: ${width || 256}x${height || 256}, ${bitCount} bits, ${imageSize} bytes`);
    }
  } else {
    console.log('✗ Icon file does not have correct ICO header');
    console.log('Expected:', expectedHeader.toString('hex'));
    console.log('Actual:', actualHeader.toString('hex'));
  }
} else {
  console.log('✗ Icon file not found');
}

// Check if we need to copy icon to build resources
const buildIconPath = path.join(rootDir, 'build', 'xdllogo.ico');
console.log('\nChecking build directory icon...');
console.log('Build icon path:', buildIconPath);

if (!fs.existsSync(buildIconPath)) {
  console.log('Copying icon to build directory...');
  try {
    fs.copyFileSync(iconPath, buildIconPath);
    console.log('✓ Icon copied to build directory');
  } catch (error) {
    console.log('✗ Failed to copy icon:', error.message);
  }
} else {
  console.log('✓ Icon already exists in build directory');
}
