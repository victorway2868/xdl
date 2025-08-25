import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function checkMediaSDKServerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq MediaSDK_Server.exe" /NH');
    return stdout.includes('MediaSDK_Server.exe');
  } catch (error) {
    return false;
  }
}

export async function killMediaSDKServer(): Promise<{ success: boolean; message: string }>
{
  try {
    const isRunning = await checkMediaSDKServerRunning();
    if (!isRunning) {
      return { success: true, message: 'MediaSDK_Server.exe 未在运行' };
    }
    await execAsync('taskkill /F /IM MediaSDK_Server.exe');
    return { success: true, message: '已结束 MediaSDK_Server.exe 进程' };
  } catch (error: any) {
    return { success: false, message: `结束 MediaSDK_Server.exe 失败: ${error?.message || error}` };
  }
}

