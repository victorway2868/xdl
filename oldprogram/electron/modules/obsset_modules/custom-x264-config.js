/**
 * OBS WebSocket - Custom x264 Configuration
 *
 * This script configures OBS with x264 encoder and custom settings
 * based on user-provided parameters.
 */

// Import the OBS WebSocket library
import OBSWebSocket from 'obs-websocket-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Create a new instance of the OBS WebSocket client
const obs = new OBSWebSocket();

// Connection parameters - adjust these as needed
const connectionParams = {
  address: 'ws://localhost:4455', // Default OBS WebSocket address and port with protocol
  password: 'OwuWIvIyVGFwcL01', // OBS WebSocket password
};

// Resolution variables - adjust these for different resolutions
const baseWidth = 1920;
const baseHeight = 1080;
const heightAdjustmentFactor = 55/1080; // Additional height factor

// Calculate actual dimensions
const actualBaseWidth = baseWidth;
const actualBaseHeight = Math.round(baseHeight * (1 + heightAdjustmentFactor));
const actualOutputWidth = baseWidth;
const actualOutputHeight = Math.round(baseHeight * (1 + heightAdjustmentFactor));

// Custom settings based on user-provided parameters
const customSettings = {
  // Output settings
  outputMode: 'Advanced',

  // Encoder settings
  encoder: 'obs_x264',

  // Rescale settings
  rescale: 'true',
  rescaleRes: `${actualBaseWidth}x${actualBaseHeight}`,
  rescaleFilter: '4', // Lanczos

  // Video settings
  baseCX: String(actualBaseWidth),
  baseCY: String(actualBaseHeight),
  outputCX: String(actualOutputWidth),
  outputCY: String(actualOutputHeight),
  scaleType: 'bilinear',
  FPSType: '1',
  FPSInt: '65'
};

// Register event handlers
obs.on('ConnectionOpened', () => {
  console.log('Event: Connection to OBS WebSocket server opened');
});

obs.on('ConnectionClosed', () => {
  console.log('Event: Connection to OBS WebSocket server closed');
});

obs.on('ConnectionError', (error) => {
  console.error('Event: Connection error:', error);
});

/**
 * Find OBS configuration directory
 * @returns {string|null} Path to OBS configuration directory
 */
function findOBSConfigDir() {
  // Possible locations for OBS configuration files
  const possibleLocations = [
    // Windows
    path.join(os.homedir(), 'AppData', 'Roaming', 'obs-studio'),
    // macOS
    path.join(os.homedir(), 'Library', 'Application Support', 'obs-studio'),
    // Linux
    path.join(os.homedir(), '.config', 'obs-studio')
  ];

  // Find the first existing directory
  for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
      console.log(`Found OBS configuration directory: ${location}`);
      return location;
    }
  }

  console.log('Could not find OBS configuration directory');
  return null;
}

/**
 * Get current OBS profile name
 * @param {string} configDir - Path to OBS configuration directory
 * @returns {string} Current profile name
 */
function getCurrentProfile(configDir) {
  let currentProfile = 'aaaa';
  const globalIniPath = path.join(configDir, 'global.ini');

  if (fs.existsSync(globalIniPath)) {
    try {
      const globalIniContent = fs.readFileSync(globalIniPath, 'utf8');
      const profileMatch = globalIniContent.match(/CurrentProfile=(.+)/);
      if (profileMatch && profileMatch[1]) {
        currentProfile = profileMatch[1].trim();
      }
    } catch (error) {
      console.error('Error reading global.ini:', error);
    }
  }

  console.log(`Current profile: ${currentProfile}`);
  return currentProfile;
}

/**
 * Configure OBS settings using both WebSocket and direct file modification
 */
async function configureOBSSettings() {
  try {
    console.log('Connecting to OBS WebSocket...');

    // Connect to OBS WebSocket with timeout
    const connectPromise = obs.connect(connectionParams.address, connectionParams.password);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
    });
    await Promise.race([connectPromise, timeoutPromise]);

    console.log('Successfully connected to OBS WebSocket!');

    try {
      // Get OBS version
      const { obsVersion } = await obs.call('GetVersion');
      console.log(`OBS Studio Version: ${obsVersion}`);

      // Step 1: Configure basic.ini parameters using WebSocket
      console.log('\n1. Configuring basic.ini parameters...');

      // Set output mode to Advanced
      await obs.call('SetProfileParameter', {
        parameterCategory: 'Output',
        parameterName: 'Mode',
        parameterValue: customSettings.outputMode
      });

      // Set rescale settings
      await obs.call('SetProfileParameter', {
        parameterCategory: 'AdvOut',
        parameterName: 'Rescale',
        parameterValue: customSettings.rescale
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'AdvOut',
        parameterName: 'RescaleFilter',
        parameterValue: customSettings.rescaleFilter
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'AdvOut',
        parameterName: 'RescaleRes',
        parameterValue: customSettings.rescaleRes
      });

      // Set video settings
      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'BaseCX',
        parameterValue: customSettings.baseCX
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'BaseCY',
        parameterValue: customSettings.baseCY
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'OutputCX',
        parameterValue: customSettings.outputCX
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'OutputCY',
        parameterValue: customSettings.outputCY
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'ScaleType',
        parameterValue: customSettings.scaleType
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'FPSType',
        parameterValue: customSettings.FPSType
      });

      await obs.call('SetProfileParameter', {
        parameterCategory: 'Video',
        parameterName: 'FPSInt',
        parameterValue: customSettings.FPSInt
      });

      // Set encoder to x264
      await obs.call('SetProfileParameter', {
        parameterCategory: 'AdvOut',
        parameterName: 'Encoder',
        parameterValue: customSettings.encoder
      });

      console.log('✓ Basic parameters configured via WebSocket');

      // Step 2: Find OBS configuration directory and current profile
      console.log('\n2. Finding OBS configuration files...');
      const configDir = findOBSConfigDir();
      if (!configDir) {
        console.error('Could not find OBS configuration directory');
        return;
      }

      const currentProfile = getCurrentProfile(configDir);
      const streamEncoderPath = path.join(configDir, 'basic', 'profiles', currentProfile, 'streamEncoder.json');

      // Step 3: Create or modify streamEncoder.json
      console.log('\n3. Configuring encoder settings in streamEncoder.json...');

      // Define x264 encoder settings
      const x264Settings = {
        "streaming": {
          "encoder": "obs_x264",
          "rate_control": "CBR",
          "bitrate": 6000,
          "preset": "medium",
          "profile": "high",
          "tune": "film",
          "x264opts": "merange=32:ref=16:bframes=16:b-adapt=2:direct=auto:me=tesa:subme=11:trellis=2:rc-lookahead=60"
        }
      };

      // Write settings to file
      fs.writeFileSync(streamEncoderPath, JSON.stringify(x264Settings, null, 2));
      console.log(`✓ Encoder settings written to: ${streamEncoderPath}`);

      console.log('\nAll settings have been applied!');
      console.log('\nSummary of applied settings:');
      console.log(`- Output Mode: ${customSettings.outputMode}`);
      console.log(`- Encoder: ${customSettings.encoder}`);
      console.log(`- Rescale: ${customSettings.rescale === 'true' ? 'Enabled' : 'Disabled'} with Lanczos filter at ${customSettings.rescaleRes}`);
      console.log(`- Base Resolution: ${actualBaseWidth}x${actualBaseHeight} (${baseWidth}x${baseHeight} with ${heightAdjustmentFactor.toFixed(5)} height adjustment)`);
      console.log(`- Output Resolution: ${actualOutputWidth}x${actualOutputHeight} (${baseWidth}x${baseHeight} with ${heightAdjustmentFactor.toFixed(5)} height adjustment)`);
      console.log(`- Scale Type: ${customSettings.scaleType}`);
      console.log(`- FPS: ${customSettings.FPSInt}`);
      console.log('- x264 Settings: CBR at 6000 kbps, medium preset, high profile, film tune');

      console.log('\nPlease restart OBS to ensure all settings are applied correctly.');

    } catch (error) {
      console.error('Error configuring OBS settings:', error);
    } finally {
      // Disconnect from OBS WebSocket
      obs.disconnect();
    }
  } catch (error) {
    console.error('Connection error:', error);
  }
}

// Run the configuration
configureOBSSettings();
