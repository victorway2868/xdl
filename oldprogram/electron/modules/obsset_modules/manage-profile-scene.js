/**
 * OBS WebSocket - Profile and Scene Collection Manager
 *
 * This module provides functions to manage OBS profiles and scene collections.
 * It can check if a profile and scene collection exist, switch to them, or create them if they don't exist.
 * It also configures video settings based on the provided resolution.
 */

// Import the OBS WebSocket library
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ensureAndConnectToOBS } from '../obsWebSocketHandlers.js';
import { getSystemInfo } from '../../utils/hardware-info.js';
import { addDefaultVideoCaptureDevice } from './video-capture-device.js';
import createDisplayCaptureSource from './create-display-capture.js';
import { app } from 'electron';
import { enableAudioSources } from './enable-audio-sources.js';

/**
 * Ensure a number is even, if odd add 1 to make it even
 * @param {number} value - The value to make even
 * @returns {number} Even number
 */
function ensureEven(value) {
  return value % 2 === 0 ? value : value + 1;
}

/**
 * Calculate dimensions based on the provided resolution and adjustment factor
 * @param {number} width - The base width
 * @param {number} height - The base height
 * @returns {Object} The calculated dimensions
 */
function calculateDimensions(width, height) {
  // If aspect ratio is less than 1 (portrait), set heightAdjustmentFactor to 0, otherwise use 52/1080
  const heightAdjustmentFactor = (width / height < 1) ? 0 : 52 / 1080;

  // Calculate actual dimensions
  const actualBaseWidth = width;
  const actualBaseHeight = Math.round(height * (1 + heightAdjustmentFactor));
  const actualOutputWidth = width;
  const actualOutputHeight = Math.round(height * (1 + heightAdjustmentFactor));

  // Format dimensions as strings for OBS API
  const baseWidthStr = String(actualBaseWidth);
  const baseHeightStr = String(actualBaseHeight);
  const outputWidthStr = String(actualOutputWidth);
  const outputHeightStr = String(actualOutputHeight);

  // 根据宽高比计算rescaleResStr，确保分辨率是偶数
  let rescaleWidth, rescaleHeight;

  if (actualBaseWidth >= actualBaseHeight) {
    // 横屏：固定高度为1080，按比例计算宽度
    rescaleHeight = ensureEven(1080);
    rescaleWidth = ensureEven(Math.round(rescaleHeight * (actualBaseWidth / actualBaseHeight)));

  } else {
    // 竖屏：固定宽度为1080，按比例计算高度
    rescaleWidth = ensureEven(1080);
    rescaleHeight = ensureEven(Math.round(rescaleWidth * (actualBaseHeight / actualBaseWidth)));
  }

  const rescaleResStr = `${rescaleWidth}x${rescaleHeight}`;

  return {
    actualBaseWidth,
    actualBaseHeight,
    actualOutputWidth,
    actualOutputHeight,
    baseWidthStr,
    baseHeightStr,
    outputWidthStr,
    outputHeightStr,
    rescaleResStr,
    rescaleWidth,
    rescaleHeight,
    heightAdjustmentFactor
  };
}

/**
 * Manage OBS profile and scene collection
 * @param {Object} options - Configuration options
 * @param {string} options.profileName - Profile name to check/create
 * @param {string} options.sceneCollectionName - Scene collection name to check/create
 * @param {number} options.width - Base width for video settings
 * @param {number} options.height - Base height for video settings
 * @param {string} options.deviceName - Device model name (optional, defaults to profileName if not provided)
 * @param {string} options.resolution - Resolution in format "widthxheight" (optional, derived from width and height if not provided)
 * @param {string} options.address - OBS WebSocket address (optional)
 * @param {string} options.password - OBS WebSocket password (optional)
 * @returns {Promise<Object>} Result of the operation
 */
async function manageProfileAndSceneCollection(options) {
  // Set default options
  const {
    profileName,
    sceneCollectionName,
    width = 1920,
    height = 1080,
    deviceName,
    resolution,
    address = 'localhost:4455',
    password = ''
  } = options;

  // Use deviceName as profileName and sceneCollectionName if provided
  const actualProfileName = deviceName || profileName;
  const actualSceneCollectionName = deviceName || sceneCollectionName;

  // 创建一个新的OBS WebSocket连接，而不是使用共享实例
  let obs = null;

  // Parse resolution if provided, otherwise use width and height
  let actualWidth = width;
  let actualHeight = height;

  if (resolution) {
    const match = resolution.replace(/\s+/g, '').match(/(\d+)[xX×](\d+)/);
    if (match) {
      actualWidth = parseInt(match[1], 10);
      actualHeight = parseInt(match[2], 10);
    }
  }

  // Calculate dimensions
  const dimensions = calculateDimensions(actualWidth, actualHeight);

  try {
    // 使用obsWebSocketHandlers.js中的ensureAndConnectToOBS函数连接到OBS
    console.log('正在连接到OBS WebSocket...');
    const connectResult = await ensureAndConnectToOBS(address, password);

    if (!connectResult.success) {
      throw new Error(`无法连接到OBS WebSocket: ${connectResult.message}`);
    }

    // 获取OBS WebSocket客户端实例
    // 注意：ensureAndConnectToOBS函数会返回一个连接结果，但不会返回OBS WebSocket客户端实例
    // 我们需要从obsWebSocketHandlers.js模块中获取它

    // 导入obsWebSocketHandlers.js中的getOBSWebSocketInstance函数
    const { getOBSWebSocketInstance } = await import('../obsWebSocketHandlers.js');
    obs = getOBSWebSocketInstance();

    if (!obs || !obs.identified) {
      throw new Error('OBS WebSocket客户端未连接');
    }

    // Get OBS version
    const { obsVersion } = await obs.call('GetVersion');
    console.log(`OBS Studio Version: ${obsVersion}`);

    // Step 1: Handle profile with retry mechanism
    console.log('\n--- Profile Management ---');

    // 实现配置文件处理的重试机制
    const maxProfileRetries = 3;
    let profileRetryCount = 0;
    let profileSuccess = false;

    while (!profileSuccess && profileRetryCount < maxProfileRetries) {
      try {
        // 获取当前配置文件列表
        const profileResponse = await obs.call('GetProfileList');
        const profiles = profileResponse.profiles || [];
        const currentProfile = profileResponse.currentProfileName;

        console.log(`Current profile: ${currentProfile}`);
        console.log(`Available profiles: ${profiles.join(', ')}`);

        if (profiles.includes(actualProfileName)) {
          console.log(`Profile "${actualProfileName}" exists.`);

          if (currentProfile !== actualProfileName) {
            console.log(`Switching to profile "${actualProfileName}"...`);
            await obs.call('SetCurrentProfile', { profileName: actualProfileName });
            console.log(`Successfully switched to profile "${actualProfileName}"`);

            // 添加较长延迟，确保配置文件切换完成
            console.log('Waiting for profile switch to complete...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`Already using profile "${actualProfileName}"`);
          }
        } else {
          console.log(`Profile "${actualProfileName}" does not exist. Creating...`);
          await obs.call('CreateProfile', { profileName: actualProfileName });
          console.log(`Successfully created profile "${actualProfileName}"`);

          // 添加较长延迟，确保配置文件创建完成
          console.log('Waiting for profile creation to complete...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 切换到新创建的配置文件
          console.log(`Switching to the newly created profile "${actualProfileName}"...`);
          await obs.call('SetCurrentProfile', { profileName: actualProfileName });
          console.log(`Switched to the newly created profile "${actualProfileName}"`);

          // 再次添加延迟，确保配置文件切换完成
          console.log('Waiting for profile switch to complete...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 验证配置文件是否已成功应用
        const verifyProfileResponse = await obs.call('GetProfileList');
        const currentProfileAfterSwitch = verifyProfileResponse.currentProfileName;

        if (currentProfileAfterSwitch !== actualProfileName) {
          throw new Error(`Profile switch verification failed. Expected "${actualProfileName}", got "${currentProfileAfterSwitch}"`);
        } else {
          console.log(`Profile verification successful: Using "${actualProfileName}"`);
          profileSuccess = true;
        }
      } catch (error) {
        profileRetryCount++;
        console.log(`Profile attempt ${profileRetryCount}/${maxProfileRetries} failed: ${error.message}`);

        if (profileRetryCount < maxProfileRetries) {
          console.log(`Waiting before profile retry ${profileRetryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * profileRetryCount));
        } else {
          console.error(`Failed to handle profile after ${maxProfileRetries} attempts`);
          throw error;
        }
      }
    }

    // 在配置文件处理完成后，先配置视频设置，然后再创建场景集合
    // Configure video settings immediately after profile creation/switching, before scene collection management
    console.log('\n--- Video Settings Configuration ---');
    console.log('Configuring video settings for the profile...');

    // Set video settings
    await obs.call('SetVideoSettings', {
      baseWidth: dimensions.actualBaseWidth,
      baseHeight: dimensions.actualBaseHeight,
      outputWidth: dimensions.actualOutputWidth,
      outputHeight: dimensions.actualOutputHeight,
      fpsNumerator: 65,
      fpsDenominator: 1
    });

    // 辅助函数：批量设置配置参数
    async function setProfileParameters(obs, parameters) {
      for (const param of parameters) {
        await obs.call('SetProfileParameter', param);
      }
    }

    // 设置输出模式为高级模式
    await setProfileParameters(obs, [
      {
        parameterCategory: 'Output',
        parameterName: 'Mode',
        parameterValue: 'Advanced'
      }
    ]);

    // 获取推荐的编码器
    console.log('Detecting available hardware encoders...');
    const recommendedEncoder = await getSystemInfo();
    // console.log('Recommended encoder:', recommendedEncoder.name);

    // 设置重新缩放和比特率设置
    await setProfileParameters(obs, [
      {
        parameterCategory: 'AdvOut',
        parameterName: 'Encoder',
        parameterValue: recommendedEncoder.encoder
      },
      // 重新缩放设置
      {
        parameterCategory: 'AdvOut',
        parameterName: 'Rescale',
        parameterValue: 'true'
      },
      {
        parameterCategory: 'AdvOut',
        parameterName: 'RescaleFilter',
        parameterValue: '4' // Lanczos
      },
      {
        parameterCategory: 'AdvOut',
        parameterName: 'RescaleRes',
        parameterValue: dimensions.rescaleResStr
      }
    ]);

    console.log('Video settings configured successfully!');

    // 添加额外的延迟
    console.log('Profile setup complete. Adding extra delay before scene collection setup...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Handle scene collection with improved retry mechanism
    console.log('\n--- Scene Collection Management ---');

    // 实现更健壮的场景集合处理重试机制
    const maxSceneRetries = 5; // 增加最大重试次数
    let sceneRetryCount = 0;
    let sceneCollectionSuccess = false;

    // 在开始处理场景集合前，先刷新OBS WebSocket连接
    try {
      console.log('Refreshing OBS WebSocket connection before scene collection setup...');
      // 获取OBS版本信息，确认连接正常
      const { obsVersion, obsWebSocketVersion } = await obs.call('GetVersion');
      console.log(`Confirmed connection to OBS version: ${obsVersion}, WebSocket version: ${obsWebSocketVersion}`);
    } catch (error) {
      console.log(`Connection check failed: ${error.message}. Continuing anyway...`);
    }

    while (!sceneCollectionSuccess && sceneRetryCount < maxSceneRetries) {
      try {
        // 每次尝试前重新获取场景集合列表
        const sceneCollectionResponse = await obs.call('GetSceneCollectionList');
        const sceneCollections = sceneCollectionResponse.sceneCollections || [];
        const currentSceneCollection = sceneCollectionResponse.currentSceneCollectionName;

        console.log(`Current scene collection: ${currentSceneCollection}`);
        console.log(`Available scene collections: ${sceneCollections.join(', ')}`);

        if (sceneCollections.includes(actualSceneCollectionName)) {
          console.log(`Scene collection "${actualSceneCollectionName}" exists.`);

          if (currentSceneCollection !== actualSceneCollectionName) {
            console.log(`Switching to scene collection "${actualSceneCollectionName}"...`);
            await obs.call('SetCurrentSceneCollection', { sceneCollectionName: actualSceneCollectionName });
            console.log(`Successfully switched to scene collection "${actualSceneCollectionName}"`);

            // 添加较长延迟，确保场景集合切换完成
            console.log('Waiting for scene collection switch to complete...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log(`Already using scene collection "${actualSceneCollectionName}"`);
          }
        } else {
          console.log(`Scene collection "${actualSceneCollectionName}" does not exist. Creating...`);

          // 添加较长延迟，确保OBS准备好创建新场景集合
          console.log('Preparing to create new scene collection...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 使用try-catch单独处理创建场景集合的操作
          try {
            await obs.call('CreateSceneCollection', { sceneCollectionName: actualSceneCollectionName });
            console.log(`Successfully created scene collection "${actualSceneCollectionName}"`);

            // 添加较长延迟，确保场景集合创建完成
            console.log('Waiting for scene collection creation to complete...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (createError) {
            console.error(`Error creating scene collection: ${createError.message}`);

            if (createError.code === 600) {
              console.log('Received error code 600. This usually means OBS is busy. Waiting longer...');
              await new Promise(resolve => setTimeout(resolve, 1000));

              // 尝试再次创建
              console.log('Trying to create scene collection again...');
              await obs.call('CreateSceneCollection', { sceneCollectionName: actualSceneCollectionName });
              console.log(`Successfully created scene collection "${actualSceneCollectionName}" on second attempt`);

              // 添加更长延迟
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw createError; // 重新抛出其他错误
            }
          }

          console.log(`Switched to the newly created scene collection "${actualSceneCollectionName}"`);
        }

        // 验证场景集合是否已成功应用
        console.log('Verifying scene collection...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 验证前添加延迟

        const verifySceneCollectionResponse = await obs.call('GetSceneCollectionList');
        const currentSceneCollectionAfterSwitch = verifySceneCollectionResponse.currentSceneCollectionName;

        if (currentSceneCollectionAfterSwitch === actualSceneCollectionName) {
          console.log(`Scene collection verification successful: Using "${actualSceneCollectionName}"`);
          sceneCollectionSuccess = true;

          // 成功后添加额外延迟，确保OBS完全加载场景集合
          console.log('Scene collection setup successful. Adding final delay...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 添加场景源
          console.log('\n--- Adding Scene Sources ---');

          try {
            // 获取当前场景
            const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
            console.log(`Current Scene: ${currentProgramSceneName}`);

            // 获取可用的输入类型
            console.log('Getting available input kinds...');
            const { inputKinds } = await obs.call('GetInputKindList');
            console.log('Available input kinds:', inputKinds);

            // 查找图像和文本输入类型
            let imageInputKind = null;
            let textInputKind = null;

            // 查找图像输入类型 (image_source, ffmpeg_source)
            for (const kind of ['image_source', 'ffmpeg_source']) {
              if (inputKinds.includes(kind)) {
                imageInputKind = kind;
                console.log(`Found image input kind: ${imageInputKind}`);
                break;
              }
            }

            // 查找文本输入类型 (text_gdiplus_v2, text_ft2_source_v2)
            for (const kind of ['text_gdiplus_v2', 'text_ft2_source_v2']) {
              if (inputKinds.includes(kind)) {
                textInputKind = kind;
                console.log(`Found text input kind: ${textInputKind}`);
                break;
              }
            }

            // 0.添加桌面音频和麦克风源
            console.log('\n0. Adding audio sources...');
            try {
              const audioResult = await enableAudioSources({ obs });
              console.log(`Audio sources result: ${audioResult.success ? 'Success' : 'Failed'}`);
            } catch (audioError) {
              console.warn(`Warning: Failed to enable audio sources: ${audioError.message}`);
            }

            if (actualProfileName == 'PC端游') {
              //1.添加显示器采集
              console.log('\n1. Adding display capture...');
              try {
                const displayResult = await createDisplayCaptureSource(obs);
                console.log(`Display capture result: ${displayResult.success ? 'Success' : 'Failed'}`);
              } catch (displayError) {
                console.warn(`Warning: Failed to add display capture: ${displayError.message}`);
              }

            } else {
              // 1. 添加视频采集设备
              console.log('\n1. Adding video capture device...');
              try {
                const videoResult = await addDefaultVideoCaptureDevice(actualWidth, actualHeight, obs);
                console.log(`Video capture device result: ${videoResult.success ? 'Success' : 'Failed'}`);
              } catch (videoError) {
                console.warn(`Warning: Failed to add video capture device: ${videoError.message}`);
              }
            }

            if (dimensions.rescaleWidth >= dimensions.rescaleHeight) {

              // 2. 添加图像源 "动图"
              if (imageInputKind) {
                console.log('\n2. Adding image source for "动图"...');
                try {
                  // 这里可以设置一个默认图片路径，或者从参数中获取
                  // 使用pathManager获取应用根目录，确保在开发和生产环境中都能正确找到图片
                  let imagePath;
                  if (app.isPackaged) {
                    // 生产环境 - 尝试多个可能的路径
                    const possiblePaths = [
                      // 标准打包路径
                      path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'public', 'images', 'winer.gif'),
                      // 备用路径1 - 直接在resources下
                      path.join(path.dirname(app.getPath('exe')), 'resources', 'public', 'images', 'winer.gif'),
                      // 备用路径2 - 在app目录下
                      path.join(app.getAppPath(), 'public', 'images', 'winer.gif'),
                      // 备用路径3 - 在extraResources中
                      path.join(process.resourcesPath, 'public', 'images', 'winer.gif')
                    ];

                    // 尝试找到存在的图片文件
                    for (const imgPath of possiblePaths) {
                      if (fs.existsSync(imgPath)) {
                        imagePath = imgPath;
                        console.log(`找到动图文件: ${imagePath}`);
                        break;
                      }
                    }

                    // 如果都没找到，使用第一个路径（用于错误报告）
                    if (!imagePath) {
                      console.warn('未找到动图文件，尝试的路径:', possiblePaths);
                      imagePath = possiblePaths[0];
                    }
                  } else {
                    // 开发环境路径
                    imagePath = path.join(app.getAppPath(), 'public', 'images', 'winer.gif');
                  }
                  console.log(`动图GIF路径: ${imagePath}`);
                  if (imagePath) {
                    await addOrUpdateImageSource(obs, currentProgramSceneName, imageInputKind, '动图', imagePath);
                  } else {
                    console.log('No image path provided for "动图". Skipping image source creation.');
                  }
                } catch (imageError) {
                  console.warn(`Warning: Failed to add image source "动图": ${imageError.message}`);
                }
              } else {
                console.warn('No image input kind found in OBS. Image source will not be created.');
              }

              if (textInputKind) {
                // 3. 添加文本源 "榜一"
                console.log('\n3. Adding text source for "榜一"...');
                try {
                  await addOrUpdateTextSource(obs, currentProgramSceneName, textInputKind, '榜一', '昨日榜一:XX');
                } catch (textError) {
                  console.warn(`Warning: Failed to add text source "榜一": ${textError.message}`);
                }

                // 4. 添加文本源 "设备" 显示设备型号名称
                console.log('\n4. Adding text source for "设备"...');
                try {
                  await addOrUpdateTextSource(obs, currentProgramSceneName, textInputKind, '设备', `设备:${deviceName || actualProfileName}`);
                } catch (textError) {
                  console.warn(`Warning: Failed to add text source "设备": ${textError.message}`);
                }

                // 5. 添加文本源 "消费"
                console.log('\n5. Adding text source for "消费"...');
                try {
                  await addOrUpdateTextSource(obs, currentProgramSceneName, textInputKind, '消费', '禁止未成年消费');
                } catch (textError) {
                  console.warn(`Warning: Failed to add text source "消费": ${textError.message}`);
                }
              }
            }

            console.log('All sources added successfully!');
          } catch (sourcesError) {
            console.warn(`Warning: Error adding sources: ${sourcesError.message}`);
            // 继续执行，不要因为添加源失败而中断整个流程
          }
        } else {
          throw new Error(`Scene collection switch verification failed. Expected "${actualSceneCollectionName}", got "${currentSceneCollectionAfterSwitch}"`);
        }
      } catch (error) {
        sceneRetryCount++;
        console.log(`Scene collection attempt ${sceneRetryCount}/${maxSceneRetries} failed: ${error.message}`);

        if (sceneRetryCount < maxSceneRetries) {
          const waitTime = 3000 * sceneRetryCount;
          console.log(`Waiting ${waitTime}ms before scene collection retry ${sceneRetryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error(`Failed to handle scene collection after ${maxSceneRetries} attempts`);
          throw error;
        }
      }
    }


    // Return success result with encoder information
    return {
      success: true,
      profileName: actualProfileName,
      sceneCollectionName: actualSceneCollectionName,
      dimensions,
      encoder: recommendedEncoder,
      message: `OBS profile and scene collection configured successfully using ${recommendedEncoder.type} encoder (${recommendedEncoder.name}). Please restart OBS to apply all settings.`,
      restartRequired: true
    };

  } catch (error) {
    console.error('\n--- ERROR ---');
    console.error(`Error message: ${error.message}`);

    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }

    if (error.message.includes('timeout')) {
      console.error('Connection timed out. OBS might not be running or WebSocket server might be disabled.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('Connection refused. OBS is not running or WebSocket server is not enabled.');
    } else if (error.message.includes('Authentication')) {
      console.error('Authentication failed. The password is incorrect.');
    }

    // Provide troubleshooting tips
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure OBS Studio is running');
    console.log('2. Verify that the WebSocket server is enabled in OBS (Tools > WebSocket Server Settings)');
    console.log('3. Check that the port is correct (default is 4455)');
    console.log('4. Verify that the password is correct (or try with no password)');
    console.log('5. Check if there are any firewall issues blocking the connection');
    console.log('6. Try restarting OBS');

    // Return error result
    return {
      success: false,
      error: error.message,
      message: 'Failed to configure OBS profile and scene collection'
    };
  }
}

/**
 * Simple function to create or switch to a profile and scene collection with the same name
 * @param {string} name - Name to use for both profile and scene collection
 * @param {string} resolution - Resolution in format "widthxheight" (e.g., "1920x1080")
 * @param {string} address - OBS WebSocket address (optional)
 * @param {string} password - OBS WebSocket password (optional)
 * @returns {Promise<Object>} Result of the operation
 */
async function configureOBSWithName(name, resolution, address = 'localhost:4455', password = '') {
  // Use the device name and resolution directly in the manageProfileAndSceneCollection function
  return manageProfileAndSceneCollection({
    profileName: name,
    sceneCollectionName: name,
    deviceName: name,
    resolution: resolution,
    address,
    password
  });
}

/**
 * Add or update a text source
 * @param {Object} obs - OBS WebSocket client
 * @param {string} sceneName - Scene name
 * @param {string} inputKind - Input kind for text sources
 * @param {string} sourceName - Source name
 * @param {string} textContent - Text content
 */
async function addOrUpdateTextSource(obs, sceneName, inputKind, sourceName, textContent) {
  try {
    // Check if the source already exists
    const { inputs } = await obs.call('GetInputList');
    const existingSource = inputs.find(input => input.inputName === sourceName);

    if (existingSource) {
      console.log(`Text source "${sourceName}" already exists. Updating content...`);

      // Update existing source
      await obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          text: textContent,
          font: {
            face: '仓耳舒圆体 W04',
            size: 256,
            style: 'Regular',
            flags: 0
          }
        }
      });

      console.log(`Successfully updated text source "${sourceName}" with content: "${textContent}"`);
    } else {
      console.log(`Creating new text source "${sourceName}"...`);

      // Create new source
      await obs.call('CreateInput', {
        sceneName: sceneName,
        inputName: sourceName,
        inputKind: inputKind,
        inputSettings: {
          text: textContent,
          font: {
            face: '仓耳舒圆体 W04',
            size: 256,
            style: 'Regular',
            flags: 0
          }
        }
      });

      console.log(`Successfully created text source "${sourceName}" with content: "${textContent}"`);
    }

    return true;
  } catch (error) {
    console.error(`Error adding/updating text source "${sourceName}":`, error);
    throw error;
  }
}

/**
 * Add or update an image source
 * @param {Object} obs - OBS WebSocket client
 * @param {string} sceneName - Scene name
 * @param {string} inputKind - Input kind for image sources
 * @param {string} sourceName - Source name
 * @param {string} filePath - Image file path
 */
async function addOrUpdateImageSource(obs, sceneName, inputKind, sourceName, filePath) {
  try {
    // Check if the source already exists
    const { inputs } = await obs.call('GetInputList');
    const existingSource = inputs.find(input => input.inputName === sourceName);

    if (existingSource) {
      console.log(`Image source "${sourceName}" already exists. Updating file path...`);

      // Update existing source
      await obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          file: filePath
        }
      });

      console.log(`Successfully updated image source "${sourceName}" with file: "${filePath}"`);
    } else {
      console.log(`Creating new image source "${sourceName}"...`);

      // Create new source
      await obs.call('CreateInput', {
        sceneName: sceneName,
        inputName: sourceName,
        inputKind: inputKind,
        inputSettings: {
          file: filePath
        }
      });

      console.log(`Successfully created image source "${sourceName}" with file: "${filePath}"`);
    }

    return true;
  } catch (error) {
    console.error(`Error adding/updating image source "${sourceName}":`, error);
    throw error;
  }
}

// Export functions
export {
  manageProfileAndSceneCollection,
  configureOBSWithName,
  calculateDimensions,
  addOrUpdateTextSource,
  addOrUpdateImageSource
};
