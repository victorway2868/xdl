const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    asar: true,
    name: "小斗笠直播助手",
    executableName: "xiaodouli",
    icon: "./public/icons/icon-256x256.png", // 使用最高分辨率图标
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
        setupIcon: './public/icons/icon-128x128.ico', // 使用128x128图标作为安装程序图标
        loadingGif: './public/loading.gif', // 可以添加安装加载动画
        certificateFile: process.env.CERTIFICATE_FILE, // 代码签名证书路径
        certificatePassword: process.env.CERTIFICATE_PASSWORD, // 证书密码
        signWithParams: `/f "${process.env.CERTIFICATE_FILE}" /p "${process.env.CERTIFICATE_PASSWORD}" /tr http://timestamp.digicert.com /td sha256 /fd sha256`,
        remoteReleases: false,
        noMsi: true,
        // 配置安装程序需要管理员权限
        setupMsi: false,
        // 添加安装程序的管理员权限要求
        authors: '小斗笠工作室',
        description: '小斗笠直播助手安装程序',
        // 强制以管理员身份运行安装程序
        requestedExecutionLevel: 'requireAdministrator',
        // Squirrel特定的快捷方式配置
        iconUrl: './public/icons/icon-128x128.ico',
        // 创建桌面快捷方式
        setupIcon: './public/icons/icon-128x128.ico',
        // 配置快捷方式创建
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        // 添加快捷方式描述
        shortcutName: '小斗笠直播助手'
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