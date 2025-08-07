// 数据库服务 (简单的 JSON 文件存储)
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { loggerService } from './logger';

export class DatabaseService {
  private dataPath: string;
  private data: Record<string, any> = {};
  
  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'data.json');
    this.loadData();
  }
  
  private loadData(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        this.data = JSON.parse(content);
        loggerService.addLog('info', 'Database loaded successfully', 'main');
      }
    } catch (error) {
      loggerService.addLog('error', `Failed to load database: ${error}`, 'main');
      this.data = {};
    }
  }
  
  private saveData(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
      loggerService.addLog('debug', 'Database saved successfully', 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to save database: ${error}`, 'main');
      throw error;
    }
  }
  
  get(key: string): any {
    return this.data[key];
  }
  
  set(key: string, value: any): void {
    this.data[key] = value;
    this.saveData();
  }
  
  delete(key: string): boolean {
    if (key in this.data) {
      delete this.data[key];
      this.saveData();
      return true;
    }
    return false;
  }
  
  has(key: string): boolean {
    return key in this.data;
  }
  
  keys(): string[] {
    return Object.keys(this.data);
  }
  
  clear(): void {
    this.data = {};
    this.saveData();
  }
}

export const databaseService = new DatabaseService();