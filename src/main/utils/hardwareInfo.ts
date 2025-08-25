import si from 'systeminformation';

export interface SystemInfo {
  cpu: string;
  memory: string;
  gpu: string;
  encoder: 'obs_x264' | 'jim_nvenc' | 'amd_amf_h264' | 'obs_qsv11_v2';
  resolution: string;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    const [cpu, mem, graphics] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.graphics(),
    ]);

    // CPU
    const cpuInfo = `${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores)`;

    // Memory
    const totalGB = (mem.total / 1024 / 1024 / 1024).toFixed(2);
    const memInfo = `${totalGB} GB`;

    // GPU and Encoder
    const validGPUs = graphics.controllers.filter(gpu =>
      !/idd|remote|basic|microsoft/i.test(gpu.model)
    );
    const gpu = validGPUs[0] || graphics.controllers[0];
    let gpuInfo = '未检测到有效 GPU';
    let encoder: SystemInfo['encoder'] = 'obs_x264';

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

    // Resolution
    const mainDisplay = graphics.displays.find(d => d.main) || graphics.displays[0];
    let resolution = '1920x1080'; // Default fallback
    if (mainDisplay && mainDisplay.resolutionX > 0 && mainDisplay.resolutionY > 0) {
      resolution = `${mainDisplay.resolutionX}x${mainDisplay.resolutionY}`;
    }

    return {
      cpu: cpuInfo,
      memory: memInfo,
      gpu: gpuInfo,
      encoder,
      resolution,
    };
  } catch (err: any) {
    // In case of error, return a default structure
    return {
      cpu: '获取失败',
      memory: '获取失败',
      gpu: '获取失败',
      encoder: 'obs_x264',
      resolution: '1920x1080',
    };
  }
}

