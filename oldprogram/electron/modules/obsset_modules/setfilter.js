/**
 * OBS WebSocket - Add Scale/Aspect Ratio and Crop Filters to Video Capture Device
 *
 * This module provides functions to add filters to a video capture device source in OBS:
 * 1. Scale/Aspect Ratio filter - Adjusts the resolution based on aspect ratio
 * 2. Crop/Pad filter - Crops the image to maintain 16:9 aspect ratio
 * 3. Color Correction filter - Enhances image quality with brightness, contrast, etc.
 * 4. LUT filter - Applies a color lookup table for consistent color grading
 * 5. Sharpness filter - Improves image clarity
 *
 * The module requires an OBS WebSocket client to be provided by the caller.
 */

// Import required modules
import os from 'os';
import path from 'path';
import { app } from 'electron';
import OBSWebSocket from 'obs-websocket-js';

/**
 * Get the correct path for LUT file based on environment
 * @returns {string} The absolute path to the original.cube file
 */
function getLUTFilePath() {
  try {
    let lutPath;

    if (app.isPackaged) {
      // Production environment: use process.resourcesPath
      lutPath = path.join(process.resourcesPath, 'public', 'images', 'original.cube');
    } else {
      // Development environment: use relative path from current module
      // Get the current file's directory using import.meta.url
      const currentFileUrl = new URL(import.meta.url);
      let currentDir = path.dirname(currentFileUrl.pathname);

      // Fix Windows path issue - remove leading slash on Windows
      if (process.platform === 'win32' && currentDir.startsWith('/')) {
        currentDir = currentDir.substring(1);
      }

      // Navigate to project root and then to the LUT file
      lutPath = path.join(currentDir, '..', '..', '..', 'public', 'images', 'original.cube');

      // Normalize the path to resolve any .. segments
      lutPath = path.resolve(lutPath);
    }

    console.log(`LUT file path resolved to: ${lutPath}`);
    return lutPath;
  } catch (error) {
    console.error('Error resolving LUT file path:', error);
    // Fallback to relative path
    return './public/images/original.cube';
  }
}

/**
 * Default filter names and settings
 */
const DEFAULT_FILTERS = {
  // Source name for the video capture device
  sourceName: '视频采集设备', // "Video Capture Device" in Chinese

  // Scale filter
  scaleFilterName: '缩放/宽高比', // "Scale/Aspect Ratio" in Chinese
  scaleFilterKind: 'scale_filter', // Filter kind for Scale/Aspect Ratio

  // Crop filter
  cropFilterName: '裁剪/填充', // "Crop/Pad" in Chinese
  cropFilterKind: 'crop_filter', // Filter kind for Crop/Pad

  // Color correction filter
  colorFilterName: '色彩校正', // "Color Correction" in Chinese
  colorFilterKind: 'color_filter_v2', // Filter kind for Color Correction
  colorFilterSettings: {
    brightness: 0.0000,
    contrast: 0.20,
    gamma: -0.13,
    hue_shift: 0.00,
    saturation: 0.30
  },

  // LUT filter
  lutFilterName: '应用 LUT', // "Apply LUT" in Chinese
  lutFilterKind: 'clut_filter', // Filter kind for Apply LUT
  lutFilterSettings: {
    image_path: getLUTFilePath()
  },

  // Sharpness filter
  sharpnessFilterName: '锐化', // "Sharpness" in Chinese
  sharpnessFilterKind: 'sharpness_filter_v2', // Filter kind for Sharpness
  sharpnessFilterSettings: {
    sharpness: 0.16
  }
};

/**
 * Get the appropriate input kind for video capture devices based on OS
 * @returns {string} The input kind for video capture devices
 */
function getVideoCaptureInputKind() {
  const platform = os.platform();
  if (platform === 'win32') {
    return 'dshow_input';
  } else if (platform === 'darwin') {
    return 'avfoundation_input';
  } else {
    return 'v4l2_input'; // Linux
  }
}

/**
 * Ensure a number is even, if odd add 1 to make it even
 * @param {number} value - The value to make even
 * @returns {number} Even number
 */
function ensureEven(value) {
  return value % 2 === 0 ? value : value + 1;
}

/**
 * Calculate scaling and cropping values based on aspect ratio
 * @param {number} width - The width of the source
 * @param {number} height - The height of the source
 * @returns {Object} Object containing scaling and cropping values
 */
function calculateScalingAndCropping(width, height) {
  // Calculate aspect ratio
  const aspectRatio = width / height;
  const standardRatio = 16 / 9; // 16:9 aspect ratio

  console.log(`Device resolution: ${width}x${height}`);
  console.log(`Device aspect ratio: ${aspectRatio.toFixed(3)}`);
  console.log(`Standard aspect ratio (16:9): ${standardRatio.toFixed(3)}`);

  let scaleWidth, scaleHeight, cropLeft, cropRight, cropTop, cropBottom;

  // Determine scaling based on aspect ratio comparison
  if (aspectRatio > standardRatio) {
    // If wider than 16:9, scale based on width
    console.log('Device is wider than 16:9, scaling based on width');
    scaleWidth = ensureEven(width);
    scaleHeight = ensureEven(Math.round(width / standardRatio));

    // Calculate crop values (crop top and bottom)
    cropLeft = 0;
    cropRight = 0;
    const cropVertical = Math.round((scaleHeight - height) / 2);
    cropTop = cropVertical;
    cropBottom = cropVertical;
  } else {
    // If narrower than or equal to 16:9, scale based on height
    console.log('Device is narrower than or equal to 16:9, scaling based on height');
    scaleHeight = ensureEven(height);
    scaleWidth = ensureEven(Math.round(height * standardRatio));

    // Calculate crop values (crop left and right)
    cropTop = 0;
    cropBottom = 0;
    const cropHorizontal = Math.round((scaleWidth - width) / 2);
    cropLeft = cropHorizontal;
    cropRight = cropHorizontal;
  }

  console.log(`Scale resolution: ${scaleWidth}x${scaleHeight}`);
  console.log(`Crop values: Left=${cropLeft}, Right=${cropRight}, Top=${cropTop}, Bottom=${cropBottom}`);

  return {
    scaleWidth,
    scaleHeight,
    cropLeft,
    cropRight,
    cropTop,
    cropBottom
  };
}

/**
 * Add or update a Scale/Aspect Ratio filter to a source
 * @param {string} sourceName - The name of the source
 * @param {string} filterName - The name of the filter
 * @param {number} width - The width of the source
 * @param {number} height - The height of the source
 * @param {Object} obs - OBS WebSocket client
 * @returns {Promise<void>}
 */
async function addScaleFilter(sourceName, filterName, width, height, obs) {
  try {
    // Calculate scaling values
    const { scaleWidth, scaleHeight } = calculateScalingAndCropping(width, height);

    // Check if the filter already exists
    const { filters } = await obs.call('GetSourceFilterList', {
      sourceName: sourceName
    });

    const existingFilter = filters.find(filter => filter.filterName === filterName);

    if (existingFilter) {
      // Update existing filter
      console.log(`Updating existing filter: ${filterName}`);
      await obs.call('SetSourceFilterSettings', {
        sourceName: sourceName,
        filterName: filterName,
        filterSettings: {
          resolution: `${scaleWidth}x${scaleHeight}`
        }
      });
    } else {
      // Create Scale filter
      console.log(`Creating new filter: ${filterName}`);
      await obs.call('CreateSourceFilter', {
        sourceName: sourceName,
        filterName: filterName,
        filterKind: DEFAULT_FILTERS.scaleFilterKind,
        filterSettings: {
          resolution: `${scaleWidth}x${scaleHeight}`
        }
      });
    }

    console.log(`Successfully applied ${filterName} filter to ${sourceName}`);
  } catch (error) {
    console.error(`Error adding/updating scale filter:`, error);
  }
}

/**
 * Add or update a Crop/Pad filter to a source
 * @param {string} sourceName - The name of the source
 * @param {string} filterName - The name of the filter
 * @param {number} width - The width of the source
 * @param {number} height - The height of the source
 * @param {Object} obs - OBS WebSocket client
 * @returns {Promise<void>}
 */
async function addCropFilter(sourceName, filterName, width, height, obs) {
  try {
    // Calculate crop values
    const { cropLeft, cropRight, cropTop, cropBottom } = calculateScalingAndCropping(width, height);

    // Check if the filter already exists
    const { filters } = await obs.call('GetSourceFilterList', {
      sourceName: sourceName
    });

    const existingFilter = filters.find(filter => filter.filterName === filterName);

    if (existingFilter) {
      // Update existing filter
      console.log(`Updating existing filter: ${filterName}`);
      await obs.call('SetSourceFilterSettings', {
        sourceName: sourceName,
        filterName: filterName,
        filterSettings: {
          left: cropLeft,
          right: cropRight,
          top: cropTop,
          bottom: cropBottom
        }
      });
    } else {
      // Create Crop filter
      console.log(`Creating new filter: ${filterName}`);
      await obs.call('CreateSourceFilter', {
        sourceName: sourceName,
        filterName: filterName,
        filterKind: DEFAULT_FILTERS.cropFilterKind,
        filterSettings: {
          left: cropLeft,
          right: cropRight,
          top: cropTop,
          bottom: cropBottom
        }
      });
    }

    console.log(`Successfully applied ${filterName} filter to ${sourceName}`);
  } catch (error) {
    console.error(`Error adding/updating crop filter:`, error);
  }
}

/**
 * Add or update a Color Correction filter to a source
 * @param {string} sourceName - The name of the source
 * @param {string} filterName - The name of the filter
 * @param {Object} filterSettings - Color correction filter settings
 * @param {Object} obs - OBS WebSocket client
 * @returns {Promise<void>}
 */
async function addColorCorrectionFilter(sourceName, filterName, filterSettings, obs) {
  try {
    // Check if the filter already exists
    const { filters } = await obs.call('GetSourceFilterList', {
      sourceName: sourceName
    });

    const existingFilter = filters.find(filter => filter.filterName === filterName);

    if (existingFilter) {
      // Update existing filter
      console.log(`Updating existing filter: ${filterName}`);
      await obs.call('SetSourceFilterSettings', {
        sourceName: sourceName,
        filterName: filterName,
        filterSettings: filterSettings
      });
    } else {
      // Create Color Correction filter
      console.log(`Creating new filter: ${filterName}`);
      await obs.call('CreateSourceFilter', {
        sourceName: sourceName,
        filterName: filterName,
        filterKind: DEFAULT_FILTERS.colorFilterKind,
        filterSettings: filterSettings
      });
    }

    console.log(`Successfully applied ${filterName} filter to ${sourceName}`);
  } catch (error) {
    console.error(`Error adding/updating color correction filter:`, error);
  }
}

/**
 * Add or update a LUT filter to a source
 * @param {string} sourceName - The name of the source
 * @param {string} filterName - The name of the filter
 * @param {Object} filterSettings - LUT filter settings
 * @param {Object} obs - OBS WebSocket client
 * @returns {Promise<void>}
 */
async function addLUTFilter(sourceName, filterName, filterSettings, obs) {
  try {
    // Check if the filter already exists
    const { filters } = await obs.call('GetSourceFilterList', {
      sourceName: sourceName
    });

    const existingFilter = filters.find(filter => filter.filterName === filterName);

    if (existingFilter) {
      // Update existing filter
      console.log(`Updating existing filter: ${filterName}`);
      await obs.call('SetSourceFilterSettings', {
        sourceName: sourceName,
        filterName: filterName,
        filterSettings: filterSettings
      });
    } else {
      // Create LUT filter
      console.log(`Creating new filter: ${filterName}`);
      await obs.call('CreateSourceFilter', {
        sourceName: sourceName,
        filterName: filterName,
        filterKind: DEFAULT_FILTERS.lutFilterKind,
        filterSettings: filterSettings
      });
    }

    console.log(`Successfully applied ${filterName} filter to ${sourceName}`);
  } catch (error) {
    console.error(`Error adding/updating LUT filter:`, error);
  }
}

/**
 * Add or update a Sharpness filter to a source
 * @param {string} sourceName - The name of the source
 * @param {string} filterName - The name of the filter
 * @param {Object} filterSettings - Sharpness filter settings
 * @param {Object} obs - OBS WebSocket client
 * @returns {Promise<void>}
 */
async function addSharpnessFilter(sourceName, filterName, filterSettings, obs) {
  try {
    // Check if the filter already exists
    const { filters } = await obs.call('GetSourceFilterList', {
      sourceName: sourceName
    });

    const existingFilter = filters.find(filter => filter.filterName === filterName);

    if (existingFilter) {
      // Update existing filter
      console.log(`Updating existing filter: ${filterName}`);
      await obs.call('SetSourceFilterSettings', {
        sourceName: sourceName,
        filterName: filterName,
        filterSettings: filterSettings
      });
    } else {
      // Create Sharpness filter
      console.log(`Creating new filter: ${filterName}`);
      await obs.call('CreateSourceFilter', {
        sourceName: sourceName,
        filterName: filterName,
        filterKind: DEFAULT_FILTERS.sharpnessFilterKind,
        filterSettings: filterSettings
      });
    }

    console.log(`Successfully applied ${filterName} filter to ${sourceName}`);
  } catch (error) {
    console.error(`Error adding/updating sharpness filter:`, error);
  }
}

/**
 * Simple function to add all default filters to the default video capture device
 * @param {number} width - Width of the device resolution
 * @param {number} height - Height of the device resolution
 * @param {Object} obs - OBS WebSocket client (required)
 * @returns {Promise<Object>} Result of the operation
 */
async function addDefaultFilters(width = 1920, height = 1080, obs) {
  if (!obs) {
    throw new Error('OBS WebSocket client is required. Please provide an OBS WebSocket client instance.');
  }
  return addFiltersToVideoCaptureDevice({ width, height, obs });
}

// Export functions and constants
export {
  DEFAULT_FILTERS,
  getLUTFilePath,
  getVideoCaptureInputKind,
  calculateScalingAndCropping,
  addScaleFilter,
  addCropFilter,
  addColorCorrectionFilter,
  addLUTFilter,
  addSharpnessFilter,
  addFiltersToVideoCaptureDevice,
  addDefaultFilters
};

/**
 * Add all filters to video capture device
 * @param {Object} options - Configuration options
 * @param {string} options.source_name - Name of the video capture device source
 * @param {number} options.width - Width of the device resolution
 * @param {number} options.height - Height of the device resolution
 * @param {Object} options.filters - Filter names and settings (optional)
 * @param {Object} options.obs - OBS WebSocket client (optional)
 * @returns {Promise<Object>} Result of the operation
 */
async function addFiltersToVideoCaptureDevice(options = {}) {
  // Set default options
  const {
    source_name = DEFAULT_FILTERS.sourceName,
    width = 1920, // Default width if not provided
    height = 1080, // Default height if not provided
    filters = DEFAULT_FILTERS,
    obs // OBS WebSocket client must be provided
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

    // Get OBS version
    const { obsVersion } = await obs.call('GetVersion');
    console.log(`OBS Studio Version: ${obsVersion}`);

    // Check if the video capture device source exists
    const { inputs } = await obs.call('GetInputList');
    const videoCaptureInputKind = getVideoCaptureInputKind();

    console.log(`Using input kind for video capture: ${videoCaptureInputKind}`);

    // Find if our source exists
    const existingSource = inputs.find(input =>
      input.inputName === source_name && input.inputKind === videoCaptureInputKind
    );

    if (!existingSource) {
      console.error(`Video capture device source "${source_name}" not found`);
      return {
        success: false,
        error: `Video capture device source "${source_name}" not found`,
        message: 'Failed to apply filters'
      };
    }

    console.log(`Found video capture device source: ${source_name}`);
    console.log(`Using device resolution: ${width}x${height}`);

    // Add or update the scale filter
    await addScaleFilter(
      source_name,
      filters.scaleFilterName,
      width,
      height,
      obs
    );

    // Add or update the crop filter
    await addCropFilter(
      source_name,
      filters.cropFilterName,
      width,
      height,
      obs
    );

    // Add or update the color correction filter
    await addColorCorrectionFilter(
      source_name,
      filters.colorFilterName,
      filters.colorFilterSettings,
      obs
    );

    // Add or update the LUT filter
    await addLUTFilter(
      source_name,
      filters.lutFilterName,
      filters.lutFilterSettings,
      obs
    );

    // Add or update the sharpness filter
    await addSharpnessFilter(
      source_name,
      filters.sharpnessFilterName,
      filters.sharpnessFilterSettings,
      obs
    );

    console.log('All filters applied successfully');

    return {
      success: true,
      source_name,
      width,
      height,
      message: 'All filters applied successfully'
    };
  } catch (error) {
    console.error('Error:', error);

    return {
      success: false,
      error: error.message,
      message: 'Failed to apply filters'
    };
  }
  // We don't disconnect here since the client is managed by the caller
}
