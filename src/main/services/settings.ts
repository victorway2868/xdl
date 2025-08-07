// 设置管理服务
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { loggerService } from './logger';

export class SettingsService {
  private settingsPath: string;
  private settings: AppSettings;
  
  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.loadSettings();
  }
  
  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // 合并默认设置，确保所有字段都存在
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      loggerService.addLog('error', `Failed to load settings: ${error}`, 'main');
    }
    
    return { ...DEFAULT_SETTINGS };
  }
  
  private saveSettingsToFile(): void {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
      loggerService.addLog('info', 'Settings saved successfully', 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to save settings: ${error}`, 'main');
      throw error;
    }
  }
  
  getSettings(): AppSettings {
    return { ...this.settings };
  }
  
  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettingsToFile();
    
    loggerService.addLog('info', 'Settings updated', 'main', { updates });
  }
  
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettingsToFile();
    
    loggerService.addLog('info', 'Settings reset to defaults', 'main');
  }
}

export const settingsService = new SettingsService();