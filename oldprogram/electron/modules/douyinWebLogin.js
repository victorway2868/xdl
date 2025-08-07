// douyinWebLogin.js - 抖音网页登录模块，使用时先清除浏览器所有数据防止旧数据残留
import { BrowserWindow, session, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pathManager, { PathType } from '../utils/pathManager.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义cookie文件保存路径
const cookieFilePath = pathManager.getPath(PathType.DOUYIN_COOKIES);

/**
 * 清除浏览器所有数据，使其像新浏览器一样
 * @returns {Promise<boolean>} 清除结果
 */
async function clearAllBrowserData() {
  try {
    console.log('正在清除浏览器所有数据，重置为新浏览器状态...');

    // 获取所有cookies
    const cookies = await session.defaultSession.cookies.get({});
    console.log(`找到 ${cookies.length} 个cookies需要清除`);

    // 逐个删除所有cookie
    for (const cookie of cookies) {
      try {
        await session.defaultSession.cookies.remove(
          `https://${cookie.domain}${cookie.path}`,
          cookie.name
        );
      } catch (err) {
        console.warn(`删除cookie ${cookie.name} 失败: ${err.message}`);
      }
    }

    // 清除所有存储数据，不指定origin表示清除所有网站的数据
    await session.defaultSession.clearStorageData({
      storages: [
        'appcache',
        'cookies',
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
        'sessionstorage'
      ]
    });

    // 清除HTTP缓存
    await session.defaultSession.clearCache();

    // 清除主机解析器缓存
    await session.defaultSession.clearHostResolverCache();

    // 清除认证缓存
    await session.defaultSession.clearAuthCache();

    console.log('浏览器所有数据已清除，现在是全新状态');
    return true;
  } catch (error) {
    console.error(`清除浏览器数据失败: ${error.message}`);
    return false;
  }
}

/**
 * 将cookies保存到文件（全新保存）
 * @param {Array} cookies Cookie数组
 * @returns {Promise<boolean>} 保存结果
 */
async function saveCookiesToFile(cookies) {
  try {
    // 将cookies转换为字符串格式
    const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    // 直接覆盖保存到文件
    fs.writeFileSync(cookieFilePath, cookieString, 'utf8');
    console.log(`已保存 ${cookies.length} 个网页Cookie到 ${cookieFilePath}`);
    return true;
  } catch (error) {
    console.error(`保存Cookie文件失败: ${error.message}`);
    return false;
  }
}

/**
 * 打开抖音网页登录窗口并处理登录流程
 * @returns {Promise<Object>} 登录结果，包含用户信息和cookies
 */
export function loginDouyinWeb() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Opening Douyin web login page');

      // 先清除浏览器所有数据，使其像新浏览器一样
      console.log('正在清除浏览器所有数据...');
      await clearAllBrowserData();
      console.log('浏览器数据清除完成，准备打开登录窗口');

      // 创建一个新的浏览器窗口
      let loginWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        },
        title: '抖音登录',
        center: true,
        resizable: false
      });

      // 加载抖音登录页面
      loginWindow.loadURL('https://www.douyin.com/user/self');

      // 在开发模式下打开开发者工具
      if (!app.isPackaged) {
        loginWindow.webContents.openDevTools({ mode: 'detach' });
      }

      // 检测登录状态的变量
      let isLoggedIn = false;
      let checkLoginInterval = null;
      let retryCount = 0;
      const maxRetries = 100; // 最大尝试次数
      let isCheckingLogin = false; // 防止多次启动检查

      // 设置窗口加载完成后的处理
      loginWindow.webContents.on('did-finish-load', () => {
        // 定期检查是否登录成功
        const startLoginCheck = () => {
          // 防止多次启动检查
          if (isCheckingLogin) {
            console.log('Login check already running, skipping');
            return;
          }

          isCheckingLogin = true;
          checkLoginInterval = setInterval(async () => {
            try {
              // 检查登录窗口是否已关闭或已登录
              if (!loginWindow || isLoggedIn) {
                console.log('Login window was closed or login successful, stopping login check interval');
                clearInterval(checkLoginInterval);
                checkLoginInterval = null;
                isCheckingLogin = false;
                return;
              }

              if (retryCount >= maxRetries) {
                // 超过最大尝试次数，关闭窗口并返回错误
                if (checkLoginInterval) {
                  clearInterval(checkLoginInterval);
                  checkLoginInterval = null;
                  isCheckingLogin = false;
                }
                if (loginWindow) {
                  loginWindow.close();
                  loginWindow = null;
                }
                resolve({ success: false, error: '登录超时' });
                return;
              }

              retryCount++;

              // 获取用户信息 - 确保窗口仍然存在
              if (!loginWindow || !loginWindow.webContents) {
                console.log('Login window or webContents no longer exists');
                if (checkLoginInterval) {
                  clearInterval(checkLoginInterval);
                  checkLoginInterval = null;
                  isCheckingLogin = false;
                }
                return;
              }

              const userInfo = await loginWindow.webContents.executeJavaScript(`
                (function() {
                  try {
                    // 尝试获取用户昵称
                    let nickname = '抖音用户';
                    // 尝试多个可能的选择器
                    if (document.querySelector('h1.a34DMvQe')) {
                      nickname = document.querySelector('h1.a34DMvQe').innerText.trim();
                    } else if (document.querySelector('.j5WZzJdp')) {
                      nickname = document.querySelector('.j5WZzJdp').innerText.trim();
                    } else if (document.querySelector('.nickname')) {
                      nickname = document.querySelector('.nickname').innerText.trim();
                    }

                    // 尝试获取用户头像
                    let avatar_url = null;
                    const avatarEl = document.querySelector('img.RlLOO79h');
                    if (avatarEl) {
                      avatar_url = avatarEl.src;
                    } else {
                      // 尝试其他可能的头像选择器
                      const altAvatarEl = document.querySelector('.avatar img') ||
                                          document.querySelector('.BhdsqJgJ img');
                      if (altAvatarEl) {
                        avatar_url = altAvatarEl.src;
                      }
                    }

                    // 判断是否获取到真实用户数据 - 只需要昵称不是默认值且有头像
                    const hasRealUserData = nickname !== '抖音用户' && avatar_url !== null;

                    console.log('抖音用户信息检查:', {
                      nickname,
                      avatar_url,
                      hasRealUserData
                    });

                    return {
                      nickname,
                      avatar_url,
                      hasRealUserData
                    };
                  } catch (e) {
                    console.error('Error extracting user info:', e);
                    return { hasRealUserData: false };
                  }
                })();
              `);

              console.log(`Attempt ${retryCount}/${maxRetries} - User info extracted:`, userInfo);

              // 判断是否获取到真实用户数据 - 只需要昵称不是默认值且有头像
              const hasRealUserData = userInfo && userInfo.hasRealUserData;

              // 打印详细的判断条件，便于调试
              console.log('登录判断条件:', {
                '重试次数': retryCount,
                '用户数据存在': !!userInfo,
                '昵称': userInfo ? userInfo.nickname : null,
                '头像': userInfo ? userInfo.avatar_url : null,
                '是否真实数据': hasRealUserData
              });

              // 如果已经获取到真实用户数据，则获取cookie并完成登录
              if (hasRealUserData) {
                console.log('检测到真实用户数据，登录成功！');

                // 获取cookies - 只有在获取到真实用户数据后才执行
                const cookies = await session.defaultSession.cookies.get({ domain: '.douyin.com' });

                // 保存cookies到文件
                if (cookies && cookies.length > 0) {
                  await saveCookiesToFile(cookies);
                  console.log(`已保存 ${cookies.length} 个Cookie到文件`);
                }

                // 标记为已登录
                isLoggedIn = true;

                // 清除定时器
                if (checkLoginInterval) {
                  clearInterval(checkLoginInterval);
                  checkLoginInterval = null;
                  isCheckingLogin = false;
                }

                // 构建用户数据 - 只使用昵称和头像
                let userId = '';
                const sessionIdCookie = cookies.find(cookie => cookie.name === 'sessionid');
                if (sessionIdCookie) {
                  userId = `douyin_${sessionIdCookie.value.substring(0, 8)}`;
                } else {
                  userId = `douyin_${userInfo.nickname.replace(/\s+/g, '_')}_${Date.now()}`;
                }

                const userData = {
                  id: userId,
                  nickname: userInfo.nickname,
                  avatar_url: userInfo.avatar_url
                };

                console.log('Final user data:', userData);

                // 关闭登录窗口
                if (loginWindow) {
                  const windowToClose = loginWindow;
                  loginWindow = null; // 先设置为null，防止closed事件重复处理
                  windowToClose.close();
                }

                // 返回用户信息和cookie
                resolve({
                  success: true,
                  user: userData,
                  cookies: cookies,
                  cookieString: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
                });
                return;
              }

              // 继续等待获取用户数据
              console.log(`尚未获取到真实用户数据，继续等待... (${retryCount}/${maxRetries})`);

              // 如果重试次数达到上限，则登录失败
              if (retryCount >= maxRetries - 1) {
                console.log('重试次数达到上限，登录失败');
                resolve({ success: false, error: '登录失败：未能获取到用户真实数据' });
                return;
              }
            } catch (error) {
              console.error('Error checking login status:', error);
            }
          }, 1000); // 每秒检查一次
        };

        // 开始检查登录状态
        startLoginCheck();
      });

      // 监听窗口关闭事件
      loginWindow.on('closed', () => {
        console.log('Login window closed event triggered');

        // 防止重复处理
        if (loginWindow === null) {
          console.log('Window already handled, skipping duplicate closed event');
          return;
        }

        // 清除定时器
        if (checkLoginInterval) {
          clearInterval(checkLoginInterval);
          checkLoginInterval = null;
          isCheckingLogin = false;
        }

        // 如果窗口关闭时还没有登录成功，则返回取消登录
        if (!isLoggedIn) {
          resolve({ success: false, error: '用户取消登录' });
        }

        loginWindow = null;
      });

    } catch (error) {
      console.error('Failed to login to Douyin web:', error);
      reject({ success: false, error: error.message });
    }
  });
}

export default loginDouyinWeb;
