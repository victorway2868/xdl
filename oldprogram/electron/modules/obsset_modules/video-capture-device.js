/**
 * OBS WebSocket - Video Capture Device Manager
 *
 * This module provides functions to manage video capture devices in OBS:
 * 1. Creates a video capture device source if it doesn't exist
 * 2. Gets the list of available video capture devices
 * 3. Gets the list of available resolutions for the selected device
 * 4. Identifies the capture card name, model, and type
 * 5. Optimizes connection parameters based on device capabilities
 * 6. Configures the device with selected parameters
 */

// Import required modules
import os from 'os';
import OBSWebSocket from 'obs-websocket-js';
import { addFiltersToVideoCaptureDevice } from './setfilter.js';

/**
 * Default source name for the video capture device
 */
const DEFAULT_SOURCE_NAME = '视频采集设备'; // "Video Capture Device" in Chinese

/**
 * Get the appropriate input kind for video capture devices based on the OS
 * @returns {string} The input kind for video capture devices
 */
function getVideoCaptureInputKind() {
  const platform = os.platform();

  if (platform === 'win32') {
    return 'dshow_input'; // DirectShow (Windows)
  } else if (platform === 'darwin') {
    return 'avfoundation_input'; // AVFoundation (macOS)
  } else if (platform === 'linux') {
    return 'v4l2_input'; // Video4Linux2 (Linux)
  } else {
    console.warn(`Unknown platform: ${platform}, defaulting to DirectShow`);
    return 'dshow_input';
  }
}

/**
 * Identify the capture card model and type based on device information
 * @param {Object} device - The device object from OBS
 * @returns {Object} Object containing capture card information
 */
function identifyCaptureCard(device) {
  const deviceName = device.itemName.toLowerCase();
  const deviceId = device.itemValue.toLowerCase();

  // Initialize capture card info
  const captureCardInfo = {
    name: device.itemName,
    id: device.itemValue,
    type: 'Unknown',
    model: 'Unknown',
    interface: 'Unknown',
    isWebcam: false,
    isCapture: false
  };

  // Check if it's a webcam
  if (
    deviceName.includes('webcam') ||
    deviceName.includes('camera') ||
    deviceName.includes('integrated') ||
    deviceName.includes('built-in')
  ) {
    captureCardInfo.type = 'Webcam';
    captureCardInfo.isWebcam = true;

    // Try to identify webcam model
    if (deviceName.includes('logitech')) {
      captureCardInfo.model = deviceName.includes('c920') ? 'Logitech C920' :
                             deviceName.includes('c922') ? 'Logitech C922' :
                             deviceName.includes('brio') ? 'Logitech Brio' :
                             'Logitech Webcam';
    } else if (deviceName.includes('microsoft')) {
      captureCardInfo.model = 'Microsoft Webcam';
    } else if (deviceName.includes('razer')) {
      captureCardInfo.model = 'Razer Webcam';
    }
  }
  // Check if it's a capture card
  else if (
    deviceName.includes('capture') ||
    deviceName.includes('elgato') ||
    deviceName.includes('avermedia') ||
    deviceName.includes('blackmagic') ||
    deviceName.includes('magewell') ||
    deviceName.includes('hdmi')
  ) {
    captureCardInfo.type = 'Capture Card';
    captureCardInfo.isCapture = true;

    // Try to identify capture card model
    if (deviceName.includes('elgato')) {
      captureCardInfo.model = deviceName.includes('hd60') ? 'Elgato HD60' :
                             deviceName.includes('4k') ? 'Elgato 4K60' :
                             deviceName.includes('cam link') ? 'Elgato Cam Link' :
                             'Elgato Capture Card';
      captureCardInfo.interface = deviceName.includes('usb') ? 'USB' : 'PCIe';
    } else if (deviceName.includes('avermedia')) {
      captureCardInfo.model = 'AVerMedia Capture Card';
    } else if (deviceName.includes('blackmagic')) {
      captureCardInfo.model = 'Blackmagic Capture Card';
    } else if (deviceName.includes('magewell')) {
      captureCardInfo.model = 'Magewell Capture Card';
    }
  }

  // If we couldn't identify the type, make a best guess
  if (captureCardInfo.type === 'Unknown') {
    if (deviceId.includes('usb')) {
      if (deviceName.includes('video')) {
        captureCardInfo.type = 'USB Video Device';
      } else {
        captureCardInfo.type = 'USB Device';
      }
      captureCardInfo.interface = 'USB';
    } else if (deviceId.includes('pci')) {
      captureCardInfo.type = 'PCIe Device';
      captureCardInfo.interface = 'PCIe';
    }
  }

  return captureCardInfo;
}

/**
 * Get all available property items for a device
 * @param {string} inputName - The name of the input source
 * @param {string} propertyName - The name of the property to get items for
 * @returns {Promise<Array>} Array of available property items
 */
async function getAvailablePropertyItems(inputName, propertyName) {
  try {
    const response = await obs.call('GetInputPropertiesListPropertyItems', {
      inputName: inputName,
      propertyName: propertyName
    });

    return response.propertyItems || [];
  } catch (error) {
    console.error(`Error getting ${propertyName} options:`, error);
    return [];
  }
}

/**
 * Get all available resolution types for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available resolution types
 */
async function getAvailableResolutionTypes(inputName) {
  return getAvailablePropertyItems(inputName, 'resolution_type');
}

/**
 * Get all available resolutions for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available resolutions
 */
async function getAvailableResolutions(inputName) {
  return getAvailablePropertyItems(inputName, 'resolution');
}

/**
 * Get all available FPS types for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available FPS types
 */
async function getAvailableFpsTypes(inputName) {
  return getAvailablePropertyItems(inputName, 'fps_type');
}

/**
 * Get all available FPS values for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available FPS values
 */
async function getAvailableFpsValues(inputName) {
  return getAvailablePropertyItems(inputName, 'fps_num');
}

/**
 * Get all available video formats for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available video formats
 */
async function getAvailableVideoFormats(inputName) {
  return getAvailablePropertyItems(inputName, 'video_format');
}

/**
 * Get all available color spaces for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available color spaces
 */
async function getAvailableColorSpaces(inputName) {
  return getAvailablePropertyItems(inputName, 'color_space');
}

/**
 * Get all available color ranges for a device
 * @param {string} inputName - The name of the input source
 * @returns {Promise<Array>} Array of available color ranges
 */
async function getAvailableColorRanges(inputName) {
  return getAvailablePropertyItems(inputName, 'color_range');
}

/**
 * Manage video capture devices in OBS
 * @param {Object} options - Configuration options
 * @param {string} options.sourceName - Source name for the video capture device (optional)
 * @param {Object} options.obs - OBS WebSocket client (optional)
 * @param {number} options.width - Width of the device resolution (optional)
 * @param {number} options.height - Height of the device resolution (optional)
 * @param {Object} options.deviceSettings - Device settings (optional)
 * @param {string} options.deviceSettings.resolution - Preferred resolution (optional)
 * @param {number} options.deviceSettings.fps - Preferred FPS (optional)
 * @param {string} options.deviceSettings.videoFormat - Preferred video format (optional)
 * @param {string} options.deviceSettings.colorSpace - Preferred color space (optional)
 * @param {string} options.deviceSettings.colorRange - Preferred color range (optional)
 * @returns {Promise<Object>} Result of the operation
 */
async function manageVideoCaptureDevice(options = {}) {
  // Set default options
  const {
    sourceName = DEFAULT_SOURCE_NAME,
    obs, // OBS WebSocket client must be provided
    width = 1920, // Default width if not provided
    height = 1080, // Default height if not provided
    deviceSettings = {}
  } = options;

  // Check if OBS WebSocket client is provided
  if (!obs) {
    throw new Error('OBS WebSocket client is required. Please provide an OBS WebSocket client instance.');
  }

  try {
    // Check if the client is connected
    if (!obs.identified) {
      throw new Error('OBS WebSocket client is not connected');
    }

    console.log('Using existing OBS WebSocket connection');

    // Get OBS version
    const { obsVersion } = await obs.call('GetVersion');
    console.log(`OBS Studio Version: ${obsVersion}`);

    // Step 1: Get current scene
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log(`Current Scene: ${currentProgramSceneName}`);

    // Step 2: Check if the video capture device source already exists
    const { inputs } = await obs.call('GetInputList');
    const videoCaptureInputKind = getVideoCaptureInputKind();

    console.log(`Using input kind for video capture: ${videoCaptureInputKind}`);

    // Find if our source already exists
    const existingSource = inputs.find(input =>
      input.inputName === sourceName && input.inputKind === videoCaptureInputKind
    );

    // Step 3: Create the source if it doesn't exist
    if (!existingSource) {
      console.log(`Creating new video capture device source: ${sourceName}`);

      await obs.call('CreateInput', {
        sceneName: currentProgramSceneName,
        inputName: sourceName,
        inputKind: videoCaptureInputKind
      });

      console.log(`Successfully created video capture device source: ${sourceName}`);
    } else {
      console.log(`Video capture device source already exists: ${sourceName}`);
    }

    // Step 4: Get the list of available video devices
    console.log('\n--- Getting Available Video Devices ---');
    const deviceListResponse = await obs.call('GetInputPropertiesListPropertyItems', {
      inputName: sourceName,
      propertyName: 'video_device_id'
    });

    const deviceList = deviceListResponse.propertyItems || [];

    if (deviceList.length === 0) {
      console.log('No video capture devices found.');
    } else {
      console.log(`Found ${deviceList.length} video capture devices:`);

      // Create a table to display the devices
      console.log('\n--- Available Video Capture Devices ---');
      console.log('Index | Device Name | Device ID');
      console.log('-----|-------------|----------');

      deviceList.forEach((device, index) => {
        console.log(`${index + 1} | ${device.itemName} | ${device.itemValue}`);
      });


      // Select a device based on criteria similar to the Python implementation
      // Calculate the proportion of the current canvas
      const { baseWidth, baseHeight } = await obs.call('GetVideoSettings');
      const proportion = baseWidth / baseHeight;
      console.log(`Canvas proportion: ${proportion} (${baseWidth}x${baseHeight})`);

      // Select device based on proportion and device characteristics
      let selectedDevice = deviceList[0]; // Default to first device

      for (const device of deviceList) {
        const deviceName = device.itemName;
        const deviceValue = device.itemValue.toLowerCase();

        // Check if device is USB
        if (deviceValue.includes('usb')) {
          if (proportion <= 1.1) {
            // For portrait or square orientation, prefer webcams and cameras
            if (
              deviceName.includes('Webcam') ||
              deviceName.includes('Integrated') ||
              deviceName.includes('Camera') ||
              deviceName.includes('视频') // "Video" in Chinese
            ) {
              selectedDevice = device;
              break;
            }
          } else {
            // For landscape orientation, prefer non-webcam USB devices
            if (
              !deviceName.includes('Webcam') &&
              !deviceName.includes('Integrated') &&
              !deviceName.includes('Camera') &&
              !deviceName.includes('视频设备') && // "Video device" in Chinese
              !deviceName.includes('Virtual')
            ) {
              selectedDevice = device;
              break;
            }
          }
        }
      }

      // Identify the capture card model and type
      const captureCardInfo = identifyCaptureCard(selectedDevice);

      console.log('\n--- Capture Card Information ---');
      console.log(`Name: ${captureCardInfo.name}`);
      console.log(`Type: ${captureCardInfo.type}`);
      console.log(`Model: ${captureCardInfo.model}`);
      console.log(`Interface: ${captureCardInfo.interface}`);
      console.log(`Is Webcam: ${captureCardInfo.isWebcam}`);
      console.log(`Is Capture Card: ${captureCardInfo.isCapture}`);

      // Get all available options for the device
      console.log('\n--- Getting All Available Options ---');

      // For resolution types, FPS types, and FPS values, we'll use default values
      // since these properties might not be directly accessible via GetInputPropertiesListPropertyItems
      console.log('\n--- Using Default Values ---');
      console.log('Resolution Type (fps_type): "custom"');
      console.log('Scaling Type (res_type): 1');
      console.log('FPS: 60');

      // Initialize these with empty arrays to avoid undefined errors
      const resolutionTypes = [];
      const fpsTypes = [];
      const fpsValues = [];

      // Get video formats
      const videoFormats = await getAvailableVideoFormats(sourceName);
      console.log('\n--- Available Video Formats ---');
      if (videoFormats.length > 0) {
        console.log('Index | Format | Value');
        console.log('------|--------|------');
        videoFormats.forEach((format, index) => {
          console.log(`${index + 1} | ${format.itemName} | ${format.itemValue}`);
        });
        console.log('NV12 format is available:', videoFormats.some(f => f.itemName.includes('NV12')));
      } else {
        console.log('No video formats found or not supported by this device.');
      }

      // Get color spaces
      const colorSpaces = await getAvailableColorSpaces(sourceName);
      console.log('\n--- Available Color Spaces ---');
      if (colorSpaces.length > 0) {
        console.log('Index | Color Space | Value');
        console.log('------|------------|------');
        colorSpaces.forEach((space, index) => {
          console.log(`${index + 1} | ${space.itemName} | ${space.itemValue}`);
        });
        console.log('Rec. 709 color space is available:', colorSpaces.some(cs => cs.itemName.includes('709')));
      } else {
        console.log('No color spaces found or not supported by this device.');
      }

      // Get color ranges
      const colorRanges = await getAvailableColorRanges(sourceName);
      console.log('\n--- Available Color Ranges ---');
      if (colorRanges.length > 0) {
        console.log('Index | Color Range | Value');
        console.log('------|------------|------');
        colorRanges.forEach((range, index) => {
          console.log(`${index + 1} | ${range.itemName} | ${range.itemValue}`);
        });
        console.log('Limited color range is available:', colorRanges.some(cr => cr.itemName.toLowerCase().includes('limited')));
      } else {
        console.log('No color ranges found or not supported by this device.');
      }

      // Step 1: Select device model (already done above)
      console.log(`\nSelected device: ${selectedDevice.itemName}`);

      // Initialize settings object with device ID
      const optimizedSettings = {
        video_device_id: selectedDevice.itemValue,
        last_video_device_id: selectedDevice.itemValue
      };

      // Add additional settings based on device type
      if (captureCardInfo.isWebcam || captureCardInfo.isCapture) {
        // Settings that benefit both webcams and capture cards
        optimizedSettings.deactivate_when_not_showing = false;

        // Webcams often benefit from buffering, capture cards don't
        optimizedSettings.buffering = captureCardInfo.isWebcam;
      }

      // Step 6: Get available resolutions for the selected device
      console.log('\n--- Getting Available Resolutions ---');

      try {
        const resolutionResponse = await obs.call('GetInputPropertiesListPropertyItems', {
          inputName: sourceName,
          propertyName: 'resolution'
        });

        const resolutions = resolutionResponse.propertyItems || [];

        if (resolutions.length === 0) {
          console.log('No resolutions found for the selected device. Using default resolution.');
          // Set default resolution
          const selectedResolution = '1280x720';
          console.log(`Using default resolution: ${selectedResolution}`);

          // Now we'll set all parameters in the correct order according to your specification
          console.log('\n--- Setting Parameters in Order ---');

          // Initialize optimizedSettings with device ID
          const optimizedSettings = {
            video_device_id: selectedDevice.itemValue,
            last_video_device_id: selectedDevice.itemValue
          };

          // Step 2: Set resolution type (fps_type: custom)
          optimizedSettings.fps_type = 'custom';
          console.log(`2. Set fps_type: ${optimizedSettings.fps_type}`);

          // Step 3: Set resolution
          optimizedSettings.resolution = selectedResolution;
          optimizedSettings.last_resolution = selectedResolution;
          console.log(`3. Set resolution: ${selectedResolution}`);

          // Step 4: Set scaling type (res_type: 1)
          optimizedSettings.res_type = 1;
          console.log(`4. Set res_type: ${optimizedSettings.res_type}`);

          // Step 5: Set FPS
          optimizedSettings.fps_matching = false;
          optimizedSettings.fps_num = 60;
          optimizedSettings.fps_den = 1;
          console.log(`5. Set FPS: ${optimizedSettings.fps_num}`);

          // Step 6: Set video format - using numeric value
          optimizedSettings.video_format = 201;  // NV12
          console.log(`6. Set video_format: ${optimizedSettings.video_format}`);

          // Step 7: Set color space
          optimizedSettings.color_space = '709';
          console.log(`7. Set color_space: ${optimizedSettings.color_space}`);

          // Step 8: Set color range
          optimizedSettings.color_range = 'partial';
          console.log(`8. Set color_range: ${optimizedSettings.color_range}`);

          // Now apply all settings at once
          await obs.call('SetInputSettings', {
            inputName: sourceName,
            inputSettings: optimizedSettings
          });

          console.log(`Set device to: ${selectedDevice.itemName} with optimized settings`);

          // Display the optimized settings in the order they were applied
          console.log('\n--- Optimized Settings Applied (in order) ---');
          console.log(`1. Device Model: ${selectedDevice.itemName} (Value: ${selectedDevice.itemValue})`);
          console.log(`2. Resolution Type (fps_type): ${optimizedSettings.fps_type || 'Default'}`);
          console.log(`3. Resolution: ${optimizedSettings.resolution || 'Default'}`);
          console.log(`   Last Resolution: ${optimizedSettings.last_resolution || 'Default'}`);
          console.log(`4. Scaling Type (res_type): ${optimizedSettings.res_type}`);
          console.log(`5. FPS: ${optimizedSettings.fps_matching ? 'Match Output FPS' : optimizedSettings.fps_num}/${optimizedSettings.fps_den}`);
          console.log(`6. Video Format: ${optimizedSettings.video_format} (NV12)`);
          console.log(`7. Color Space: ${optimizedSettings.color_space || 'Default'} (Rec. 709)`);
          console.log(`8. Color Range: ${optimizedSettings.color_range || 'Default'} (Limited/Partial)`);

          // Display the actual parameter names and values that will be sent to OBS
          console.log('\n--- Actual OBS Parameters ---');
          const parameterNames = [
            'video_device_id', 'last_video_device_id',
            'fps_type', 'resolution', 'last_resolution', 'res_type',
            'fps_matching', 'fps_num', 'fps_den',
            'video_format', 'color_space', 'color_range'
          ];

          parameterNames.forEach(param => {
            if (optimizedSettings[param] !== undefined) {
              console.log(`${param}: ${JSON.stringify(optimizedSettings[param])}`);
            }
          });

          // Log all settings for debugging
          console.log('\nFull optimized settings:');
          console.log(JSON.stringify(optimizedSettings, null, 2));

          // Get the current settings to verify our changes
          const { inputSettings } = await obs.call('GetInputSettings', {
            inputName: sourceName
          });

          console.log('\n--- Current Video Capture Device Settings (After Changes) ---');
          console.log(JSON.stringify(inputSettings, null, 2));

        } else {
          console.log(`Found ${resolutions.length} available resolutions:`);

          // Create a table to display the resolutions
          console.log('\n--- Available Resolutions ---');
          console.log('Index | Resolution');
          console.log('-----|------------');

          resolutions.forEach((resolution, index) => {
            console.log(`${index + 1} | ${resolution.itemName}`);
          });

          // Select resolution based on the Python implementation logic
          // Check for preferred resolutions in exact order specified
          const resolutionsStr = JSON.stringify(resolutions);
          let selectedResolution;

          // Define the priority order exactly as in the Python code
          const priorityResolutions = [
            '2560x1440',
            '1920x1080',
            '1280x720',
            '1280x960',
            '960x540',
            '640x360',
            '1080x1920',
            '720x1280',
            '540x960'
          ];

          // Try each resolution in order
          selectedResolution = null;
          for (const resolution of priorityResolutions) {
            if (resolutionsStr.includes(resolution)) {
              selectedResolution = resolutions.find(res => res.itemName.includes(resolution)).itemName;
              console.log(`Found priority resolution: ${resolution}`);
              break;
            }
          }

          // If no priority resolution found, default to the first available
          if (!selectedResolution && resolutions.length > 0) {
            selectedResolution = resolutions[0].itemName;
            console.log(`No priority resolution found, using first available: ${selectedResolution}`);
          }

          console.log(`\nSelected resolution: ${selectedResolution}`);
        }
      } catch (error) {
        console.error(`Error getting resolutions: ${error.message}`);
        console.log('Using default resolution: 1280x720');

        // Set default resolution
        const selectedResolution = '1280x720';

        // Now we'll set all parameters in the correct order according to your specification
        console.log('\n--- Setting Parameters in Order ---');

        // Initialize optimizedSettings with device ID
        const optimizedSettings = {
          video_device_id: selectedDevice.itemValue,
          last_video_device_id: selectedDevice.itemValue
        };

        // Step 2: Set resolution type (fps_type: custom)
        optimizedSettings.fps_type = 'custom';
        console.log(`2. Set fps_type: ${optimizedSettings.fps_type}`);

        // Step 3: Set resolution
        optimizedSettings.resolution = selectedResolution;
        optimizedSettings.last_resolution = selectedResolution;
        console.log(`3. Set resolution: ${selectedResolution}`);

        // Step 4: Set scaling type (res_type: 1)
        optimizedSettings.res_type = 1;
        console.log(`4. Set res_type: ${optimizedSettings.res_type}`);

        // Step 5: Set FPS
        optimizedSettings.fps_matching = false;
        optimizedSettings.fps_num = 60;
        optimizedSettings.fps_den = 1;
        console.log(`5. Set FPS: ${optimizedSettings.fps_num}`);

        // Step 6: Set video format - using numeric value
        optimizedSettings.video_format = 201;  // NV12
        console.log(`6. Set video_format: ${optimizedSettings.video_format}`);

        // Step 7: Set color space
        optimizedSettings.color_space = '709';
        console.log(`7. Set color_space: ${optimizedSettings.color_space}`);

        // Step 8: Set color range
        optimizedSettings.color_range = 'partial';
        console.log(`8. Set color_range: ${optimizedSettings.color_range}`);

        // Now apply all settings at once
        await obs.call('SetInputSettings', {
          inputName: sourceName,
          inputSettings: optimizedSettings
        });

        console.log(`Set device to: ${selectedDevice.itemName} with optimized settings`);

        // Display the optimized settings in the order they were applied
        console.log('\n--- Optimized Settings Applied (in order) ---');
        console.log(`1. Device Model: ${selectedDevice.itemName} (Value: ${selectedDevice.itemValue})`);
        console.log(`2. Resolution Type (fps_type): ${optimizedSettings.fps_type || 'Default'}`);
        console.log(`3. Resolution: ${optimizedSettings.resolution || 'Default'}`);
        console.log(`   Last Resolution: ${optimizedSettings.last_resolution || 'Default'}`);
        console.log(`4. Scaling Type (res_type): ${optimizedSettings.res_type}`);
        console.log(`5. FPS: ${optimizedSettings.fps_matching ? 'Match Output FPS' : optimizedSettings.fps_num}/${optimizedSettings.fps_den}`);
        console.log(`6. Video Format: ${optimizedSettings.video_format} (NV12)`);
        console.log(`7. Color Space: ${optimizedSettings.color_space || 'Default'} (Rec. 709)`);
        console.log(`8. Color Range: ${optimizedSettings.color_range || 'Default'} (Limited/Partial)`);

        // Display the actual parameter names and values that will be sent to OBS
        console.log('\n--- Actual OBS Parameters ---');
        const parameterNames = [
          'video_device_id', 'last_video_device_id',
          'fps_type', 'resolution', 'last_resolution', 'res_type',
          'fps_matching', 'fps_num', 'fps_den',
          'video_format', 'color_space', 'color_range'
        ];

        parameterNames.forEach(param => {
          if (optimizedSettings[param] !== undefined) {
            console.log(`${param}: ${JSON.stringify(optimizedSettings[param])}`);
          }
        });

        // Log all settings for debugging
        console.log('\nFull optimized settings:');
        console.log(JSON.stringify(optimizedSettings, null, 2));

        // Get the current settings to verify our changes
        const { inputSettings } = await obs.call('GetInputSettings', {
          inputName: sourceName
        });

        console.log('\n--- Current Video Capture Device Settings (After Changes) ---');
        console.log(JSON.stringify(inputSettings, null, 2));
      }

      // We've already displayed all available options above

      // Get the current settings to verify our changes
      try {
        // Step 9: Get the current settings of the source to verify our changes
        const { inputSettings } = await obs.call('GetInputSettings', {
          inputName: sourceName
        });

        console.log('\n--- Current Video Capture Device Settings (After Changes) ---');
        console.log(JSON.stringify(inputSettings, null, 2));
      } catch (error) {
        console.error(`Error getting current settings: ${error.message}`);
      }
    }

    // Step 10: Apply filters to the video capture device
    console.log('\n--- Applying Filters to Video Capture Device ---');

    // Use the width and height parameters that were passed in
    // These dimensions are already known from the device model's resolution
    console.log(`Using device model resolution: ${width}x${height}`);

    // Apply filters
    try {
      const filtersResult = await addFiltersToVideoCaptureDevice({
        source_name: sourceName,
        width,
        height,
        obs
      });

      console.log(`Filters applied: ${filtersResult.success ? 'Successfully' : 'Failed'}`);

      // Return success result with device information
      return {
        success: true,
        sourceName,
        width,
        height,
        filtersApplied: filtersResult.success,
        message: 'Video capture device configured successfully with filters'
      };
    } catch (error) {
      console.error(`Error applying filters: ${error.message}`);

      // Return success for device setup but note filter failure
      return {
        success: true,
        sourceName,
        width,
        height,
        filtersApplied: false,
        message: 'Video capture device configured successfully, but filters could not be applied'
      };
    }
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
      message: 'Failed to configure video capture device'
    };
  }
  // We don't disconnect here since the client is managed by the caller
}

/**
 * Simple function to add a video capture device with default settings and apply filters
 * @param {number} width - Width of the device resolution (optional)
 * @param {number} height - Height of the device resolution (optional)
 * @param {Object} obs - OBS WebSocket client (required)
 * @returns {Promise<Object>} Result of the operation including filter application status
 */
async function addDefaultVideoCaptureDevice(width = 1920, height = 1080, obs) {
  if (!obs) {
    throw new Error('OBS WebSocket client is required. Please provide an OBS WebSocket client instance.');
  }
  return manageVideoCaptureDevice({ width, height, obs });
}

// Export functions
export {
  manageVideoCaptureDevice,
  addDefaultVideoCaptureDevice,
  getVideoCaptureInputKind,
  identifyCaptureCard,
  DEFAULT_SOURCE_NAME
};
