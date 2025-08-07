/**
 * OBS x264 Encoder Configuration Script
 * 
 * This script configures OBS x264 encoder settings and saves them to a specific profile's
 * streamEncoder.json file.
 * 
 * Usage:
 * node configureX264.js <profileName> <bitrate> <keyint_sec> <preset> <profile>
 * 
 * Example:
 * node configureX264.js Xiaomi_14_Pro 18000 2 medium high
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// Main function
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Check if enough arguments are provided
    if (args.length < 1) {
      console.error('Error: Not enough arguments');
      console.log('Usage: node configureX264.js <profileName> [bitrate] [keyint_sec] [preset] [profile]');
      process.exit(1);
    }
    
    const profileName = args[0];
    const bitrate = parseInt(args[1] || '18000', 10);
    const keyint_sec = parseInt(args[2] || '2', 10);
    const preset = args[3] || 'medium';
    const profile = args[4] || 'high';
    
    console.log(`Configuring x264 encoder for profile ${profileName}...`);
    console.log(`Settings: bitrate=${bitrate}, keyint_sec=${keyint_sec}, preset=${preset}, profile=${profile}`);
    
    // Create encoder configuration
    const encoderConfig = {
      bitrate,
      keyint_sec,
      preset,
      profile
    };
    
    // Get OBS profile directory
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const obsConfigDir = path.join(appDataPath, 'obs-studio');
    const profileDir = path.join(obsConfigDir, 'basic', 'profiles', profileName);
    
    // Check if profile directory exists
    if (!fs.existsSync(profileDir)) {
      console.log(`Creating profile directory: ${profileDir}`);
      fs.mkdirSync(profileDir, { recursive: true });
    }
    
    // Create streamEncoder.json path
    const streamEncoderPath = path.join(profileDir, 'streamEncoder.json');
    
    // Write encoder settings to file
    fs.writeFileSync(streamEncoderPath, JSON.stringify(encoderConfig, null, 2));
    
    console.log(`Encoder settings written to: ${streamEncoderPath}`);
    console.log('Configuration successful!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();
