const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'public/icons/icon-128x128.ico',
    productName: '小斗笠直播助手',
    win32metadata: {
      'requested-execution-level': 'requireAdministrator',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'xiaodouli',
        setupIcon: 'public/icons/icon-128x128.ico',
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