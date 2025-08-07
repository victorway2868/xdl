import fetch from 'node-fetch';
import fs from 'fs/promises';
import pathManager, { PathType } from '../utils/pathManager.js';

/**
 * 仅通过cookie获取当前登录用户的粉丝数、关注数等信息
 * @param {string} cookieData - Cookie数据
 * @returns {Promise<Object|null>} 用户统计信息
 */
export async function douyinGetUserStats(cookieData) {
    // 尝试用户个人资料接口
    const url = "https://www.douyin.com/aweme/v1/web/user/profile/self/?webid=7497768420516333092&aid=6383&version_code=170400&device_platform=webapp";

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookieData,
        "Referer": "https://www.douyin.com/",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "X-Secsdk-Csrf-Token": "",
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        console.log(`状态码: ${response.status}`);

        if (response.status === 200) {
            const data = await response.json();
            // 只在开发环境且启用调试时输出详细响应数据
            if (process.env.NODE_ENV === 'development' && process.env.DEBUG_API === 'true') {
                console.log("原始响应数据:");
                console.log(JSON.stringify(data, null, 2));
            }
            
            // 提取用户信息
            const userInfo = data.user || {};
            
            if (userInfo && Object.keys(userInfo).length > 0) {
                // 获取头像链接
                const avatarThumb = userInfo.avatar_thumb || {};
                const avatarUrls = avatarThumb.url_list || [];
                const avatarUrl = avatarUrls.length > 0 ? avatarUrls[0] : "";

                // 获取统计数据
                const stats = {
                    nickname: userInfo.nickname || "",
                    unique_id: userInfo.unique_id || "",
                    uid: userInfo.uid || "",                          // 用户UID
                    sec_uid: userInfo.sec_uid || "",                  // SEC_UID
                    avatar_url: avatarUrl,                            // 头像链接
                    follower_count: userInfo.follower_count || 0,     // 粉丝数
                    following_count: userInfo.following_count || 0,   // 关注数
                    total_favorited: userInfo.total_favorited || 0,   // 获赞总数
                    aweme_count: userInfo.aweme_count || 0,           // 作品数
                    signature: userInfo.signature || "",              // 个人简介
                    live_status: userInfo.live_status || 0,          // 直播状态
                    room_id: userInfo.room_id_str || "",             // 直播间ID
                };

                // 用户统计信息已成功获取（详细信息在verbose模式下显示）
                
                return stats;
            } else {
                console.log("未找到用户信息");
                return null;
            }
                
        } else {
            console.log(`请求失败，状态码: ${response.status}`);
            const responseText = await response.text();
            console.log(`响应内容: ${responseText}`);
            return null;
        }
            
    } catch (error) {
        console.log(`获取用户统计信息出错: ${error.message}`);
        return null;
    }
}

/**
 * 通过直播间接口获取用户信息（基于原来的代码）
 * @param {string} cookieData - Cookie数据
 * @returns {Promise<Object|null>} 用户统计信息
 */
export async function douyinGetUserStatsWebcast(cookieData) {
    const url = "https://webcast.amemv.com/webcast/room/get_latest_room/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880";

    const agentValue = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";

    const headers = {
        "Connection": "Keep-Alive",
        "Content-Type": "application/x-www-form-urlencoded; Charset=UTF-8",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-cn",
        "Cookie": cookieData,
        "Host": "webcast.amemv.com",
        "Referer": url,
        "User-Agent": agentValue,
        "Origin": "file://",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors",
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers
        });
        
        console.log(`直播间接口状态码: ${response.status}`);

        if (response.status === 200) {
            const data = await response.json();
            // 只在开发环境且启用调试时输出详细响应数据
            if (process.env.NODE_ENV === 'development' && process.env.DEBUG_API === 'true') {
                console.log("直播间接口响应数据:");
                console.log(JSON.stringify(data, null, 2));
            }

            // 提取用户信息
            const ownerInfo = data.data?.owner || {};

            if (ownerInfo && Object.keys(ownerInfo).length > 0) {
                // 获取头像链接
                const avatarThumb = ownerInfo.avatar_thumb || {};
                const avatarUrls = avatarThumb.url_list || [];
                const avatarUrl = avatarUrls.length > 0 ? avatarUrls[0] : "";

                // 获取统计信息
                const stats = {
                    nickname: ownerInfo.nickname || "",
                    unique_id: ownerInfo.unique_id || ownerInfo.display_id || "",  // 尝试多个字段
                    uid: ownerInfo.id_str || "",                      // 用户UID
                    sec_uid: ownerInfo.sec_uid || "",                 // SEC_UID
                    avatar_url: avatarUrl,                            // 头像链接
                    follower_count: ownerInfo.follow_info?.follower_count || 0,
                    following_count: ownerInfo.follow_info?.following_count || 0,
                    total_favorited: ownerInfo.total_favorited || 0,  // 获赞总数
                    aweme_count: ownerInfo.aweme_count || 0,          // 作品数
                    room_id: data.data?.id_str || "",
                    live_status: data.data?.status || 0,
                    signature: ownerInfo.signature || "",
                };

                // 直播间用户统计信息已成功获取（详细信息在verbose模式下显示）

                return stats;
            } else {
                console.log("未找到直播间用户信息");
                return null;
            }
        } else {
            console.log(`直播间接口请求失败: ${response.status}`);
            const responseText = await response.text();
            console.log(`响应内容: ${responseText}`);
            return null;
        }

    } catch (error) {
        console.log(`直播间接口出错: ${error.message}`);
        return null;
    }
}

/**
 * 统一的用户信息获取接口
 * 主用douyinGetUserStats，失败时自动切换到douyinGetUserStatsWebcast
 * @param {Object} options - 配置选项
 * @param {boolean} options.enableFallback - 是否启用备用方法，默认true
 * @param {boolean} options.verbose - 是否显示详细日志，默认false
 * @returns {Promise<Object|null>} 用户统计信息
 */
export async function getdouyinUserStats(options = {}) {
    const { enableFallback = true, verbose = false } = options;

    try {
        console.log("正在读取Network_cookies文件...");

        // 使用pathManager获取正确的cookie文件路径
        const cookieFilePath = pathManager.getPath(PathType.DOUYIN_COOKIES);
        console.log(`Cookie文件路径: ${cookieFilePath}`);

        // 检查cookie文件是否存在
        try {
            await fs.access(cookieFilePath);
        } catch (accessError) {
            console.error("Cookie文件不存在:", cookieFilePath);
            // throw new Error("Cookie文件不存在，请先登录抖音平台");
        }

        // 读取cookie文件内容
        let cookieData;
        try {
            cookieData = await fs.readFile(cookieFilePath, 'utf-8');
        } catch (readError) {
            console.error("读取Cookie文件失败:", readError.message);
            throw new Error("无法读取Cookie文件，请检查文件权限");
        }

        // 检查cookie内容是否为空
        const trimmedCookieData = cookieData.trim();
        if (!trimmedCookieData) {
            console.error("Cookie文件内容为空");
            throw new Error("Cookie文件内容为空，请重新登录抖音平台");
        }

        // 检查cookie内容长度是否合理
        if (trimmedCookieData.length < 50) {
            console.error(`Cookie内容过短: ${trimmedCookieData.length} 字符`);
            throw new Error("Cookie内容异常，请重新登录抖音平台");
        }

        console.log(`Network_cookies长度: ${trimmedCookieData.length}`);
        console.log("正在获取用户统计信息...");

        if (verbose) {
            console.log("=== 开始获取用户统计信息 ===");
        }

        // 尝试主要方法
        if (verbose) {
            console.log("尝试方法1: 用户个人资料接口...");
        }

        const result = await douyinGetUserStats(trimmedCookieData);

        if (result) {
            if (verbose) {
                console.log("✅ 方法1成功获取数据");
            }
            return {
                ...result,
                source: 'profile_api',  // 标记数据来源
                timestamp: new Date().toISOString()
            };
        }

        // 如果主要方法失败且启用了备用方法
        if (enableFallback) {
            if (verbose) {
                console.log("方法1失败，尝试方法2: 直播间接口...");
            }

            const webcastResult = await douyinGetUserStatsWebcast(trimmedCookieData);

            if (webcastResult) {
                if (verbose) {
                    console.log("✅ 方法2成功获取数据");
                }
                return {
                    ...webcastResult,
                    source: 'webcast_api',  // 标记数据来源
                    timestamp: new Date().toISOString()
                };
            }
        }

        if (verbose) {
            console.log("❌ 所有方法都失败了");
        }

        throw new Error("无法获取用户统计信息，请检查网络连接或重新登录");

    } catch (error) {
        console.error(`获取用户统计信息时出错: ${error.message}`);

        // 根据错误类型提供更具体的错误信息
        if (error.message.includes("Cookie文件不存在") ||
            error.message.includes("Cookie文件内容为空") ||
            error.message.includes("Cookie内容异常")) {
            // 这些是需要用户重新登录的错误
            throw error;
        } else if (error.code === 'ENOENT') {
            throw new Error('Cookie文件不存在，请先登录获取Cookie');
        } else if (error.code === 'EACCES') {
            throw new Error('无法访问Cookie文件，请检查文件权限');
        } else if (error.message.includes("无法获取用户统计信息")) {
            // 这是我们自己抛出的错误，直接传递
            throw error;
        } else {
            // 其他未知错误
            throw new Error("获取用户信息失败，请检查网络连接或稍后重试");
        }
    }
}
