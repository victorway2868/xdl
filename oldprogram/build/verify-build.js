import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== 验证构建结果 ===\n');

// 检查构建输出目录
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('❌ dist 目录不存在，请先运行构建');
  process.exit(1);
}

console.log('✅ dist 目录存在');

// 查找可执行文件
function findExecutable(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isFile() && item.endsWith('.exe')) {
      return itemPath;
    } else if (stats.isDirectory()) {
      const result = findExecutable(itemPath);
      if (result) return result;
    }
  }
  return null;
}

const exePath = findExecutable(distDir);
if (exePath) {
  console.log('✅ 找到可执行文件:', path.relative(rootDir, exePath));
  
  // 检查可执行文件目录下的 resources 目录
  const exeDir = path.dirname(exePath);
  const resourcesDir = path.join(exeDir, 'resources');
  
  if (fs.existsSync(resourcesDir)) {
    console.log('✅ resources 目录存在');
    
    // 检查 public/images/original.cube
    const lutPath = path.join(resourcesDir, 'public', 'images', 'original.cube');
    if (fs.existsSync(lutPath)) {
      console.log('✅ original.cube 文件已正确打包');
      
      // 验证文件内容
      try {
        const content = fs.readFileSync(lutPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        console.log(`   文件大小: ${(fs.statSync(lutPath).size / 1024).toFixed(2)} KB`);
        console.log(`   行数: ${lines.length}`);
        
        if (lines[0] && lines[0].startsWith('LUT_1D_SIZE')) {
          console.log('✅ LUT 文件格式正确');
        } else {
          console.log('⚠️  LUT 文件格式可能有问题');
        }
      } catch (error) {
        console.log('❌ 无法读取 LUT 文件:', error.message);
      }
    } else {
      console.log('❌ original.cube 文件未找到');
      console.log('   预期路径:', lutPath);
      
      // 列出 resources 目录内容
      console.log('\n   resources 目录内容:');
      function listDir(dir, prefix = '   ') {
        try {
          const items = fs.readdirSync(dir);
          items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
              console.log(`${prefix}📁 ${item}/`);
              if (prefix.length < 12) { // 限制递归深度
                listDir(itemPath, prefix + '  ');
              }
            } else {
              console.log(`${prefix}📄 ${item}`);
            }
          });
        } catch (error) {
          console.log(`${prefix}❌ 无法读取目录: ${error.message}`);
        }
      }
      listDir(resourcesDir);
    }
    
    // 检查其他关键文件
    const criticalFiles = [
      'public/images/winer.gif',
      'public/xdllogo.ico',
      'public/icons/icon-256x256.png',
      'public/fonts/CangErShuYuanTiW04-2.ttf'
    ];
    
    console.log('\n检查其他关键文件:');
    criticalFiles.forEach(file => {
      const filePath = path.join(resourcesDir, file);
      const exists = fs.existsSync(filePath);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${file}`);
    });
    
  } else {
    console.log('❌ resources 目录不存在');
  }
} else {
  console.log('❌ 未找到可执行文件');
}

console.log('\n=== 验证完成 ===');
console.log('如果发现问题，请检查构建配置中的 files 和 extraResources 设置。');
