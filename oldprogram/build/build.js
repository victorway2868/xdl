import { build, Platform } from 'electron-builder';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getIconConfig } from './icon-config.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get optimized icon configuration
const iconConfig = getIconConfig('win');

// Define build configuration
const config = {
  appId: 'com.xdlwebcast.app',
  productName: '小斗笠直播助手',
  executableName: '小斗笠直播助手',
  asar: true,
  compression: 'maximum',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'public/icons/**/*',
    'public/fonts/**/*',
    'public/images/**/*',
    'public/xdllogo.ico',
    'package.json'
  ],
  extraResources: [
    {
      from: 'public/icons',
      to: 'public/icons',
      filter: ['**/*']
    },
    {
      from: 'public/fonts',
      to: 'public/fonts',
      filter: ['**/*']
    },
    {
      from: 'public/images',
      to: 'public/images',
      filter: ['**/*']
    },
    {
      from: 'public/xdllogo.ico',
      to: 'public/xdllogo.ico'
    }
  ],
  win: {
    target: ['nsis'],
    signAndEditExecutable: false,
    requestedExecutionLevel: 'requireAdministrator',
    icon: iconConfig.icon,
    verifyUpdateCodeSignature: false
  },
  nsis: {
    oneClick: true,  // 启用一键安装（带进度条的静默安装）
    allowToChangeInstallationDirectory: false,  // 不允许更改安装目录
    perMachine: false,
    // 禁用默认快捷方式创建，我们在自定义脚本中创建
    createDesktopShortcut: false,
    createStartMenuShortcut: false,
    shortcutName: '小斗笠直播助手',
    include: 'build/installer.nsh',
    artifactName: '小斗笠直播助手-Setup-${version}.${ext}',
    installerIcon: iconConfig.nsis.installerIcon,
    uninstallerIcon: iconConfig.nsis.uninstallerIcon,
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,  // 安装完成后启动应用程序
    displayLanguageSelector: false,
    // 带进度条的静默安装选项
    allowElevation: true,
    warningsAsErrors: false,
    // 支持静默安装参数
    installerHeaderIcon: iconConfig.nsis.installerIcon,
    // 进度条和界面设置
    installerSidebar: iconConfig.nsis.installerIcon,  // 安装侧边栏图标
    uninstallerSidebar: iconConfig.nsis.uninstallerIcon  // 卸载侧边栏图标
  }
};

// Run resource checks before build
console.log('Checking resources and configuration...');
try {
  const { execSync } = await import('child_process');

  // Check icons
  console.log('Checking icon configuration...');
  execSync('node build/check-icon.js', { stdio: 'inherit' });

  // Check all resources including LUT file
  console.log('Checking all resources...');
  execSync('node build/check-resources.js', { stdio: 'inherit' });

} catch (error) {
  console.warn('Resource check failed:', error.message);
  console.warn('Continuing with build, but some resources might be missing...');
}

// Log build start
console.log('Starting Electron build with configuration:', JSON.stringify(config, null, 2));

// Function to generate latest.yml file
function generateVersionFile() {
  console.log('Generating latest.yml version file...');

  // Load package.json to get version info
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const { version } = packageJson;
  const productName = config.productName || "小斗笠直播助手";

  // Path to the installer file
  const installerFileName = `小斗笠直播助手-Setup-${version}.exe`;
  const outputDirPath = path.join(__dirname, '..', config.directories.output);
  const installerPath = path.join(outputDirPath, installerFileName);

  // Get file size if installer exists
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
    downloadUrl: `https://84794ee73142290fa69ac64ae8fc7bee.r2.cloudflarestorage.com/xiaodouliupdates/${installerFileName}`,
    fileName: installerFileName,
    ...(fileSize && { fileSize }), // Only add fileSize if it exists
    sha512: '', // We could add a hash here if needed
  };

  const versionInfoPath = path.join(outputDirPath, 'latest.yml');
  try {
    fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
    console.log(`Successfully generated latest.yml at: ${versionInfoPath}`);
    console.log('Version info content:');
    console.log(JSON.stringify(versionInfo, null, 2));
  } catch (error) {
    console.error(`Error writing version info file: ${error.message}`);
  }
}

// Build the app
build({
  targets: Platform.WINDOWS.createTarget(),
  config: config
})
.then(() => {
  console.log('Build completed successfully!');
  console.log('Build output directory: ' + config.directories.output);

  // Generate version file after successful build
  generateVersionFile();
})
.catch((error) => {
  console.error('Error during build:', error);
  process.exit(1);
});
