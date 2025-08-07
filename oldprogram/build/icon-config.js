// Icon configuration for electron-builder
// This file provides optimized icon paths for different platforms and use cases

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Icon paths relative to project root
const iconPaths = {
  // Windows icons
  win: {
    // Main application icon (highest quality for exe)
    app: 'public/icons/icon-256x256.png',
    // Installer icons (smaller for faster loading)
    installer: 'public/icons/icon-48x48.ico',
    uninstaller: 'public/icons/icon-48x48.ico',
    // Shortcut icons (standard Windows sizes)
    shortcut: 'public/icons/icon-32x32.ico',
    // Taskbar icon
    taskbar: 'public/icons/icon-32x32.ico'
  },
  
  // macOS icons (if needed in future)
  mac: {
    app: 'public/icons/icon-256x256.png',
    dmg: 'public/icons/icon-128x128.ico'
  },
  
  // Linux icons (if needed in future)
  linux: {
    app: 'public/icons/icon-256x256.png',
    desktop: 'public/icons/icon-64x64.ico'
  }
};

// Electron-builder configuration for icons
export const getIconConfig = (platform = 'win') => {
  const config = {
    win: {
      icon: iconPaths.win.app,
      nsis: {
        installerIcon: iconPaths.win.installer,
        uninstallerIcon: iconPaths.win.uninstaller,
        // Additional NSIS icon settings
        menuCategory: false,
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true
      }
    },
    
    mac: {
      icon: iconPaths.mac.app,
      dmg: {
        icon: iconPaths.mac.dmg
      }
    },
    
    linux: {
      icon: iconPaths.linux.app,
      desktop: {
        Icon: iconPaths.linux.desktop
      }
    }
  };
  
  return config[platform] || config.win;
};

// Runtime icon paths for Electron main process
export const getRuntimeIconPath = (size = '32x32') => {
  const iconFile = `icon-${size}.ico`;
  return path.join(rootDir, 'public', 'icons', iconFile);
};

// Available icon sizes
export const availableSizes = [
  '16x16', '24x24', '32x32', '48x48', 
  '64x64', '72x72', '96x96', '128x128', '256x256'
];

// Get best icon for specific use case
export const getBestIcon = (useCase) => {
  const useCases = {
    'window': 'icon-32x32.ico',
    'taskbar': 'icon-32x32.ico',
    'desktop-shortcut': 'icon-48x48.ico',
    'start-menu': 'icon-32x32.ico',
    'installer': 'icon-48x48.ico',
    'app-icon': 'icon-256x256.png',
    'notification': 'icon-24x24.ico',
    'system-tray': 'icon-16x16.ico'
  };
  
  const iconFile = useCases[useCase] || useCases['window'];
  return path.join(rootDir, 'public', 'icons', iconFile);
};

export default {
  getIconConfig,
  getRuntimeIconPath,
  getBestIcon,
  availableSizes,
  iconPaths
};
