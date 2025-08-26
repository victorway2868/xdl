/**
 * OBS配置备份和恢复模块
 * 优化版本，整合了备份和恢复功能，提高代码复用性和效率
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as archiver from 'archiver';
import * as extract from 'extract-zip';
import { ensureAndConnectToOBS, getObsInstance, startOBSProcess } from '@main/modules/obsWebSocket';
import { closeOBS } from '@main/utils/close-obs-direct';

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
            const archive = (archiver as any)('zip', { zlib: { level: 9 } });

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
    await (extract as any)(zipPath, { dir: outputDir });
}

/**
 * 查找桌面上的备份文件
 */
async function findBackupFiles(): Promise<string[]> {
    const desktopPath = path.join(os.homedir(), 'Desktop');

    try {
        const files = await fs.readdir(desktopPath);
        const backupFiles = files
            .filter(file => file.startsWith('obsbackup_') && file.endsWith('.zip'))
            .map(file => path.join(desktopPath, file));

        // 按修改时间排序（最新的在前）
        const filesWithStats = await Promise.all(
            backupFiles.map(async (file) => {
                const stats = await fs.stat(file);
                return { file, mtime: stats.mtime };
            })
        );

        return filesWithStats
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
            .map(item => item.file);
    } catch (error) {
        console.error('查找备份文件失败:', error);
        return [];
    }
}

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
 * 备份OBS配置
 */
export async function backupObsConfiguration(): Promise<{
    success: boolean;
    message: string;
    backupPath?: string;
}> {
    try {
        // 连接到OBS
        await ensureAndConnectToOBS();
        const obs = getObsInstance();
        if (!obs) {
            throw new Error('OBS WebSocket 未连接');
        }

        // 获取当前配置信息
        const { currentProfileName } = await obs.call('GetProfileList');
        const { currentSceneCollectionName } = await obs.call('GetSceneCollectionList');

        console.log(`当前配置文件: ${currentProfileName}`);
        console.log(`当前场景集合: ${currentSceneCollectionName}`);

        const paths = getObsStudioPaths();

        // 创建备份文件夹
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
        const backupFolderName = `obsbackup_${timestamp}`;
        const tempBackupPath = path.join(os.tmpdir(), backupFolderName);
        const finalBackupPath = path.join(os.homedir(), 'Desktop', `${backupFolderName}.zip`);

        await fs.ensureDir(path.join(tempBackupPath, 'basic', 'profiles'));
        await fs.ensureDir(path.join(tempBackupPath, 'basic', 'scenes'));

        // 复制配置文件
        const profilePath = path.join(paths.profilesPath, currentProfileName);
        const sceneFilePath = path.join(paths.scenesPath, `${currentSceneCollectionName}.json`);

        if (!(await fs.pathExists(profilePath))) {
            throw new Error(`配置文件不存在: ${currentProfileName}`);
        }
        if (!(await fs.pathExists(sceneFilePath))) {
            throw new Error(`场景集合不存在: ${currentSceneCollectionName}`);
        }

        // 复制配置文件和场景文件
        await fs.copy(profilePath, path.join(tempBackupPath, 'basic', 'profiles', currentProfileName));
        await fs.copy(sceneFilePath, path.join(tempBackupPath, 'basic', 'scenes', `${currentSceneCollectionName}.json`));

        // 复制媒体文件
        const sceneData = await fs.readJson(sceneFilePath);
        const mediaFiles = findMediaFilePaths(sceneData);

        for (const mediaFile of mediaFiles) {
            try {
                const fileName = path.basename(mediaFile);
                await fs.copy(mediaFile, path.join(tempBackupPath, fileName));
                console.log(`已复制媒体文件: ${fileName}`);
            } catch (error) {
                console.warn(`复制媒体文件失败 ${mediaFile}:`, error);
            }
        }

        // 创建ZIP文件
        await createZipArchive(tempBackupPath, finalBackupPath);

        // 清理临时文件夹
        await fs.remove(tempBackupPath);

        console.log(`备份完成: ${finalBackupPath}`);

        return {
            success: true,
            message: `备份成功创建: ${path.basename(finalBackupPath)}`,
            backupPath: finalBackupPath
        };

    } catch (error: any) {
        console.error('备份失败:', error);
        return {
            success: false,
            message: `备份失败: ${error.message || String(error)}`
        };
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
        // Step 1: 查找备份文件
        steps.push({ name: 'Finding backup file', success: true, message: '正在查找备份文件...' });

        let zipPath = backupFilePath;
        if (!zipPath) {
            const backupFiles = await findBackupFiles();
            if (backupFiles.length === 0) {
                throw new Error('未找到备份文件');
            }
            zipPath = backupFiles[0]; // 使用最新的备份
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

/**
 * 获取可用的备份文件列表
 */
export async function getAvailableBackups(): Promise<{
    success: boolean;
    backups: Array<{
        path: string;
        name: string;
        size: number;
        createdAt: Date;
    }>;
}> {
    try {
        const backupFiles = await findBackupFiles();

        const backups = await Promise.all(
            backupFiles.map(async (filePath) => {
                const stats = await fs.stat(filePath);
                return {
                    path: filePath,
                    name: path.basename(filePath),
                    size: stats.size,
                    createdAt: stats.mtime
                };
            })
        );

        return {
            success: true,
            backups
        };
    } catch (error: any) {
        console.error('获取备份列表失败:', error);
        return {
            success: false,
            backups: []
        };
    }
}