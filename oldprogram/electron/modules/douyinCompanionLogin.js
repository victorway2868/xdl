// douyinCompanionLogin.js - 抖音直播伴侣登录模块
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { getSoftwareVersion, getSoftwarePath } from '../utils/Findsoftpaths.js';
import { getDouyinCookies } from './getDouyinCompanion_cookies.js';

// 将回调函数转换为 Promise
const fsAccess = promisify(fs.access);
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);



// 直播伴侣数据文件路径
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const HOTKEY_STORE_PATH = path.join(APPDATA, 'webcast_mate', 'WBStore', 'hotkeyStore.json');

/**
 * 配置直播伴侣的快捷键设置
 * @returns {Promise<boolean>} 配置是否成功
 */
async function configureHotkeySettings() {
  try {
    console.log('正在配置直播伴侣快捷键设置...');

    // 默认的开始直播快捷键配置
    const defaultStartLiveHotkey = {
      label: "开始直播",
      target: "0",
      command: "StartLive",
      accelerator: "Ctrl+Shift+L",
      code: [
        "ControlLeft",
        "ShiftLeft",
        "KeyL"
      ]
    };

    // 默认的hotkeyStore配置
    const defaultHotkeyStore = {
      hotkeyStore: {
        config: [defaultStartLiveHotkey],
        hotkeys: [
          {
            ...defaultStartLiveHotkey,
            type: "LIVE_SETTING"
          }
        ],
        enable: true,
        typeEnable: {
          MESSAGE: true,
          AUDIO_LIB: false,
          LIVE_SETTING: true
        }
      }
    };

    // 检查hotkeyStore.json文件是否存在
    let hotkeyStore = defaultHotkeyStore;

    try {
      await fsAccess(HOTKEY_STORE_PATH, fs.constants.R_OK);
      console.log('找到hotkeyStore.json文件');

      // 读取文件内容
      const hotkeyStoreData = await fsReadFile(HOTKEY_STORE_PATH, 'utf8');

      try {
        // 解析JSON
        const parsedData = JSON.parse(hotkeyStoreData);
        console.log('成功解析hotkeyStore.json文件');

        // 确保有hotkeyStore对象
        if (!parsedData.hotkeyStore) {
          parsedData.hotkeyStore = defaultHotkeyStore.hotkeyStore;
        }

        // 确保typeEnable对象存在
        if (!parsedData.hotkeyStore.typeEnable) {
          parsedData.hotkeyStore.typeEnable = defaultHotkeyStore.hotkeyStore.typeEnable;
        }

        // 设置LIVE_SETTING为true
        parsedData.hotkeyStore.typeEnable.LIVE_SETTING = true;

        // 检查是否有"开始直播"的快捷键配置
        let hasStartLiveHotkey = false;
        if (parsedData.hotkeyStore.hotkeys && Array.isArray(parsedData.hotkeyStore.hotkeys)) {
          hasStartLiveHotkey = parsedData.hotkeyStore.hotkeys.some(
            hotkey => hotkey.label === "开始直播" && hotkey.type === "LIVE_SETTING"
          );
        } else {
          parsedData.hotkeyStore.hotkeys = [];
        }

        // 如果没有"开始直播"的快捷键配置，添加默认配置
        if (!hasStartLiveHotkey) {
          console.log('未找到"开始直播"快捷键配置，添加默认配置');
          parsedData.hotkeyStore.hotkeys.push({
            ...defaultStartLiveHotkey,
            type: "LIVE_SETTING"
          });
        }

        // 确保config数组存在
        if (!parsedData.hotkeyStore.config || !Array.isArray(parsedData.hotkeyStore.config)) {
          parsedData.hotkeyStore.config = [];
        }

        // 检查config中是否有"开始直播"的配置
        let hasStartLiveConfig = parsedData.hotkeyStore.config.some(
          config => config.label === "开始直播" && config.command === "StartLive"
        );

        // 如果没有，添加默认配置
        if (!hasStartLiveConfig) {
          console.log('未找到"开始直播"config配置，添加默认配置');
          parsedData.hotkeyStore.config.push(defaultStartLiveHotkey);
        }

        // 确保enable为true
        parsedData.hotkeyStore.enable = true;

        hotkeyStore = parsedData;
      } catch (parseError) {
        console.error('解析hotkeyStore.json文件失败:', parseError);
        // 使用默认配置
        console.log('使用默认的hotkeyStore配置');
      }
    } catch (error) {
      console.log('hotkeyStore.json文件不存在，将创建新文件');
    }

    // 保存配置到文件
    await fsWriteFile(HOTKEY_STORE_PATH, JSON.stringify(hotkeyStore, null, 2), 'utf8');
    console.log('已保存hotkeyStore.json配置');

    return true;
  } catch (error) {
    console.error('配置快捷键设置失败:', error);
    return false;
  }
}

/**
 * 获取"开始直播"的快捷键值
 * @returns {Promise<Object>} 快捷键配置对象，包含accelerator和code
 */
export async function getStartLiveHotkey() {
  try {
    // 默认的开始直播快捷键配置
    const defaultHotkey = {
      accelerator: "Ctrl+Shift+L",
      code: [
        "ControlLeft",
        "ShiftLeft",
        "KeyL"
      ]
    };

    // 检查hotkeyStore.json文件是否存在
    try {
      await fsAccess(HOTKEY_STORE_PATH, fs.constants.R_OK);
      console.log('找到hotkeyStore.json文件');

      // 读取文件内容
      const hotkeyStoreData = await fsReadFile(HOTKEY_STORE_PATH, 'utf8');

      try {
        // 解析JSON
        const parsedData = JSON.parse(hotkeyStoreData);

        // 查找"开始直播"的快捷键配置
        if (parsedData.hotkeyStore &&
            parsedData.hotkeyStore.hotkeys &&
            Array.isArray(parsedData.hotkeyStore.hotkeys)) {

          const startLiveHotkey = parsedData.hotkeyStore.hotkeys.find(
            hotkey => hotkey.label === "开始直播" && hotkey.type === "LIVE_SETTING"
          );

          if (startLiveHotkey && startLiveHotkey.accelerator && startLiveHotkey.code) {
            console.log('找到"开始直播"快捷键配置:', startLiveHotkey.accelerator);
            return {
              accelerator: startLiveHotkey.accelerator,
              code: startLiveHotkey.code
            };
          }
        }

        console.log('未找到有效的"开始直播"快捷键配置，使用默认值');
        return defaultHotkey;
      } catch (parseError) {
        console.error('解析hotkeyStore.json文件失败:', parseError);
        return defaultHotkey;
      }
    } catch (error) {
      console.log('hotkeyStore.json文件不存在，使用默认快捷键');
      return defaultHotkey;
    }
  } catch (error) {
    console.error('获取"开始直播"快捷键失败:', error);
    return {
      accelerator: "Ctrl+Shift+L",
      code: [
        "ControlLeft",
        "ShiftLeft",
        "KeyL"
      ]
    };
  }
}



/**
 * 打开抖音直播伴侣并处理登录流程
 * @returns {Promise<Object>} 登录结果，包含用户信息和cookies
 */
export function loginDouyinCompanion() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Getting Douyin companion login info');

      // 检测直播伴侣版本
      const companionVersion = await getSoftwareVersion('直播伴侣');
      if (!companionVersion || companionVersion === '未检测到') {
        return resolve({ success: false, error: '未检测到直播伴侣，请先安装直播伴侣' });
      }

      // 获取直播伴侣安装路径
      const companionPath = await getSoftwarePath('直播伴侣');
      console.log('Douyin companion path:', companionPath);

      if (!companionPath) {
        return resolve({ success: false, error: '无法获取直播伴侣路径，请确认安装正确' });
      }

      // 配置快捷键设置
      try {
        await configureHotkeySettings();
      } catch (hotkeyError) {
        console.error('配置快捷键设置时出错:', hotkeyError);
        // 继续执行，不中断流程
      }

      // 启动直播伴侣
      console.log('正在启动直播伴侣...');

      // 使用child_process启动直播伴侣
      exec(`"${companionPath}"`, (error) => {
        if (error) {
          console.error(`启动直播伴侣错误: ${error}`);
          return resolve({ success: false, error: `启动直播伴侣失败: ${error.message}` });
        }

        console.log('直播伴侣已启动');

        // 直接获取Cookie，不需要等待用户数据文件
        console.log('跳过用户数据获取，直接提取Cookie...');

        // 使用异步立即执行函数
        (async () => {
          try {
            // 直接获取Cookie
            console.log('正在从webcast_mate获取抖音Cookie...');
            const cookieResult = await getDouyinCookies();

            if (!cookieResult.success) {
              console.error('获取Cookie失败:', cookieResult.error);
              return resolve({
                success: false,
                error: `获取Cookie失败: ${cookieResult.error}`
              });
            }

            console.log(`成功获取 ${cookieResult.cookies.length} 个Cookie`);

            // 返回成功结果，包含简单用户信息和真实Cookie
            resolve({
              success: true,
              cookies: cookieResult.cookies,
              cookieString: cookieResult.cookieString
            });
          } catch (error) {
            console.error('从直播伴侣获取信息失败:', error);
            resolve({ success: false, error: `从直播伴侣获取信息失败: ${error.message}` });
          }
        })();
      });

    } catch (error) {
      console.error('Failed to login with Douyin companion:', error);
      reject({ success: false, error: error.message });
    }
  });
}

export default loginDouyinCompanion;
