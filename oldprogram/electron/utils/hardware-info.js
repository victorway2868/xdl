import si from 'systeminformation';
import { execSync } from 'child_process';

// PowerShell 获取主显示器分辨率（作为兜底方案）
function getResolutionFromPowerShell() {
  try {
    const output = execSync(
      'powershell -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds}"',
      { encoding: 'utf8' }
    );
    const match = output.match(/Width\s*=\s*(\d+),\s*Height\s*=\s*(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10),
        source: 'PowerShell',
      };
    }
  } catch (err) {
    // 无需抛出，容错即可
  }
  return null;
}

export async function getSystemInfo() {
  try {
    const cpu = await si.cpu();
    const mem = await si.mem();
    const graphics = await si.graphics();

    // CPU
    const cpuInfo = `${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores)`;

    // 内存
    const totalGB = (mem.total / 1024 / 1024 / 1024).toFixed(2);
    const memInfo = `${totalGB} GB`;

    // 显卡
    const validGPUs = graphics.controllers.filter(gpu =>
      !/idd|remote|basic|microsoft/i.test(gpu.model)
    );
    const gpu = validGPUs[0] || graphics.controllers[0];
    let gpuInfo = '未检测到有效 GPU';
    let encoder = 'obs_x264';

    if (gpu) {
      const model = gpu.model.toLowerCase();
      gpuInfo = `${gpu.vendor} ${gpu.model}`;
      if (model.includes('nvidia')) {
        encoder = 'jim_nvenc';
      } else if (model.includes('amd') || model.includes('radeon')) {
        encoder = 'amd_amf_h264';
      } else if (model.includes('intel')) {
        encoder = 'obs_qsv11_v2';
      }
    }

    // 主显示器分辨率
    const displays = graphics.displays || [];
    const mainDisplay = displays.find(d =>
      d.main || d.primary || d.builtin
    ) || displays[0];

    let resolution = '';
    if (
      mainDisplay &&
      mainDisplay.resolutionx > 0 &&
      mainDisplay.resolutiony > 0
    ) {
      resolution = `${mainDisplay.resolutionx} x ${mainDisplay.resolutiony}`;
    } else {
      const fallbackRes = getResolutionFromPowerShell();
      if (fallbackRes) {
        resolution = `${fallbackRes.width} x ${fallbackRes.height}`;
      } else {
        resolution = '1920 x 1080'
      }
    }

    // 返回所有信息
    return {
      cpu: cpuInfo,
      memory: memInfo,
      gpu: gpuInfo,
      encoder,
      resolution
    };

  } catch (err) {
    throw new Error('获取系统信息失败: ' + err.message);
  }
}

// Default export for easy importing
export default {
  getSystemInfo
};
