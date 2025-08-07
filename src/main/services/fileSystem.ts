// 文件系统服务
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { loggerService } from './logger';

export class FileSystemService {
  private appDataPath: string;
  
  constructor() {
    this.appDataPath = app.getPath('userData');
  }
  
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      loggerService.addLog('debug', `File read: ${filePath}`, 'main');
      return content;
    } catch (error) {
      loggerService.addLog('error', `Failed to read file ${filePath}: ${error}`, 'main');
      throw error;
    }
  }
  
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf-8');
      loggerService.addLog('debug', `File written: ${filePath}`, 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to write file ${filePath}: ${error}`, 'main');
      throw error;
    }
  }
  
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
      loggerService.addLog('debug', `File deleted: ${filePath}`, 'main');
    } catch (error) {
      loggerService.addLog('error', `Failed to delete file ${filePath}: ${error}`, 'main');
      throw error;
    }
  }
  
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(dirPath);
      loggerService.addLog('debug', `Directory listed: ${dirPath}`, 'main');
      return files;
    } catch (error) {
      loggerService.addLog('error', `Failed to list directory ${dirPath}: ${error}`, 'main');
      throw error;
    }
  }
  
  async showOpenDialog(options: Electron.OpenDialogOptions = {}): Promise<string[]> {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        ...options,
      });
      
      if (!result.canceled) {
        loggerService.addLog('info', `Files selected: ${result.filePaths.join(', ')}`, 'main');
        return result.filePaths;
      }
      
      return [];
    } catch (error) {
      loggerService.addLog('error', `Failed to show open dialog: ${error}`, 'main');
      throw error;
    }
  }
  
  async showSaveDialog(options: Electron.SaveDialogOptions = {}): Promise<string | undefined> {
    try {
      const result = await dialog.showSaveDialog(options);
      
      if (!result.canceled && result.filePath) {
        loggerService.addLog('info', `Save path selected: ${result.filePath}`, 'main');
        return result.filePath;
      }
      
      return undefined;
    } catch (error) {
      loggerService.addLog('error', `Failed to show save dialog: ${error}`, 'main');
      throw error;
    }
  }
  
  getAppDataPath(): string {
    return this.appDataPath;
  }
  
  joinPath(...paths: string[]): string {
    return path.join(...paths);
  }
}

export const fileSystemService = new FileSystemService();