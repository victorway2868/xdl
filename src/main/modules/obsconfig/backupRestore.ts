/**
 * OBS配置备份和恢复模块
 * 优化版本，整合了备份和恢复功能，提高代码复用性和效率
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';
import extract from 'extract-zip';
import { ensureAndConnectToOBS, getObsInstance, startOBSProcess } from '@main/modules/obsWebSocket';
import { closeOBS } from '@main/utils/close-obs-direct';
import { getStatus, getIdTokenForMain } from '@main/services/authing';


// OBS Studio路径配置
const getObsStudioPaths = () => {
    const appDataPath = process.env.APPDATA || (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));

    const obsStudioPath = path.join(appDataPath, 'obs-studio');

    return {
        obsStudioPath,
        profilesPath: path.join(obsStudioPath, 'basic', 'profiles'),
        scenesPath: path.join(obsStudioPath, 'basic', 'scenes'),
        globalIniPath: path.join(obsStudioPath, 'global.ini'),
        userIniPath: path.join(obsStudioPath, 'user.ini'),
    };
};

/**
 * 创建ZIP压缩包
 */
async function createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`ZIP文件创建完成: ${outputPath}`);
                resolve();
            });

            output.on('error', (err: any) => {
                console.error('输出流错误:', err);
                reject(err);
            });

            archive.on('warning', (err: any) => {
                if (err.code === 'ENOENT') {
                    console.warn('Archive warning:', err);
                } else {
                    reject(err);
                }
            });

            archive.on('error', (err: any) => {
                console.error('Archive错误:', err);
                reject(err);
            });

            // 连接输出流
            archive.pipe(output);

            // 添加目录到压缩包
            archive.directory(sourceDir, false);

            // 完成压缩
            archive.finalize();
        } catch (error) {
            console.error('创建ZIP压缩包失败:', error);
            reject(error);
        }
    });
}

/**
 * 解压ZIP文件
 */
async function extractZipArchive(zipPath: string, outputDir: string): Promise<void> {
    await fs.ensureDir(outputDir);
    await extract(zipPath, { dir: outputDir });
}

// 本地备份扫描逻辑已废弃（改为R2云端备份与恢复）

/**
 * 递归查找场景数据中的媒体文件路径
 */
function findMediaFilePaths(data: any): string[] {
    const filePaths: string[] = [];

    function traverse(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            obj.forEach(item => traverse(item));
        } else {
            for (const [, value] of Object.entries(obj)) {
                if (typeof value === 'string' && fs.existsSync(value)) {
                    try {
                        const stats = fs.statSync(value);
                        if (stats.isFile()) {
                            filePaths.push(value);
                        }
                    } catch {
                        // 忽略无法访问的文件
                    }
                } else if (typeof value === 'object') {
                    traverse(value);
                }
            }
        }
    }

    traverse(data);
    return Array.from(new Set(filePaths)); // 去重
}

/**
 * 更新INI配置文件
 */
async function updateIniFile(iniPath: string, profileName: string, sceneCollectionName: string): Promise<void> {
    try {
        let config: any = {};

        // 如果文件存在，先读取现有配置
        if (await fs.pathExists(iniPath)) {
            const content = await fs.readFile(iniPath, 'utf8');
            // 简单的INI解析
            const lines = content.split('\n');
            let currentSection = '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    currentSection = trimmed.slice(1, -1);
                    if (!config[currentSection]) config[currentSection] = {};
                } else if (trimmed.includes('=') && currentSection) {
                    const [key, ...valueParts] = trimmed.split('=');
                    config[currentSection][key.trim()] = valueParts.join('=').trim();
                }
            }
        }

        // 确保Basic节存在
        if (!config.Basic) config.Basic = {};

        // 更新配置
        config.Basic.Profile = profileName;
        config.Basic.ProfileDir = profileName;
        config.Basic.SceneCollection = sceneCollectionName;
        config.Basic.SceneCollectionFile = sceneCollectionName;

        // 写回文件
        let content = '';
        for (const [section, values] of Object.entries(config)) {
            content += `[${section}]\n`;
            for (const [configKey, value] of Object.entries(values as any)) {
                content += `${configKey}=${value}\n`;
            }
            content += '\n';
        }

        await fs.ensureDir(path.dirname(iniPath));
        await fs.writeFile(iniPath, content, 'utf8');
    } catch (error) {
        console.error(`更新INI文件失败 ${iniPath}:`, error);
        throw error;
    }
}

/**
 * 向 Worker 获取预签名URL（兼容新旧返回结构）
 */
async function getPresignedUrlFromWorker(workerUrl: string, filename: string, payload: {
  accuserId: string;
  accwebsite?: string;
  accgivenName?: string;
  accmiddleName?: string;
  accfamilyName?: string;
  accjwt: string;
}): Promise<{ uploadUrl?: string; deleteUrl?: string | null; uploadKey?: string; deleteKey?: string | null; expiresIn?: number; presignedUrl?: string; objectKey?: string; publicUrl?: string; }>{
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, ...payload })
  } as any);
  if (!(res as any).ok) throw new Error(`Worker 请求失败: ${(res as any).status} ${(res as any).statusText}`);
  const data = await (res as any).json();
  if (!data?.success) throw new Error(`Worker 返回错误: ${data?.error || 'unknown'}`);
  const body = data.data || data;
  return body;
}

/**
 * 使用预签名URL上传文件
 */
async function uploadWithPresignedUrl(url: string, filePath: string): Promise<void> {
  const content = await fs.readFile(filePath);
  const res = await fetch(url, { method: 'PUT', body: content, headers: { 'Content-Type': 'application/octet-stream' } } as any);
  if (!(res as any).ok) {
    const txt = await (res as any).text().catch(() => '');
    throw new Error(`上传失败: ${(res as any).status} ${(res as any).statusText} ${txt || ''}`);
  }
}
/**
 * 使用预签名URL删除（DELETE）旧对象（失败不抛错，仅记录日志）
 */
async function deleteWithPresignedUrl(url: string): Promise<void> {
  try {
    const res = await fetch(url as any, { method: 'DELETE' } as any);
    if (!(res as any).ok && (res as any).status !== 204) {
      const txt = await (res as any).text().catch(() => '');
      console.warn(`deleteoldfile失败: ${(res as any).status} ${(res as any).statusText} ${txt || ''}`);
    }
  } catch (e) {
    console.warn('deleteoldfile异常:', e);
  }
}

/**
 * 按 oldworker.js 的方法更新 Authing 字段
 */
async function updateAuthingProfileClient(params: {
  accuserId: string;
  filename: string;
  accgivenName?: string;
  accfamilyName?: string;
  accmiddleName?: string;
  accwebsite?: string;
  accjwt: string;
}): Promise<boolean> {
  try {
    const { accuserId, filename, accgivenName, accfamilyName, accmiddleName, accwebsite, accjwt } = params;
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    const requestBody: any = {
      userId: accuserId,
      name: 'E-mail',
      givenName: accfamilyName || accgivenName,
      familyName: accmiddleName || '',
      middleName: filenameWithoutExt,
    };
    if (accwebsite && accwebsite.length >= 10) {
      requestBody.website = accwebsite;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      authorization: accjwt,
    };
    const userpoolId = process.env.AUTHING_USERPOOL_ID || '68b8b039eba2f6cdd3c6bd06';
    headers['x-authing-userpool-id'] = userpoolId;

    const resp = await fetch('https://api.authing.cn/api/v2/users/' + accuserId, {
      method: 'POST',
      headers: headers as any,
      body: JSON.stringify(requestBody),
    } as any);

    if (!(resp as any).ok) {
      console.warn('更新失败:', (resp as any).status, (resp as any).statusText);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('更新异常:', e);
    return false;
  }
}


/**
 * 备份OBS配置（改为上传到R2，不落桌面；校验20MB上限；上传成功后触发getStatus）
 */
export async function backupObsConfiguration(): Promise<{
    success: boolean;
    message: string;
    backupPath?: string;
}> {
    try {
        // 连接到OBS（不再校验会员，仅确保可读取配置）
        await ensureAndConnectToOBS();
        const obs = getObsInstance();
        if (!obs) throw new Error('OBS WebSocket 未连接');

        const { currentProfileName } = await obs.call('GetProfileList');
        const { currentSceneCollectionName } = await obs.call('GetSceneCollectionList');

        const paths = getObsStudioPaths();

        // 临时目录打包
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const timestamp = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`; // YYMMDDHHmm
        const backupTempName = `obsbackup_tmp_${Date.now()}`; // 仅用于临时目录名
        const uploadFilename = `${currentProfileName}_${timestamp}.zip`;
        const tempBackupPath = path.join(os.tmpdir(), backupTempName);
        const tempZipPath = path.join(os.tmpdir(), uploadFilename);

        await fs.ensureDir(path.join(tempBackupPath, 'basic', 'profiles'));
        await fs.ensureDir(path.join(tempBackupPath, 'basic', 'scenes'));

        const profilePath = path.join(paths.profilesPath, currentProfileName);
        const sceneFilePath = path.join(paths.scenesPath, `${currentSceneCollectionName}.json`);
        if (!(await fs.pathExists(profilePath))) throw new Error(`配置文件不存在: ${currentProfileName}`);
        if (!(await fs.pathExists(sceneFilePath))) throw new Error(`场景集合不存在: ${currentSceneCollectionName}`);

        await fs.copy(profilePath, path.join(tempBackupPath, 'basic', 'profiles', currentProfileName));
        await fs.copy(sceneFilePath, path.join(tempBackupPath, 'basic', 'scenes', `${currentSceneCollectionName}.json`));

        const sceneData = await fs.readJson(sceneFilePath);
        const mediaFiles = findMediaFilePaths(sceneData);
        for (const mediaFile of mediaFiles) {
          try {
            const fileName = path.basename(mediaFile);
            await fs.copy(mediaFile, path.join(tempBackupPath, fileName));
            console.log(`[备份] 已复制媒体文件: ${fileName}`);
          } catch {}
        }

        console.log(`[备份] 开始压缩临时目录: ${tempBackupPath}`);
        await createZipArchive(tempBackupPath, tempZipPath);
        console.log(`[备份] ZIP已生成: ${tempZipPath}`);
        await fs.remove(tempBackupPath);

        // 尺寸校验（20MB）
        const stat = await fs.stat(tempZipPath);
        console.log(`[备份] ZIP大小: ${(stat.size/1024/1024).toFixed(2)} MB`);
        const maxBytes = 20 * 1024 * 1024;
        if (stat.size > maxBytes) {
          await fs.remove(tempZipPath).catch(() => {});
          console.warn(`[备份] 备份文件超出限制 (${(stat.size/1024/1024).toFixed(2)} MB > 20 MB)`);
          return { success: false, message: `备份文件过大，已达到 ${(stat.size/1024/1024).toFixed(1)}MB（上限20MB）` };
        }

        // （仅主进程）使用 getStatus(false) 从本地内存/离线快照拿用户字段（sub、website、given_name、middle_name、family_name），用 getIdTokenForMain() 取 id_token
        const status = await getStatus(false); // 不强制网络刷新（只读本地缓存）
        const user = status?.user;
        const idToken = getIdTokenForMain();
        if (!user?.sub || !idToken) {
          await fs.remove(tempZipPath).catch(() => {});
          console.warn('[备份] 未登录或凭证失效，无法上传备份');
          return { success: false, message: '未登录或凭证失效，无法上传备份' };
        }

        // 调用 Worker 获取签名（nowworker.js 返回 uploadUrl/deleteUrl）并上传
        const workerUrl = 'http://cloud.agiopen.qzz.io/';
        console.log('[备份] 请求预签名URL:', uploadFilename);
        const urlData = await getPresignedUrlFromWorker(workerUrl, uploadFilename, {
          accuserId: user.sub,
          accwebsite: user.website,
          accgivenName: (user as any).given_name,
          accmiddleName: (user as any).middle_name,
          accfamilyName: (user as any).family_name,
          accjwt: idToken,
        });

        const putUrl = (urlData as any).uploadUrl || (urlData as any).presignedUrl;
        if (!putUrl) throw new Error('w网络错误，无法获取上传URL');

        await uploadWithPresignedUrl(putUrl, tempZipPath);
        console.log('upload done');

        // 使用 deleteUrl 删除旧文件（如果返回）
        if ((urlData as any).deleteUrl) {
          await deleteWithPresignedUrl((urlData as any).deleteUrl!);
          console.log('delete old file done');
        }

        // 参照 oldworker.js 的方法更新 Authing 字段（不阻塞主流程）
        try {
            const r2domain = (urlData as any).r2domain;
        
          await updateAuthingProfileClient({
            accuserId: user.sub,
            filename: uploadFilename,
            accgivenName: (user as any).given_name,
            accfamilyName: (user as any).family_name,
            accmiddleName: (user as any).middle_name,
            accwebsite: r2domain,
            accjwt: idToken,
          });
        } catch (e) {
          console.warn('更新出现异常:', e);
        }

        // 上传完成后清理本地临时文件，调用 getStatus(true) 才发广播给渲染层刷新 authing 状态
        await fs.remove(tempZipPath).catch(() => {});
        await getStatus(true);

        return { success: true, message: `云端备份成功` };

    } catch (error: any) {
        return { success: false, message: `备份失败: ${error?.message || String(error)}` };
    }
}

/**
 * 恢复OBS配置
 */
export async function restoreObsConfiguration(backupFilePath?: string): Promise<{
    success: boolean;
    message: string;
    profileName?: string;
    sceneCollectionName?: string;
    steps?: Array<{ name: string; success: boolean; message?: string }>;
}> {
    const steps: Array<{ name: string; success: boolean; message?: string }> = [];

    try {
        // Step 1: 校验备份文件路径
        steps.push({ name: 'Finding backup file', success: true, message: '正在校验备份文件路径...' });

        const zipPath = backupFilePath;
        if (!zipPath) {
            throw new Error('未提供备份文件路径');
        }
        if (!(await fs.pathExists(zipPath))) {
            throw new Error(`备份文件不存在: ${zipPath}`);
        }

        steps[steps.length - 1] = { name: 'Finding backup file', success: true, message: `找到备份文件: ${path.basename(zipPath)}` };
        console.log(`正在恢复备份: ${zipPath}`);

        // Step 2: 关闭OBS
        steps.push({ name: 'Closing OBS', success: true, message: '正在关闭OBS...' });

        const closeResult = await closeOBS();
        if (closeResult.status === 'failed') {
            const errMsg = (closeResult as any).error ? `关闭OBS失败: ${(closeResult as any).error}` : '关闭OBS失败';
            steps[steps.length - 1] = { name: 'Closing OBS', success: false, message: errMsg };
            throw new Error(errMsg);
        }

        steps[steps.length - 1] = { name: 'Closing OBS', success: true, message: 'OBS已关闭' };

        // 等待OBS完全关闭
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 3: 解压备份文件
        steps.push({ name: 'Extracting backup', success: true, message: '正在解压备份文件...' });

        const tempDir = path.join(os.tmpdir(), `obs-restore-${Date.now()}`);

        try {
            // 解压备份文件
            await extractZipArchive(zipPath, tempDir);
            steps[steps.length - 1] = { name: 'Extracting backup', success: true, message: '备份文件解压完成' };

            // Step 4: 验证备份结构
            steps.push({ name: 'Validating backup', success: true, message: '正在验证备份结构...' });

            const backupProfilesPath = path.join(tempDir, 'basic', 'profiles');
            const backupScenesPath = path.join(tempDir, 'basic', 'scenes');

            if (!(await fs.pathExists(backupProfilesPath)) || !(await fs.pathExists(backupScenesPath))) {
                throw new Error('备份文件结构无效');
            }

            // 获取配置名称
            const profileDirs = await fs.readdir(backupProfilesPath);
            let profileName: string | undefined;

            for (const item of profileDirs) {
                const stats = await fs.stat(path.join(backupProfilesPath, item));
                if (stats.isDirectory()) {
                    profileName = item;
                    break;
                }
            }

            if (!profileName) {
                throw new Error('备份中未找到有效的配置文件');
            }

            const sceneFiles = await fs.readdir(backupScenesPath);
            const sceneFile = sceneFiles.find(file => file.endsWith('.json'));

            if (!sceneFile) {
                throw new Error('备份中未找到有效的场景集合');
            }

            const sceneCollectionName = path.basename(sceneFile, '.json');

            steps[steps.length - 1] = { name: 'Validating backup', success: true, message: `验证完成: ${profileName} / ${sceneCollectionName}` };

            console.log(`恢复配置文件: ${profileName}`);
            console.log(`恢复场景集合: ${sceneCollectionName}`);

            // Step 5: 恢复配置文件
            steps.push({ name: 'Restoring configuration', success: true, message: '正在恢复配置文件...' });

            const paths = getObsStudioPaths();

            // 复制配置文件
            const sourceProfilePath = path.join(backupProfilesPath, profileName);
            const destProfilePath = path.join(paths.profilesPath, profileName);

            await fs.ensureDir(path.dirname(destProfilePath));
            if (await fs.pathExists(destProfilePath)) {
                await fs.remove(destProfilePath);
            }
            await fs.copy(sourceProfilePath, destProfilePath);

            // 复制场景文件
            const sourceScenePath = path.join(backupScenesPath, sceneFile);
            const destScenePath = path.join(paths.scenesPath, sceneFile);

            await fs.ensureDir(path.dirname(destScenePath));
            if (await fs.pathExists(destScenePath)) {
                await fs.remove(destScenePath);
            }
            await fs.copy(sourceScenePath, destScenePath);

            steps[steps.length - 1] = { name: 'Restoring configuration', success: true, message: '配置文件恢复完成' };

            // Step 6: 更新配置文件
            steps.push({ name: 'Updating configuration', success: true, message: '正在更新配置文件...' });

            await updateIniFile(paths.globalIniPath, profileName, sceneCollectionName);
            await updateIniFile(paths.userIniPath, profileName, sceneCollectionName);

            steps[steps.length - 1] = { name: 'Updating configuration', success: true, message: '配置文件更新完成' };

            // Step 7: 重启OBS
            steps.push({ name: 'Restarting OBS', success: true, message: '正在重启OBS...' });

            const startResult = await startOBSProcess();
            if (!startResult.success) {


                steps[steps.length - 1] = { name: 'Restarting OBS', success: false, message: `重启OBS失败: ${startResult.message}` };
                // 即使重启失败，恢复操作本身是成功的
                console.warn('OBS重启失败，但配置恢复成功');
            } else {
                steps[steps.length - 1] = { name: 'Restarting OBS', success: true, message: 'OBS已重启，恢复完成' };
            }

            console.log('恢复完成');

            return {
                success: true,
                message: `成功恢复配置: ${profileName} / ${sceneCollectionName}`,
                profileName,
                sceneCollectionName,
                steps
            };

        } finally {
            // 清理临时目录
            try {
                await fs.remove(tempDir);
            } catch (error) {
                console.warn('清理临时目录失败:', error);
            }
        }

    } catch (error: any) {
        console.error('恢复失败:', error);
        steps.push({ name: 'Error', success: false, message: error.message || String(error) });

        return {
            success: false,
            message: `恢复失败: ${error.message || String(error)}`,
            steps
        };
    }
}

// 本地备份列表功能已移除（改为云端恢复）

/**
 * 从 URL 下载 zip 到临时目录并调用现有恢复逻辑
 */
export async function restoreObsConfigurationFromUrl(downloadUrl: string): Promise<{
  success: boolean;
  message: string;
  profileName?: string;
  sceneCollectionName?: string;
  steps?: Array<{ name: string; success: boolean; message?: string }>;
}> {
  const tmpZip = path.join(os.tmpdir(), `obs-restore-${Date.now()}.zip`);
  try {
    const res = await fetch(downloadUrl as any);
    if (!(res as any).ok) throw new Error(`下载失败: ${(res as any).status} ${(res as any).statusText}`);
    const arrayBuf = await (res as any).arrayBuffer();
    await fs.writeFile(tmpZip, Buffer.from(arrayBuf));
    return await restoreObsConfiguration(tmpZip);
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  } finally {
    try { await fs.remove(tmpZip); } catch {}
  }
}
