/**
 * OBS Encoder Configuration Script
 * 
 * This script demonstrates how to use the OBS encoder configuration modules
 * to configure different encoders and save settings to specific profiles.
 * 
 * Usage:
 * node configureEncoder.js <encoderType> <profileName>
 * 
 * Example:
 * node configureEncoder.js x264 Xiaomi_14_Pro
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { configureOBSEncoder, saveEncoderConfig } from '../modules/obsEncoderHandlers.js';
import { getOBSConfigDir } from '../modules/obsset_modules/obsEncoderConfig.js';

// Get current file directory path (ES module __dirname alternative)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Encoder presets
const encoderPresets = {
  // x264 presets
  x264: {
    low: {
      bitrate: 3000,
      keyint_sec: 2,
      preset: 'veryfast',
      profile: 'main'
    },
    medium: {
      bitrate: 6000,
      keyint_sec: 2,
      preset: 'medium',
      profile: 'high'
    },
    high: {
      bitrate: 18000,
      keyint_sec: 2,
      preset: 'medium',
      profile: 'high'
    }
  },
  // NVENC presets
  nvenc: {
    low: {
      bitrate: 3000,
      keyint_sec: 2,
      preset: 'p2',
      profile: 'main'
    },
    medium: {
      bitrate: 6000,
      keyint_sec: 2,
      preset: 'p4',
      profile: 'high'
    },
    high: {
      bitrate: 18000,
      keyint_sec: 2,
      preset: 'p6',
      profile: 'high'
    }
  },
  // AMF presets
  amf: {
    low: {
      bitrate: 3000,
      keyint_sec: 2,
      quality: 'speed',
      profile: 'main'
    },
    medium: {
      bitrate: 6000,
      keyint_sec: 2,
      quality: 'balanced',
      profile: 'high'
    },
    high: {
      bitrate: 18000,
      keyint_sec: 2,
      quality: 'quality',
      profile: 'high'
    }
  }
};

/**
 * Main function to configure encoder
 */
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const encoderType = args[0] || 'x264';
    const profileName = args[1] || 'Xiaomi_14_Pro';
    const presetLevel = args[2] || 'high';

    console.log(`Configuring ${encoderType} encoder for profile ${profileName} with ${presetLevel} preset...`);

    // Get encoder settings from presets
    const encoderSettings = encoderPresets[encoderType.toLowerCase()]?.[presetLevel.toLowerCase()];
    
    if (!encoderSettings) {
      console.error(`Error: Invalid encoder type (${encoderType}) or preset level (${presetLevel})`);
      console.log('Available encoder types: x264, nvenc, amf');
      console.log('Available preset levels: low, medium, high');
      process.exit(1);
    }

    // Configure encoder using the module
    const result = await configureOBSEncoder({
      encoderType,
      settings: encoderSettings,
      profileName
    });

    if (result.success) {
      console.log('Encoder configuration successful!');
      console.log(result.message);
    } else {
      console.error('Encoder configuration failed:');
      console.error(result.message);
    }

    // Alternatively, save encoder configuration directly to a specific path
    const obsConfigDir = getOBSConfigDir();
    const profilePath = path.join(obsConfigDir, 'basic', 'profiles', profileName);
    
    // Save encoder configuration directly
    const saveResult = await saveEncoderConfig(encoderSettings, profilePath);
    
    if (saveResult.success) {
      console.log('Encoder configuration saved directly!');
      console.log(saveResult.message);
    } else {
      console.error('Failed to save encoder configuration directly:');
      console.error(saveResult.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();
