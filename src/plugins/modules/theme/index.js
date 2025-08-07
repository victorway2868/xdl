// 主题插件示例 (编译后的 JavaScript 版本)
// 简化版本，不依赖 BasePlugin

class ThemePlugin {
  constructor() {
    this.name = 'theme';
    this.version = '1.0.0';
    this.description = '主题切换插件';
    this.context = null;
  }
  
  async activate(context) {
    this.context = context;
    await this.onActivate();
  }
  
  async deactivate() {
    await this.onDeactivate();
    this.context = null;
  }
  
  log(level, message, metadata) {
    if (this.context) {
      this.context.log(level, `[${this.name}] ${message}`, metadata);
    }
  }
  
  async getSettings() {
    return this.context ? this.context.getSettings() : {};
  }
  
  async saveSettings(settings) {
    if (this.context) {
      return this.context.saveSettings(settings);
    }
  }
  
  emit(event, data) {
    if (this.context) {
      this.context.emit(event, data);
    }
  }
  
  on(event, handler) {
    if (this.context) {
      this.context.on(event, handler);
    }
  }
  
  async onActivate() {
    this.log('info', 'Theme plugin activated');
    
    // 注册主题切换功能
    this.registerThemeToggle();
    
    // 监听设置变化
    this.on('settings-changed', this.handleSettingsChanged.bind(this));
  }
  
  async onDeactivate() {
    this.log('info', 'Theme plugin deactivated');
  }
  
  registerThemeToggle() {
    // 注册菜单项
    if (this.context) {
      this.context.registerMenuItem('view', {
        label: '切换主题',
        click: () => this.toggleTheme(),
      });
    }
    
    this.log('info', 'Theme toggle registered');
  }
  
  async toggleTheme() {
    try {
      const settings = await this.getSettings();
      const newTheme = settings.theme === 'light' ? 'dark' : 'light';
      
      await this.saveSettings({ ...settings, theme: newTheme });
      
      this.log('info', `Theme switched to ${newTheme}`);
      this.emit('theme-changed', { theme: newTheme });
    } catch (error) {
      this.log('error', `Failed to toggle theme: ${error}`);
    }
  }
  
  handleSettingsChanged(data) {
    if (data.theme) {
      this.log('info', `Theme changed to ${data.theme}`);
    }
  }
}

module.exports = ThemePlugin;