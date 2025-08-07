// 主题插件示例
import { BasePlugin } from '@plugins/core/base';

export default class ThemePlugin extends BasePlugin {
  readonly name = 'theme';
  readonly version = '1.0.0';
  readonly description = '主题切换插件';
  
  protected async onActivate(): Promise<void> {
    this.log('info', 'Theme plugin activated');
    
    // 注册主题切换功能
    this.registerThemeToggle();
    
    // 监听设置变化
    this.on('settings-changed', this.handleSettingsChanged.bind(this));
  }
  
  protected async onDeactivate(): Promise<void> {
    this.log('info', 'Theme plugin deactivated');
  }
  
  private registerThemeToggle(): void {
    // 注册菜单项
    this.context?.registerMenuItem('view', {
      label: '切换主题',
      click: () => this.toggleTheme(),
    });
    
    this.log('info', 'Theme toggle registered');
  }
  
  private async toggleTheme(): Promise<void> {
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
  
  private handleSettingsChanged(data: any): void {
    if (data.theme) {
      this.log('info', `Theme changed to ${data.theme}`);
    }
  }
}