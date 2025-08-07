import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== 检查构建资源文件 ===\n');

// 检查需要包含的关键文件
const criticalFiles = [
  'public/images/original.cube',
  'public/images/winer.gif',
  'public/xdllogo.ico',
  'public/icons/icon-256x256.png',
  'public/icons/icon-32x32.ico',
  'public/fonts/CangErShuYuanTiW04-2.ttf'
];

console.log('检查关键资源文件:');
criticalFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  
  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`   大小: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   修改时间: ${stats.mtime.toISOString()}`);
  }
  console.log('');
});

// 检查 public 目录结构
console.log('=== Public 目录结构 ===');
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  function listDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const relativePath = path.relative(rootDir, itemPath);
      
      if (stats.isDirectory()) {
        console.log(`${prefix}📁 ${item}/`);
        listDirectory(itemPath, prefix + '  ');
      } else {
        const size = (stats.size / 1024).toFixed(2);
        console.log(`${prefix}📄 ${item} (${size} KB)`);
      }
    });
  }
  
  listDirectory(publicDir);
} else {
  console.log('❌ Public 目录不存在');
}

// 验证 LUT 文件内容
console.log('\n=== 验证 LUT 文件 ===');
const lutPath = path.join(rootDir, 'public/images/original.cube');
if (fs.existsSync(lutPath)) {
  try {
    const content = fs.readFileSync(lutPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log('✅ LUT 文件读取成功');
    console.log(`   总行数: ${lines.length}`);
    console.log(`   第一行: ${lines[0]}`);
    console.log(`   最后一行: ${lines[lines.length - 1]}`);
    
    // 验证 LUT 格式
    if (lines[0].startsWith('LUT_1D_SIZE')) {
      console.log('✅ LUT 格式验证通过');
    } else {
      console.log('⚠️  LUT 格式可能有问题');
    }
  } catch (error) {
    console.log('❌ 读取 LUT 文件失败:', error.message);
  }
} else {
  console.log('❌ LUT 文件不存在');
}

console.log('\n=== 构建配置检查 ===');

// 检查 build/build.js 配置
const buildConfigPath = path.join(__dirname, 'build.js');
if (fs.existsSync(buildConfigPath)) {
  console.log('✅ build/build.js 存在');
  
  // 读取并分析配置
  try {
    const buildContent = fs.readFileSync(buildConfigPath, 'utf8');
    
    // 检查是否包含 public/images
    if (buildContent.includes('public/images')) {
      console.log('✅ 构建配置包含 public/images 目录');
    } else {
      console.log('❌ 构建配置缺少 public/images 目录');
    }
    
    // 检查 extraResources 配置
    if (buildContent.includes('extraResources')) {
      console.log('✅ 构建配置包含 extraResources');
    } else {
      console.log('❌ 构建配置缺少 extraResources');
    }
    
  } catch (error) {
    console.log('❌ 读取构建配置失败:', error.message);
  }
} else {
  console.log('❌ build/build.js 不存在');
}

// 测试路径解析函数
console.log('\n=== 测试路径解析 ===');
function testLUTPathResolution() {
  try {
    // 模拟开发环境路径解析
    const moduleDir = path.join(rootDir, 'electron', 'modules', 'obsset_modules');
    const resolvedPath = path.resolve(path.join(moduleDir, '..', '..', '..', 'public', 'images', 'original.cube'));

    console.log('模拟从 setfilter.js 解析的路径:', resolvedPath);

    const exists = fs.existsSync(resolvedPath);
    console.log('路径解析测试:', exists ? '✅ 通过' : '❌ 失败');

    if (exists) {
      const expectedPath = path.join(rootDir, 'public', 'images', 'original.cube');
      const pathsMatch = path.resolve(resolvedPath) === path.resolve(expectedPath);
      console.log('路径匹配测试:', pathsMatch ? '✅ 通过' : '❌ 失败');
    }

    return exists;
  } catch (error) {
    console.log('❌ 路径解析测试失败:', error.message);
    return false;
  }
}

const pathTestPassed = testLUTPathResolution();

console.log('\n=== 建议 ===');
console.log('1. 确保所有关键文件都存在且可读');
console.log('2. 运行构建前先执行此检查脚本');
console.log('3. 构建后检查 dist 目录中是否包含所有资源文件');
console.log('4. 在生产环境中测试 LUT 文件路径解析');

if (pathTestPassed) {
  console.log('\n✅ 所有检查通过！可以安全进行构建。');
} else {
  console.log('\n⚠️  发现问题，请检查后再进行构建。');
}

console.log('\n检查完成！');
