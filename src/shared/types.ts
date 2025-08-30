// 共享的基础类型定义

export interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  autoStart: boolean;
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}


export interface DouyinUserInfo {
  nickname: string;
  userId: string;
  liveid: string;
  avatarUrl: string;
  followerCount: number;
  followingCount: number;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  source: 'main' | 'renderer' | 'plugin';
  metadata?: Record<string, any>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  dependencies?: string[];
  permissions?: string[];
}

export interface PluginInfo extends PluginManifest {
  id: string;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}