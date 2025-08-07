import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 创建 icons 目录
const iconsDir = path.join(rootDir, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('Created icons directory:', iconsDir);
}

// 读取原始 ICO 文件
const iconPath = path.join(rootDir, 'public', 'xdllogo.ico');
console.log('Reading icon file:', iconPath);

if (!fs.existsSync(iconPath)) {
  console.error('Icon file not found:', iconPath);
  process.exit(1);
}

const buffer = fs.readFileSync(iconPath);

// 验证 ICO 文件头
const expectedHeader = Buffer.from([0x00, 0x00, 0x01, 0x00]);
const actualHeader = buffer.slice(0, 4);

if (!actualHeader.equals(expectedHeader)) {
  console.error('Invalid ICO file format');
  process.exit(1);
}

// 读取图像数量
const numImages = buffer.readUInt16LE(4);
console.log('Number of images in icon:', numImages);

// 提取每个图像
const extractedIcons = [];

for (let i = 0; i < numImages; i++) {
  const offset = 6 + (i * 16);
  
  // 读取图像目录条目
  const width = buffer.readUInt8(offset) || 256;
  const height = buffer.readUInt8(offset + 1) || 256;
  const colorCount = buffer.readUInt8(offset + 2);
  const reserved = buffer.readUInt8(offset + 3);
  const planes = buffer.readUInt16LE(offset + 4);
  const bitCount = buffer.readUInt16LE(offset + 6);
  const imageSize = buffer.readUInt32LE(offset + 8);
  const imageOffset = buffer.readUInt32LE(offset + 12);
  
  console.log(`Image ${i + 1}: ${width}x${height}, ${bitCount} bits, ${imageSize} bytes at offset ${imageOffset}`);
  
  // 提取图像数据
  const imageData = buffer.slice(imageOffset, imageOffset + imageSize);
  
  // 检查是否是 PNG 格式 (现代 ICO 文件通常包含 PNG)
  const isPNG = imageData.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  
  if (isPNG) {
    // 直接保存 PNG 数据
    const filename = `icon-${width}x${height}.png`;
    const outputPath = path.join(iconsDir, filename);
    fs.writeFileSync(outputPath, imageData);
    console.log(`✓ Extracted PNG: ${filename}`);
    extractedIcons.push({ size: `${width}x${height}`, file: filename, format: 'png' });
  } else {
    // 创建单独的 ICO 文件
    const filename = `icon-${width}x${height}.ico`;
    const outputPath = path.join(iconsDir, filename);
    
    // 创建新的 ICO 文件头
    const newIcoHeader = Buffer.alloc(6 + 16);
    newIcoHeader.writeUInt16LE(0, 0);      // Reserved
    newIcoHeader.writeUInt16LE(1, 2);      // Type (1 = ICO)
    newIcoHeader.writeUInt16LE(1, 4);      // Number of images
    
    // 写入图像目录条目
    newIcoHeader.writeUInt8(width === 256 ? 0 : width, 6);
    newIcoHeader.writeUInt8(height === 256 ? 0 : height, 7);
    newIcoHeader.writeUInt8(colorCount, 8);
    newIcoHeader.writeUInt8(reserved, 9);
    newIcoHeader.writeUInt16LE(planes, 10);
    newIcoHeader.writeUInt16LE(bitCount, 12);
    newIcoHeader.writeUInt32LE(imageSize, 14);
    newIcoHeader.writeUInt32LE(22, 18);    // New offset (after header)
    
    // 合并头部和图像数据
    const newIcoFile = Buffer.concat([newIcoHeader, imageData]);
    fs.writeFileSync(outputPath, newIcoFile);
    console.log(`✓ Extracted ICO: ${filename}`);
    extractedIcons.push({ size: `${width}x${height}`, file: filename, format: 'ico' });
  }
}

// 创建图标配置文件
const iconConfig = {
  source: 'xdllogo.ico',
  extracted: new Date().toISOString(),
  icons: extractedIcons
};

const configPath = path.join(iconsDir, 'icon-config.json');
fs.writeFileSync(configPath, JSON.stringify(iconConfig, null, 2));
console.log('✓ Created icon configuration file');

// 创建不同格式的图标集合
const iconSets = {
  // Windows 标准尺寸
  windows: ['16x16', '24x24', '32x32', '48x48', '64x64', '128x128', '256x256'],
  // macOS 标准尺寸
  macos: ['16x16', '32x32', '64x64', '128x128', '256x256'],
  // Linux 标准尺寸
  linux: ['16x16', '24x24', '32x32', '48x48', '64x64', '96x96', '128x128', '256x256']
};

console.log('\nAvailable icon sizes:');
extractedIcons.forEach(icon => {
  console.log(`  ${icon.size} - ${icon.file} (${icon.format.toUpperCase()})`);
});

console.log('\nIcon extraction completed!');
console.log('Icons saved to:', iconsDir);
