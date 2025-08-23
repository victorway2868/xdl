const { VitePlugin } = require('@electron-forge/plugin-vite');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    name: "小斗笠直播助手",
    executableName: "xiaodouli",
    icon: path.join(__dirname, 'public/icons/icon-128x128.ico'), // 使用ico格式图标
    win32metadata: {
      CompanyName: "小斗笠工作室",
      FileDescription: "小斗笠直播助手",
      OriginalFilename: "xiaodouli.exe",
      ProductName: "小斗笠直播助手",
      InternalName: "xiaodouli",
      FileVersion: "1.0.0",
      ProductVersion: "1.0.0"
    },
    extraResource: [
      "./src/main/app.manifest"
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'xiaodouli',
        setupExe: 'xiaodouli-Setup-${version}.exe',
        setupIcon: path.join(__dirname, 'public/icons/icon-128x128.ico'),
        // Remove certificate signing for now to fix build issues
        // certificateFile: process.env.CERTIFICATE_FILE,
        // certificatePassword: process.env.CERTIFICATE_PASSWORD,
        // signWithParams: `/f "${process.env.CERTIFICATE_FILE}" /p "${process.env.CERTIFICATE_PASSWORD}" /tr http://timestamp.digicert.com /td sha256 /fd sha256`,
        remoteReleases: false,
        noMsi: true,
        authors: '小斗笠工作室',
        description: '小斗笠直播助手安装程序',
        // Remove duplicate setupIcon and fix iconUrl path
        iconUrl: path.join(__dirname, 'public/icons/icon-128x128.ico'),
        // Remove requestedExecutionLevel as it's not a valid Squirrel option
        // requestedExecutionLevel: 'requireAdministrator',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts and Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};