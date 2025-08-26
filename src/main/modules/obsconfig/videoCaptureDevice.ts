/**
 * 视频采集设备配置模块
 * 用于管理OBS中的视频采集设备，包括设备选择、分辨率设置和滤镜应用
 */
import os from 'os';
import path from 'path';
import { app } from 'electron';
import { ensureAndConnectToOBS, getObsInstance } from '@main/modules/obsWebSocket';

/**
 * 根据当前操作系统获取对应的视频采集输入类型
 * @returns {string} 返回对应平台的视频输入类型标识符
 * - Windows: dshow_input (DirectShow)
 * - macOS: avfoundation_input (AVFoundation)
 * - Linux: v4l2_input (Video4Linux2)
 */
export function getVideoCaptureInputKind(): string {
  const platform = os.platform();
  if (platform === 'win32') return 'dshow_input';
  if (platform === 'darwin') return 'avfoundation_input';
  if (platform === 'linux') return 'v4l2_input';
  return 'dshow_input'; // 默认返回Windows的输入类型
}

/**
 * 从可用分辨率列表中按优先级选择最佳分辨率
 * @param {Array<{ itemName: string; itemValue: any }>} items 可用分辨率列表
 * @returns {string | null} 选中的分辨率字符串或null
 */
function pickResolutionFromList(items: Array<{ itemName: string; itemValue: any }>): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  // 按优先级排序的分辨率列表（从高到低）
  const priority = [
    '2560x1440', // 2K
    '1920x1080', // 1080p
    '1280x720',  // 720p
    '1280x960',  // 4:3 HD
    '960x540',   // qHD
    '640x360',   // nHD
    '1080x1920', // 竖屏1080p
    '720x1280',  // 竖屏720p
    '540x960',   // 竖屏qHD
  ];
  // 将所有项目转为字符串以便快速搜索
  const joined = JSON.stringify(items);
  // 按优先级顺序查找匹配的分辨率
  for (const r of priority) {
    if (joined.includes(r)) {
      const found = items.find((it) => it.itemName?.includes(r));
      if (found) return found.itemName;
    }
  }
  // 如果没有匹配的优先分辨率，返回列表中的第一项
  return items[0].itemName ?? null;
}

/**
 * 解析分辨率字符串为宽高对象
 * @param {string} [res] 分辨率字符串，如 "1920x1080"
 * @returns {{ width: number; height: number } | null} 解析后的宽高对象，解析失败则返回null
 */
function parseResolution(res?: string): { width: number; height: number } | null {
  if (!res) return null;
  // 移除所有空白字符并匹配数字x数字格式（支持多种分隔符：x、X、×）
  const m = res.replace(/\s+/g, '').match(/(\d+)[xX×](\d+)/);
  if (!m) return null;
  return { width: Number(m[1]), height: Number(m[2]) };
}
/**
 * 基于设备名称与ID识别视频采集设备类型（简化版）
 * @param {Object} device 设备信息对象
 * @param {string} device.itemName 设备名称
 * @param {string} device.itemValue 设备ID
 * @returns {Object} 设备类型信息对象
 */
function identifyCaptureCard(device: { itemName: string; itemValue: string }) {
  const name = String(device?.itemName || '');
  const id = String(device?.itemValue || '');
  const nameLc = name.toLowerCase();
  const idLc = id.toLowerCase();
  // 初始化设备信息对象
  const info: any = {
    name,
    id,
    type: 'Unknown',
    model: 'Unknown',
    interface: 'Unknown',
    isWebcam: false,
    isCapture: false,
  };

  // 识别网络摄像头(Webcam)
  if (nameLc.includes('webcam') || nameLc.includes('camera') || nameLc.includes('integrated') || name.includes('视频')) {
    info.type = 'Webcam';
    info.isWebcam = true;
    // 识别常见摄像头品牌
    if (nameLc.includes('logitech')) info.model = 'Logitech Webcam';
    else if (nameLc.includes('microsoft')) info.model = 'Microsoft Webcam';
    else if (nameLc.includes('razer')) info.model = 'Razer Webcam';
  }
  // 识别视频采集卡
  else if (
    nameLc.includes('capture') ||
    nameLc.includes('elgato') ||
    nameLc.includes('avermedia') ||
    nameLc.includes('blackmagic') ||
    nameLc.includes('magewell') ||
    nameLc.includes('hdmi')
  ) {
    info.type = 'Capture Card';
    info.isCapture = true;
  }

  // 如果类型仍未知，尝试从接口类型推断
  if (info.type === 'Unknown') {
    if (idLc.includes('usb')) {
      info.type = nameLc.includes('video') ? 'USB Video Device' : 'USB Device';
      info.interface = 'USB';
    }
    else if (idLc.includes('pci')) {
      info.type = 'PCIe Device';
      info.interface = 'PCIe';
    }
  }

  // 确保USB接口标记正确
  if (idLc.includes('usb')) info.interface = 'USB';

  return info;
}

/**
 * 获取OBS输入源的可用属性项列表
 * @param {any} obs OBS WebSocket实例
 * @param {string} inputName 输入源名称
 * @param {string} propertyName 要查询的属性名称
 * @returns {Promise<Array<any>>} 属性项列表，失败则返回空数组
 */
async function getAvailablePropertyItems(obs: any, inputName: string, propertyName: string): Promise<Array<any>> {
  try {
    // 调用OBS WebSocket API获取指定属性的可用选项
    const resp = await obs.call('GetInputPropertiesListPropertyItems', { inputName, propertyName });
    return resp?.propertyItems || [];
  } catch {
    // 出错时返回空数组，确保后续处理不会失败
    return [];
  }
}

/** 简单的异步延迟 */
function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * 获取“分辨率”属性项，必要时重试（某些设备需要在选择后等待枚举完成）
 */
async function getResolutionItemsWithRetry(obs: any, inputName: string, tries = 4): Promise<Array<any>> {
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await obs.call('GetInputPropertiesListPropertyItems', { inputName, propertyName: 'resolution' });
      const items = resp?.propertyItems || [];
      if (items.length > 0) return items;
    } catch {}
    await sleep(250 * (i + 1));
  }
  return [];
}


/**
 * 根据当前OBS画布比例智能选择最佳视频采集设备
 * @param {any} obs OBS WebSocket实例
 * @param {string} _inputName 输入源名称（未使用）
 * @param {Array<{ itemName: string; itemValue: string }>} deviceList 可用设备列表
 * @returns {Promise<{ itemName: string; itemValue: string } | null>} 选中的设备或null
 */
async function selectBestDevice(
  obs: any,
  _inputName: string,
  deviceList: Array<{ itemName: string; itemValue: string }>
): Promise<{ itemName: string; itemValue: string } | null> {
  // 检查设备列表是否为空
  if (!deviceList || deviceList.length === 0) return null;

  // 默认选择第一个设备
  let selected = deviceList[0];

  try {
    // 获取OBS当前画布设置
    const { baseWidth, baseHeight } = await obs.call('GetVideoSettings');
    // 计算画布宽高比
    const proportion = baseWidth / Math.max(1, baseHeight);

    // 遍历所有设备，寻找最佳匹配
    for (const d of deviceList) {
      const name = String(d.itemName || '');
      const valueLc = String(d.itemValue || '').toLowerCase();
      const nameLc = name.toLowerCase();
      const isUsb = valueLc.includes('usb');

      // 只考虑USB设备
      if (!isUsb) continue;

      if (proportion <= 1.1) {
        // 竖屏/接近正方形布局：优先选择Webcam/相机
        if (nameLc.includes('webcam') || nameLc.includes('integrated') || nameLc.includes('camera') || name.includes('视频')) {
          selected = d;
          break;
        }
      } else {
        // 横屏布局：优先选择非Webcam类USB采集卡
        if (!nameLc.includes('webcam') && !nameLc.includes('integrated') &&
            !nameLc.includes('camera') && !name.includes('视频设备') &&
            !nameLc.includes('virtual')) {
          selected = d;
          break;
        }
      }
    }
  } catch {
    // 出错时保持默认选择
  }

  return selected;
}

/**
 * 确保数值为偶数，如果是奇数则加1
 * @param {number} v 输入数值
 * @returns {number} 确保为偶数的结果
 * @note OBS中的视频尺寸通常需要是偶数
 */
function ensureEven(v: number) { return v % 2 === 0 ? v : v + 1; }

/**
 * 获取LUT(Look-Up Table)文件的绝对路径
 * LUT用于视频色彩校正和风格化处理
 * @returns {string} LUT文件的绝对路径，失败则返回空字符串
 */
function getLUTFilePath(): string {
  try {
    if (app.isPackaged) {
      // 生产环境：electron-vite 会将 public 目录内容复制到 out/.../resources 目录
      return path.join(process.resourcesPath, 'images', 'original.cube');
    } else {
      // 开发环境：public 目录在项目根目录
      return path.join(app.getAppPath(), 'public', 'images', 'original.cube');
    }
  } catch {
    return ''; // 返回空字符串以便后续逻辑处理
  }
}

/**
 * 计算将任意宽高比视频调整为16:9标准比例所需的缩放和裁剪参数
 * @param {number} width 原始宽度
 * @param {number} height 原始高度
 * @returns {Object} 包含缩放和裁剪参数的对象
 */
function calculateScalingAndCropping(width: number, height: number) {
  // 计算原始宽高比
  const aspect = width / Math.max(1, height);
  // 标准16:9宽高比
  const std = 16 / 9;

  // 初始化缩放和裁剪参数
  let scaleWidth: number, scaleHeight: number, cropLeft = 0, cropRight = 0, cropTop = 0, cropBottom = 0;

  if (aspect > std) {
    // 原始比例比16:9更宽：保持宽度，增加高度，然后裁剪顶部和底部
    scaleWidth = ensureEven(width);
    scaleHeight = ensureEven(Math.round(width / std));
    const cropV = Math.round((scaleHeight - height) / 2);
    cropTop = cropV; cropBottom = cropV;
  } else {
    // 原始比例比16:9更窄：保持高度，增加宽度，然后裁剪左右两侧
    scaleHeight = ensureEven(height);
    scaleWidth = ensureEven(Math.round(height * std));
    const cropH = Math.round((scaleWidth - width) / 2);
    cropLeft = cropH; cropRight = cropH;
  }

  return { scaleWidth, scaleHeight, cropLeft, cropRight, cropTop, cropBottom };
}

/**
 * 为视频源应用基础滤镜组合，包括缩放、裁剪、色彩校正、LUT和锐化
 * @param {any} obs OBS WebSocket实例
 * @param {string} sourceName 视频源名称
 * @param {number} width 原始宽度
 * @param {number} height 原始高度
 * @returns {Promise<boolean>} 是否成功应用滤镜
 */
async function applyBasicFilters(obs: any, sourceName: string, width: number, height: number): Promise<boolean> {
  try {
    // 获取源已有的滤镜列表
    const { filters } = await obs.call('GetSourceFilterList', { sourceName });

    /**
     * 添加或更新滤镜
     * @param {string} name 滤镜名称
     * @param {string} kind 滤镜类型
     * @param {object} settings 滤镜设置
     */
    const addOrUpdateFilter = async (name: string, kind: string, settings: object) => {
      // 检查滤镜是否已存在
      const existing = filters?.find((f: any) => f.filterName === name);
      if (existing) {
        // 更新现有滤镜设置
        await obs.call('SetSourceFilterSettings', { sourceName, filterName: name, filterSettings: settings });
      } else {
        // 创建新滤镜
        await obs.call('CreateSourceFilter', { sourceName, filterName: name, filterKind: kind, filterSettings: settings });
      }
    };

    // 计算16:9标准比例所需的缩放和裁剪参数
    const { scaleWidth, scaleHeight, cropLeft, cropRight, cropTop, cropBottom } = calculateScalingAndCropping(width, height);

    // 应用缩放滤镜，调整分辨率
    await addOrUpdateFilter('缩放/宽高比', 'scale_filter', { resolution: `${scaleWidth}x${scaleHeight}` });

    // 应用裁剪滤镜，确保16:9比例
    await addOrUpdateFilter('裁剪/填充', 'crop_filter', { left: cropLeft, right: cropRight, top: cropTop, bottom: cropBottom });

    // 应用色彩校正滤镜，优化视觉效果
    await addOrUpdateFilter('色彩校正', 'color_filter_v2', {
      brightness: 0.0,    // 亮度保持不变
      contrast: 0.20,     // 轻微提高对比度
      gamma: -0.13,       // 稍微降低伽马值
      hue_shift: 0.0,     // 色相不变
      saturation: 0.30    // 适度提高饱和度
    });

    // 应用LUT滤镜进行色彩风格化
    const lutPath = getLUTFilePath();
    if (lutPath) {
      await addOrUpdateFilter('应用 LUT', 'clut_filter', { image_path: lutPath });
    }

    // 应用锐化滤镜提高清晰度
    await addOrUpdateFilter('锐化', 'sharpness_filter_v2', { sharpness: 0.16 });

    return true;
  } catch (e: any) {
    console.error('应用滤镜失败:', e?.message || e);
    return false;
  }
}


/**
 * 添加或确保OBS中存在视频采集设备源，并进行智能配置
 *
 * 该函数会执行以下操作：
 * 1. 连接到OBS WebSocket
 * 2. 创建或获取视频采集设备源
 * 3. 智能选择最佳设备和分辨率
 * 4. 配置最佳视频格式和色彩设置
 * 5. 可选应用基础滤镜组合
 *
 * @param {Object} options 配置选项
 * @param {string} [options.sourceName] 源名称，默认为"视频采集设备"
 * @param {number} [options.width] 用于滤镜缩放的宽度（可选）
 * @param {number} [options.height] 用于滤镜缩放的高度（可选）
 * @param {string} [options.preferredResolution] 首选分辨率，如"1920x1080"
 * @param {boolean} [options.applyFilters] 是否应用基础滤镜，默认为true
 * @returns {Promise<Object>} 包含操作结果的对象
 */
export async function addOrEnsureVideoCaptureDevice(options: {
  sourceName?: string;
  width?: number;
  height?: number;
  preferredResolution?: string;
  applyFilters?: boolean;
} = {}) {
  // 设置源名称，默认为"视频采集设备"
  const sourceName = options.sourceName || '视频采集设备';
  // 获取当前平台对应的视频采集输入类型
  const kind = getVideoCaptureInputKind();

  // 确保OBS WebSocket连接已建立
  await ensureAndConnectToOBS();
  const obs = getObsInstance();
  if (!obs) throw new Error('OBS WebSocket 未连接');

  // 获取当前活动场景和已有输入源列表
  const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
  const { inputs } = await obs.call('GetInputList');

  // 检查指定名称和类型的视频采集源是否已存在
  const exists = inputs.find((i: any) => i.inputName === sourceName && i.inputKind === kind);

  // 如果源不存在，则创建新源
  if (!exists) {
    try {
      await obs.call('CreateInput', {
        sceneName: currentProgramSceneName,
        inputName: sourceName,
        inputKind: kind
      });
    } catch (e: any) {
      // 创建失败时返回错误信息
      return { success: false, message: '创建视频采集源失败: ' + (e?.message || String(e)) };
    }
  }

  // 获取可用视频设备列表
  let deviceList: Array<{ itemName: string; itemValue: any }> = [];
  try {
    // 查询OBS中可用的视频设备列表
    console.log('sourceName:', sourceName);
    const resp = await obs.call('GetInputPropertiesListPropertyItems', {
      inputName: sourceName,
      propertyName: 'video_device_id'
    });
    deviceList = resp?.propertyItems || [];
    console.log('deviceList:', deviceList);
  } catch {
    // 出错时保持空列表
  }

  // 使用启发式算法选择最佳设备，如果无法选择则使用第一个设备
  const selected = await selectBestDevice(obs, sourceName, deviceList) || deviceList[0];
  console.log('selected:', selected);

  // 识别设备类型，用于后续配置缓冲和设备管理策略
  // 不同类型设备（如网络摄像头vs采集卡）需要不同的优化设置
  const captureInfo = selected ? identifyCaptureCard(selected) : { isWebcam: false, isCapture: false } as any;
  console.log('captureInfo:', captureInfo);

  // 选择采集卡分辨率（在设置设备ID后重试获取，避免空视频设备无法获取分辨率）
  let selectedResolution: string | null = null;
  try {
    if (selected) {
      try {
        await obs.call('SetInputSettings', {
          inputName: sourceName,
          inputSettings: {
            video_device_id: selected.itemValue,
            last_video_device_id: selected.itemValue,
          },
          overlay: true,
        });
      } catch {}
      await sleep(300);
    }

    const resolutions = await getResolutionItemsWithRetry(obs, sourceName, 6);
    console.log('resolutions:', resolutions);

    // 如果没有找到匹配的首选分辨率，则从可用列表中按优先级选择
    selectedResolution = pickResolutionFromList(resolutions) || '1280x720';

  } catch {
    // 出错时继续使用默认分辨率
  }
  // 查询并设置最佳视频格式、色彩空间和色彩范围
  // 设置默认值（兼容大多数设备的安全选项）
  let videoFormat: any = 201; // NV12格式的默认值
  let colorSpace: any = '709'; // Rec.709色彩空间（HDTV标准）
  let colorRange: any = 'partial'; // 有限色彩范围（16-235）

  try {
    // 获取设备支持的视频格式选项
    const vf = await getAvailablePropertyItems(obs, sourceName, 'video_format');
    // 获取设备支持的色彩空间选项
    const cs = await getAvailablePropertyItems(obs, sourceName, 'color_space');
    // 获取设备支持的色彩范围选项
    const cr = await getAvailablePropertyItems(obs, sourceName, 'color_range');

    // 优先选择NV12格式（GPU加速友好，色彩还原好）
    const nv12 = vf.find((f: any) => String(f.itemName || '').toUpperCase().includes('NV12'));
    if (nv12) videoFormat = nv12.itemValue ?? 201;

    // 优先选择Rec.709色彩空间（HDTV标准）
    const cs709 = cs.find((x: any) => String(x.itemName || '').includes('709'));
    if (cs709) colorSpace = cs709.itemValue ?? '709';

    // 优先选择有限色彩范围（大多数摄像头和采集卡的默认输出）
    const limited = cr.find((x: any) => /limited|partial/i.test(String(x.itemName || '')));
    if (limited) colorRange = limited.itemValue ?? 'partial';
  } catch {
    // 出错时使用默认值
  }

  // 组装视频采集设备的完整设置
  const settings: any = {};

  // 设置视频设备ID
  if (selected) {
    settings.video_device_id = selected.itemValue;
    settings.last_video_device_id = selected.itemValue; // 保存上次使用的设备ID
  }

  // 帧率设置
  settings.fps_type = 'custom';      // 使用自定义帧率而非设备默认
  settings.fps_num = 60;             // 设置为60fps
  settings.fps_den = 1;              // 分母为1，实际帧率 = fps_num/fps_den
  settings.fps_matching = false;     // 不匹配输入源帧率

  // 分辨率设置
  settings.resolution = selectedResolution;
  settings.last_resolution = selectedResolution; // 保存上次使用的分辨率
  settings.res_type = 1;             // 使用自定义分辨率

  // 视频格式和色彩设置
  settings.video_format = videoFormat;  // 视频像素格式（如NV12）
  settings.color_space = colorSpace;    // 色彩空间（如Rec.709）
  settings.color_range = colorRange;    // 色彩范围（如有限范围16-235）

  // 设备特定优化设置
  settings.deactivate_when_not_showing = false;  // 即使不可见也保持设备活跃
  settings.buffering = !!captureInfo.isWebcam;   // 网络摄像头启用缓冲，采集卡禁用缓冲

  // 应用设置到OBS视频采集源
  try {
    await obs.call('SetInputSettings', { inputName: sourceName, inputSettings: settings });
  } catch (e: any) {
    // 设置失败时返回错误信息
    return { success: false, message: '设置视频采集源参数失败: ' + (e?.message || String(e)) };
  }

  // 可选应用基础滤镜（缩放/裁剪到16:9标准比例）
  let filtersApplied = false;
  try {
    // 除非明确禁用，否则默认应用滤镜
    if (options.applyFilters !== false) {
      // 解析当前分辨率获取宽高
      const parsed = parseResolution(options.preferredResolution);
      // 使用指定宽高或从分辨率解析的宽高，如果都没有则使用默认值
      const w = parsed?.width || 1920;
      const h = parsed?.height || 1080;
      console.log('机型宽高:', w, h);
      // 应用基础滤镜组合（缩放、裁剪、色彩校正等）
      filtersApplied = await applyBasicFilters(obs, sourceName, w, h);
    }
  } catch {
    // 应用滤镜失败时继续执行，不中断流程
  }

  // 返回操作结果
  return {
    success: true,                    // 操作成功标志
    sourceName,                       // 视频源名称
    resolution: selectedResolution,   // 选择的分辨率
    deviceName: selected?.itemName,   // 设备名称
    deviceId: selected?.itemValue,    // 设备ID
    filtersApplied,                   // 是否成功应用了滤镜
  };
}

