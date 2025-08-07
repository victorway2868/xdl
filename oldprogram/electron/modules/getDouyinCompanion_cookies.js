// 简单高效的Node.js脚本，用于提取抖音Cookie (ES模块版本)
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import pathManager, { PathType } from '../utils/pathManager.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试加载sqlite3模块，如果不存在则提供说明
let sqlite3;
try {
    // 使用动态导入
    const sqlite3Module = await import('sqlite3');
    sqlite3 = sqlite3Module.default.verbose();
} catch (error) {
    console.error('错误: 缺少sqlite3模块。请运行 "npm install sqlite3" 安装。');
    process.exit(1);
}

// 支持多种可能的浏览器路径
const userProfile = process.env.USERPROFILE || process.env.HOME;
const possibleBrowserPaths = [
    // webcast_mate路径
    {
        cookies: path.join(userProfile, "AppData", "Roaming", "webcast_mate", "Network", "Cookies"),
        localState: path.join(userProfile, "AppData", "Roaming", "webcast_mate", "Local State")
    }
    // 如需启用其他浏览器路径，请取消下面的注释
    // // Chrome路径
    // {
    //     cookies: path.join(userProfile, "AppData", "Local", "Google", "Chrome", "User Data", "Default", "Network", "Cookies"),
    //     localState: path.join(userProfile, "AppData", "Local", "Google", "Chrome", "User Data", "Local State")
    // },
    // // Edge路径
    // {
    //     cookies: path.join(userProfile, "AppData", "Local", "Microsoft", "Edge", "User Data", "Default", "Network", "Cookies"),
    //     localState: path.join(userProfile, "AppData", "Local", "Microsoft", "Edge", "User Data", "Local State")
    // }
];

// 输出路径
const outputPath = pathManager.getPath(PathType.DOUYIN_COOKIES);

// 创建临时文件路径
const tempDir = pathManager.getPath(PathType.TEMP);
const tempCookiesPath = path.join(tempDir, "temp_cookies.db");
const tempPsScript = path.join(tempDir, "decrypt_key.ps1");
const tempKeyPath = path.join(tempDir, "master_key.bin");

// 确保临时目录存在
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// 清理函数
function cleanup() {
    console.log("清理临时文件...");
    try {
        // 删除所有临时文件
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(tempDir, file));
                } catch (e) {
                    console.error(`无法删除临时文件 ${file}: ${e.message}`);
                }
            }

            // 尝试删除临时目录
            try {
                fs.rmdirSync(tempDir);
            } catch (e) {
                console.error(`无法删除临时目录: ${e.message}`);
            }
        }
    } catch (error) {
        console.error(`清理时出错: ${error.message}`);
    }
}

// 处理脚本终止
process.on('SIGINT', () => {
    console.log("脚本被中断");
    cleanup();
    process.exit(0);
});

// 检查直播伴侣是否正在运行
async function checkIfCompanionRunning() {
    try {
        const { execSync } = await import('child_process');
        const result = execSync('tasklist /FI "IMAGENAME eq webcast_mate.exe" /FO CSV', { encoding: 'utf8' });
        return result.includes('webcast_mate.exe');
    } catch (error) {
        console.log('无法检查直播伴侣运行状态:', error.message);
        return false;
    }
}

// 主函数 - 提取抖音Cookie并返回结构化数据
async function extractCookies() {
    console.log("开始提取抖音Cookie...");

    // 检查直播伴侣是否正在运行
    const isCompanionRunning = await checkIfCompanionRunning();
    if (isCompanionRunning) {
        console.warn('警告: 检测到直播伴侣正在运行，这可能导致Cookie数据库文件被锁定');
        console.warn('建议: 关闭直播伴侣后重试以获得更好的成功率');

        // 如果直播伴侣正在运行，尝试等待一段时间再继续
        console.log('等待3秒后继续尝试...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 查找有效的浏览器路径
    let cookiesPath = null;
    let localStatePath = null;
    let foundValidBrowser = false;

    for (const browser of possibleBrowserPaths) {
        if (fs.existsSync(browser.cookies) && fs.existsSync(browser.localState)) {
            cookiesPath = browser.cookies;
            localStatePath = browser.localState;
            foundValidBrowser = true;
            console.log(`找到有效的浏览器数据: ${cookiesPath}`);
            break;
        }
    }

    if (!foundValidBrowser) {
        console.error("错误: 未找到支持的浏览器数据。请检查浏览器安装和路径。");
        return { success: false, error: "未找到支持的浏览器数据" };
    }

    try {
        // 1. 复制Cookie数据库 - 添加重试机制
        console.log(`复制Cookie数据库: ${cookiesPath}`);

        // 检查源文件是否存在
        if (!fs.existsSync(cookiesPath)) {
            console.error(`Cookie数据库文件不存在: ${cookiesPath}`);
            return { success: false, error: `Cookie数据库文件不存在: ${cookiesPath}` };
        }

        // 强制复制文件
        try {
            console.log('开始强制复制Cookie数据库文件...');

            // 如果临时文件已存在，先删除
            if (fs.existsSync(tempCookiesPath)) {
                fs.unlinkSync(tempCookiesPath);
            }

            // 使用 PowerShell 强制复制文件，即使文件被锁定也能复制
            const copyCommand = `Copy-Item -Path "${cookiesPath}" -Destination "${tempCookiesPath}" -Force`;
            console.log('执行强制复制命令...');

            execSync(`powershell -Command "${copyCommand}"`, { stdio: 'ignore' });

            // 验证文件是否复制成功
            if (fs.existsSync(tempCookiesPath)) {
                const stats = fs.statSync(tempCookiesPath);
                console.log(`强制复制成功，文件大小: ${stats.size} 字节`);
            } else {
                throw new Error('强制复制后文件不存在');
            }
        } catch (copyError) {
            console.error(`强制复制失败: ${copyError.message}`);

            // 如果 PowerShell 复制失败，尝试使用 robocopy
            try {
                console.log('尝试使用 robocopy 强制复制...');
                const robocopyCommand = `robocopy "${path.dirname(cookiesPath)}" "${path.dirname(tempCookiesPath)}" "${path.basename(cookiesPath)}" /R:0 /W:0`;
                execSync(robocopyCommand, { stdio: 'ignore' });

                // robocopy 会重命名文件，需要重命名回来
                const robocopyTarget = path.join(path.dirname(tempCookiesPath), path.basename(cookiesPath));
                if (fs.existsSync(robocopyTarget)) {
                    fs.renameSync(robocopyTarget, tempCookiesPath);
                    console.log('robocopy 强制复制成功');
                } else {
                    throw new Error('robocopy 复制后文件不存在');
                }
            } catch (robocopyError) {
                console.error(`robocopy 复制失败: ${robocopyError.message}`);
                return {
                    success: false,
                    error: '无法强制复制Cookie数据库文件，请确保直播伴侣已安装并运行过'
                };
            }
        }

        // 2. 从Local State获取加密密钥并使用PowerShell解密
        console.log(`读取Local State文件: ${localStatePath}`);
        const localStateContent = fs.readFileSync(localStatePath, 'utf8');
        let localState;

        try {
            localState = JSON.parse(localStateContent);
        } catch (error) {
            console.error(`解析Local State文件失败: ${error.message}`);
            return { success: false, error: `解析Local State文件失败: ${error.message}` };
        }

        if (!localState.os_crypt || !localState.os_crypt.encrypted_key) {
            console.error("Local State文件中未找到加密密钥");
            return { success: false, error: "Local State文件中未找到加密密钥" };
        }

        const encryptedKey = localState.os_crypt.encrypted_key;

        // 创建PowerShell脚本来解密密钥
        const psScript = `
        # 从Base64解码加密密钥
        $encryptedKey = [Convert]::FromBase64String("${encryptedKey}")

        # 移除'DPAPI'前缀（前5个字节）
        $encryptedKeyWithoutPrefix = $encryptedKey[5..($encryptedKey.Length-1)]

        # 使用DPAPI解密密钥
        Add-Type -AssemblyName System.Security
        $entropy = $null
        $decryptedKey = [System.Security.Cryptography.ProtectedData]::Unprotect($encryptedKeyWithoutPrefix, $entropy, 'CurrentUser')

        # 将解密后的密钥保存到文件
        [System.IO.File]::WriteAllBytes("${tempKeyPath.replace(/\\/g, '\\\\')}", $decryptedKey)
        `;

        fs.writeFileSync(tempPsScript, psScript);

        // 执行PowerShell脚本
        console.log("解密主密钥...");
        execSync(`powershell -ExecutionPolicy Bypass -File "${tempPsScript}"`, { stdio: 'ignore' });

        if (!fs.existsSync(tempKeyPath)) {
            console.error("错误: 无法解密主密钥");
            return { success: false, error: "无法解密主密钥" };
        }

        // 3. 读取解密后的密钥
        const masterKey = fs.readFileSync(tempKeyPath);

        // 4. 从SQLite数据库中提取Cookie
        return new Promise((resolve) => {
            try {
                // 检查临时数据库文件是否存在且可读
                if (!fs.existsSync(tempCookiesPath)) {
                    console.error(`临时数据库文件不存在: ${tempCookiesPath}`);
                    resolve({ success: false, error: `临时数据库文件不存在: ${tempCookiesPath}` });
                    return;
                }

                // 检查文件大小
                const stats = fs.statSync(tempCookiesPath);
                if (stats.size === 0) {
                    console.error('临时数据库文件为空');
                    resolve({ success: false, error: '临时数据库文件为空' });
                    return;
                }

                console.log(`临时数据库文件大小: ${stats.size} 字节`);

                // 直接打开数据库，强制复制后应该没有锁定问题
                console.log('打开强制复制的数据库文件...');
                const db = new sqlite3.Database(tempCookiesPath, sqlite3.OPEN_READONLY, (err) => {
                    if (err) {
                        console.error(`打开数据库出错: ${err.message}`);
                        console.error('可能的原因:');
                        console.error('1. 数据库文件损坏');
                        console.error('2. 权限不足');
                        console.error('3. 文件格式不正确');
                        resolve({ success: false, error: `打开数据库出错: ${err.message}` });
                        return;
                    }

                    console.log('成功打开临时数据库文件');

                    // 查询.douyin.com的Cookie
                    const query = `SELECT name, encrypted_value, host_key, path FROM cookies WHERE host_key LIKE '%.douyin.com'`;

                    db.all(query, [], async (err, rows) => {
                        if (err) {
                            console.error(`查询数据库出错: ${err.message}`);
                            db.close();
                            resolve({ success: false, error: `查询数据库出错: ${err.message}` });
                            return;
                        }

                        if (!rows || rows.length === 0) {
                            console.log("未找到抖音Cookie");
                            db.close();
                            resolve({ success: false, error: "未找到抖音Cookie" });
                            return;
                        }

                        console.log(`找到 ${rows.length} 个抖音Cookie`);

                        // 处理Cookie
                        const cookieObjects = [];

                        for (const row of rows) {
                            try {
                                // 解密Cookie值
                                const encryptedValue = row.encrypted_value;
                                let cookieValue = null;

                                // 检查加密格式
                                if (encryptedValue[0] === 118 && encryptedValue[1] === 49 && encryptedValue[2] === 48) {
                                    // v10格式 (Chromium v80+使用AES-GCM)
                                    console.log(`解密v10格式的Cookie: ${row.name}`);
                                    try {
                                        const nonce = encryptedValue.slice(3, 3 + 12);
                                        const ciphertext = encryptedValue.slice(3 + 12, encryptedValue.length - 16);
                                        const tag = encryptedValue.slice(encryptedValue.length - 16);

                                        // 使用Node.js的crypto模块解密
                                        const crypto = await import('crypto');
                                        const decipher = crypto.default.createDecipheriv('aes-256-gcm', masterKey, nonce);
                                        decipher.setAuthTag(tag);
                                        let decrypted = decipher.update(ciphertext);
                                        decrypted = Buffer.concat([decrypted, decipher.final()]);
                                        cookieValue = decrypted.toString('utf8');
                                    } catch (decryptError) {
                                        console.error(`AES-GCM解密失败: ${decryptError.message}`);
                                        // 尝试其他解密方法...
                                    }
                                } else if (encryptedValue.length > 0) {
                                    // 尝试DPAPI解密 (旧版Chromium)
                                    console.log(`尝试使用DPAPI解密Cookie: ${row.name}`);
                                    try {
                                        // 创建临时文件存储加密值
                                        const tempEncryptedPath = path.join(tempDir, `temp_encrypted_${row.name}.bin`);
                                        const tempDecryptedPath = path.join(tempDir, `temp_decrypted_${row.name}.bin`);

                                        fs.writeFileSync(tempEncryptedPath, encryptedValue);

                                        // 创建PowerShell脚本解密
                                        const dpApiScript = `
                                        Add-Type -AssemblyName System.Security
                                        $encryptedBytes = [System.IO.File]::ReadAllBytes("${tempEncryptedPath.replace(/\\/g, '\\\\')}")
                                        $entropy = $null
                                        try {
                                            $decryptedBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($encryptedBytes, $entropy, 'CurrentUser')
                                            [System.IO.File]::WriteAllBytes("${tempDecryptedPath.replace(/\\/g, '\\\\')}", $decryptedBytes)
                                            Write-Host "DPAPI解密成功"
                                        } catch {
                                            Write-Host "DPAPI解密失败: $_"
                                            exit 1
                                        }
                                        `;

                                        const tempDpApiScript = path.join(tempDir, `decrypt_cookie_${row.name}.ps1`);
                                        fs.writeFileSync(tempDpApiScript, dpApiScript);

                                        try {
                                            execSync(`powershell -ExecutionPolicy Bypass -File "${tempDpApiScript}"`, { stdio: 'ignore' });

                                            if (fs.existsSync(tempDecryptedPath)) {
                                                const decryptedData = fs.readFileSync(tempDecryptedPath);
                                                cookieValue = decryptedData.toString('utf8');

                                                // 清理临时文件
                                                fs.unlinkSync(tempEncryptedPath);
                                                fs.unlinkSync(tempDecryptedPath);
                                                fs.unlinkSync(tempDpApiScript);
                                            }
                                        } catch (psError) {
                                            console.log(`DPAPI解密失败: ${psError.message}`);
                                        }
                                    } catch (dpApiError) {
                                        console.log(`DPAPI处理失败: ${dpApiError.message}`);
                                    }
                                }

                                if (cookieValue) {
                                    // 清理cookie值，只保留可打印字符
                                    cookieValue = cookieValue.replace(/[^\x20-\x7E]/g, '');
                                    cookieObjects.push({
                                        name: row.name,
                                        value: cookieValue,
                                        domain: row.host_key,
                                        path: row.path || '/'
                                    });
                                    console.log(`成功解密Cookie: ${row.name}`);
                                } else {
                                    console.log(`无法解密Cookie: ${row.name}`);
                                }
                            } catch (error) {
                                console.log(`处理Cookie ${row.name} 出错: ${error.message}`);
                            }
                        }

                        db.close();

                        if (cookieObjects.length > 0) {
                            console.log(`成功解密 ${cookieObjects.length} 个Cookie`);
                            resolve({
                                success: true,
                                cookies: cookieObjects,
                                cookieString: cookieObjects.map(c => `${c.name}=${c.value}`).join('; ')
                            });
                        } else {
                            console.log("解密后没有有效的Cookie");
                            resolve({ success: false, error: "解密后没有有效的Cookie" });
                        }
                    });
                });
            } catch (error) {
                console.error(`提取Cookie时出错: ${error.message}`);
                cleanup();
                resolve({ success: false, error: `提取Cookie时出错: ${error.message}` });
            }
        });

    } catch (error) {
        console.error(`提取Cookie时出错: ${error.message}`);
        cleanup();
        return { success: false, error: `提取Cookie时出错: ${error.message}` };
    }
}

// // 如果直接运行此脚本，则执行提取并保存到文件
// if (import.meta.url === `file://${process.argv[1]}`) {
//     try {
//         console.log("========================================");
//         console.log("  抖音Cookie提取工具 - ES模块版本");
//         console.log("========================================");
//         console.log("遵循原则: 必须获取真实数据，获取不到就空");
//         console.log("----------------------------------------");

//         // 使用导出的函数
//         const result = await extractCookies();

//         if (result.success) {
//             // 保存到文件
//             fs.writeFileSync(outputPath, result.cookieString, 'utf8');
//             console.log(`已保存 ${result.cookies.length} 个Cookie到 ${outputPath}`);
//         } else {
//             console.log("\n未能提取有效的Cookie。创建空文件...");
//             fs.writeFileSync(outputPath, "", 'utf8');
//             console.log(`已创建空Cookie文件: ${outputPath}`);
//         }

//         console.log("\n脚本执行完成。");
//         console.log("----------------------------------------");

//         // 显示结果
//         if (fs.existsSync(outputPath)) {
//             const content = fs.readFileSync(outputPath, 'utf8');
//             if (content && content.trim().length > 0) {
//                 console.log(`Cookie文件已保存: ${outputPath}`);
//                 console.log(`文件大小: ${content.length} 字节`);
//                 console.log(`Cookie数量: ${content.split(';').length}`);
//             } else {
//                 console.log(`创建了空Cookie文件: ${outputPath}`);
//             }
//         }

//         console.log("========================================");
//     } catch (error) {
//         console.error(`\n执行过程中发生错误: ${error.message}`);
//         console.error(`错误堆栈: ${error.stack}`);

//         // 确保创建空文件
//         try {
//             fs.writeFileSync(outputPath, "", 'utf8');
//             console.log(`已创建空Cookie文件: ${outputPath}`);
//         } catch (e) {
//             console.error(`创建空文件失败: ${e.message}`);
//         }

//         // 确保清理临时文件
//         cleanup();
//     }
// }

// 导出函数供其他模块使用
// 修改导出的函数，使其保存cookies到同一文件（全新保存）
export async function getDouyinCookies() {
    try {
        const result = await extractCookies();

        // 无论是否直接运行脚本，都保存cookies到文件
        if (result.success && result.cookieString) {
            // 直接覆盖保存cookie文件
            fs.writeFileSync(outputPath, result.cookieString, 'utf8');
            console.log(`已保存 ${result.cookies.length} 个直播伴侣Cookie到 ${outputPath}`);
        } else {
            console.log("\n未能提取有效的Cookie。创建空文件...");
            fs.writeFileSync(outputPath, "", 'utf8');
            console.log(`已创建空Cookie文件: ${outputPath}`);
        }

        return result;
    } catch (error) {
        console.error(`提取Cookie时出错: ${error.message}`);

        // 确保创建空文件
        try {
            fs.writeFileSync(outputPath, "", 'utf8');
            console.log(`已创建空Cookie文件: ${outputPath}`);
        } catch (e) {
            console.error(`创建空文件失败: ${e.message}`);
        }

        return { success: false, error: `提取Cookie时出错: ${error.message}` };
    } finally {
        cleanup();
    }
}
