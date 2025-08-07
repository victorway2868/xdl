/**
 * OBS Encoder Configuration Module
 *
 * This module provides functions to configure different encoder settings
 * and save them to the OBS streamEncoder.json file.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';


// Convert callback functions to Promises
const fsWriteFile = promisify(fs.writeFile);
const fsExists = promisify(fs.exists);
const fsMkdir = promisify(fs.mkdir);

/**
 * Get OBS configuration directory path
 * @returns {string} Path to OBS configuration directory
 */
function getstreamEncoderPath(profileName) {
  // Possible locations for OBS configuration files
  const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appDataPath, 'obs-studio','basic','profiles',profileName,'streamEncoder.json');
}

/**
 * Configure OBS encoder settings and save to streamEncoder.json
 * @param {Object} encoderConfig - Encoder configuration
 * @param {string} profileName - OBS profile name (optional)
 * @returns {Promise<Object>} Result of the operation
 */
async function configureEncoder(encoderName, profileName = null) {
  try {
    console.log('Configuring OBS encoder settings...');
    console.log('Encoder name:', encoderName);

    let encoderConfig = {
      bitrate: 18000,
      keyint_sec: 2,
      preset: 'medium',
      profile:"high"
    }
    if(encoderName === 'jim_nvenc'){
      encoderConfig = {
        bitrate: 20000,
        keyint_sec: 2,
        preset: 'p7',
        profile:"high"
      }
    }
    else if(encoderName === 'amd_amf_h264'){
      encoderConfig = {
        bitrate: 20000,
        keyint_sec: 2,
        quality: 'quality',
        profile:"high"
      }
    }
    else if(encoderName === 'obs_qsv11_v2'){
      encoderConfig = {
        bitrate: 18000,
        keyint_sec: 2,
        target_usage: 'TU1',
      }
    }


    console.log('Encoder configuration:', encoderConfig);

    // Create profile directory path
    const streamEncoderPath = getstreamEncoderPath(profileName)
    // Write encoder settings to file
    await fsWriteFile(streamEncoderPath, JSON.stringify(encoderConfig, null, 2));
    console.log(`Encoder settings written to: ${streamEncoderPath}`);

    return {
      success: true,
      message: `Encoder settings configured successfully for profile: ${profileName}`,
      profileName: profileName,
      encoderName: encoderConfig.encoder || encoderName
    };
  } catch (error) {
    console.error('Error configuring encoder settings:', error);
    return {
      success: false,
      message: `Error configuring encoder settings: ${error.message}`
    };
  }
}


// Export functions
export {
  configureEncoder,
  getstreamEncoderPath
};
