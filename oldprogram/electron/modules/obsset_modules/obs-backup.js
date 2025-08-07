/**
 * OBS Configuration Backup Utility
 *
 * This script connects to OBS via WebSocket, gets the current profile and scene collection names,
 * and creates a backup of the OBS configuration files.
 */

// Use ES modules for better compatibility with the project
import OBSWebSocket from 'obs-websocket-js';
import fs from 'fs-extra';
import path from 'path';
import { createWriteStream } from 'fs';
import { createZipArchive } from './utils/zip-utils.js';
import winston from 'winston';
import os from 'os';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'obs-backup.log' })
  ]
});

// Connection parameters
const connectionParams = {
  address: 'ws://localhost:4455',
  password: '', // Will be read from config file if available
};

// OBS Studio paths
const appDataPath = process.env.APPDATA || (process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support')
  : path.join(os.homedir(), '.config'));
const obsStudioPath = path.join(appDataPath, 'obs-studio');
const profilesPath = path.join(obsStudioPath, 'basic', 'profiles');
const scenesPath = path.join(obsStudioPath, 'basic', 'scenes');

/**
 * Read connection parameters from config file
 */
async function readConnectionParams() {
  try {
    const configPath = path.join(__dirname, 'xdlconfig.json');
    if (await fs.pathExists(configPath)) {
      const configData = await fs.readJson(configPath);
      if (configData.ServerPort) {
        connectionParams.address = `ws://localhost:${configData.ServerPort}`;
      }
      if (configData.ServerPassword) {
        connectionParams.password = configData.ServerPassword;
      }
      logger.info('Connection parameters loaded from config file');
    } else {
      logger.warn('Config file not found, using default connection parameters');
    }
  } catch (error) {
    logger.error(`Error reading config file: ${error.message}`);
  }
}

/**
 * Create a backup folder with timestamp
 * @returns {string} Path to the created backup folder
 */
async function createBackupFolder() {
  // Get current date and time for folder name
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

  // Create backup folder on desktop
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const backupFolderName = `obsbackup_${timestamp}`;
  const backupFolderPath = path.join(desktopPath, backupFolderName);

  await fs.ensureDir(backupFolderPath);
  await fs.ensureDir(path.join(backupFolderPath, 'basic', 'profiles'));
  await fs.ensureDir(path.join(backupFolderPath, 'basic', 'scenes'));

  logger.info(`Created backup folder: ${backupFolderPath}`);
  return backupFolderPath;
}

/**
 * Copy OBS configuration files to backup folder
 * @param {string} backupFolderPath - Path to backup folder
 * @param {string} profileName - Name of the profile to backup
 * @param {string} sceneCollectionName - Name of the scene collection to backup
 * @returns {boolean} Success status
 */
async function copyConfigFiles(backupFolderPath, profileName, sceneCollectionName) {
  try {
    // Copy profile
    const profilePath = path.join(profilesPath, profileName);
    const profileBackupPath = path.join(backupFolderPath, 'basic', 'profiles', profileName);

    if (await fs.pathExists(profilePath)) {
      await fs.copy(profilePath, profileBackupPath);
      logger.info(`Copied profile: ${profileName}`);
    } else {
      logger.error(`Profile not found: ${profileName}`);
      return false;
    }

    // Copy scene collection
    const sceneFilePath = path.join(scenesPath, `${sceneCollectionName}.json`);
    const sceneBackupPath = path.join(backupFolderPath, 'basic', 'scenes', `${sceneCollectionName}.json`);

    if (await fs.pathExists(sceneFilePath)) {
      await fs.copy(sceneFilePath, sceneBackupPath);
      logger.info(`Copied scene collection: ${sceneCollectionName}`);

      // Read scene collection to find media files
      const sceneData = await fs.readJson(sceneFilePath);
      await copyMediaFiles(sceneData, backupFolderPath);
    } else {
      logger.error(`Scene collection not found: ${sceneCollectionName}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Error copying config files: ${error.message}`);
    return false;
  }
}

/**
 * Recursively search for file paths in scene data and copy them
 * @param {Object} data - Scene data object
 * @param {string} backupFolderPath - Path to backup folder
 */
async function copyMediaFiles(data, backupFolderPath) {
  const filePaths = [];

  // Recursively search for file paths
  function findFilePaths(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => findFilePaths(item));
    } else {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && fs.existsSync(value) && fs.statSync(value).isFile()) {
          filePaths.push(value);
        } else if (typeof value === 'object') {
          findFilePaths(value);
        }
      }
    }
  }

  findFilePaths(data);

  // Copy found files
  for (const filePath of filePaths) {
    try {
      const fileName = path.basename(filePath);
      const destPath = path.join(backupFolderPath, fileName);
      await fs.copy(filePath, destPath);
      logger.info(`Copied media file: ${fileName}`);
    } catch (error) {
      logger.warn(`Failed to copy file ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Upload backup file to cloud server
 * @param {string} filePath - Path to the backup file
 * @returns {Promise<boolean>} Upload success status
 */
async function uploadBackupFile(filePath) {
  try {
    logger.info(`Starting upload of backup file: ${filePath}`);

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      logger.error(`Backup file not found: ${filePath}`);
      return false;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('description', 'OBS Configuration Backup');
    formData.append('is_public', 'false');
    formData.append('upload_to_cloud', 'true');

    // Upload to server
    const response = await fetch('http://117.72.82.170:10272/api/v1/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'accept': 'application/json'
      }
    });

    if (response.ok) {
      logger.info('Backup file uploaded successfully to cloud');
      console.log('\nBackup file uploaded successfully to cloud!');

      try {
        const responseData = await response.json();
        if (responseData && responseData.file_id) {
          logger.info(`File ID: ${responseData.file_id}`);
          console.log(`File ID: ${responseData.file_id}`);
        }
      } catch (jsonError) {
        logger.warn('Could not parse response JSON, but upload was successful');
      }

      return true;
    } else {
      logger.error(`Upload failed with status: ${response.status}`);
      console.log(`\nUpload failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logger.error(`Upload failed: ${error.message}`);
    console.error(`\nUpload failed: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('\nTroubleshooting tips:');
      console.log('1. Make sure the upload server is running at http://117.72.82.170:10272');
      console.log('2. Check your network connection');
      console.log('3. Verify the API endpoint is correct');
    }

    return false;
  }
}

/**
 * Main function to backup OBS configuration
 */
async function backupOBSConfiguration() {
  const obs = new OBSWebSocket();

  try {
    // Read connection parameters
    await readConnectionParams();

    logger.info('Starting OBS configuration backup...');
    logger.info(`Connecting to OBS WebSocket at ${connectionParams.address}`);

    // Connect to OBS
    await obs.connect(connectionParams.address, connectionParams.password);
    logger.info('Connected to OBS WebSocket');

    // Get current profile and scene collection
    const { currentProfileName } = await obs.call('GetProfileList');
    const { currentSceneCollectionName } = await obs.call('GetSceneCollectionList');

    logger.info(`Current profile: ${currentProfileName}`);
    logger.info(`Current scene collection: ${currentSceneCollectionName}`);

    // Create backup folder
    const backupFolderPath = await createBackupFolder();

    // Copy configuration files
    const copySuccess = await copyConfigFiles(
      backupFolderPath,
      currentProfileName,
      currentSceneCollectionName
    );

    if (copySuccess) {
      // Create ZIP archive
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const zipFilePath = path.join(desktopPath, path.basename(backupFolderPath) + '.zip');

      await createZipArchive(backupFolderPath, zipFilePath);

      // Remove the backup folder after creating ZIP
      await fs.remove(backupFolderPath);

      logger.info(`Backup completed successfully: ${zipFilePath}`);
      console.log(`\nOBS configuration backup completed successfully!`);
      console.log(`Backup saved to: ${zipFilePath}`);

      // Upload backup file to cloud
      console.log('\nUploading backup to cloud...');
      const uploadSuccess = await uploadBackupFile(zipFilePath);

      if (uploadSuccess) {
        logger.info('Backup process completed with cloud upload');
        console.log('\nBackup process completed successfully with cloud upload!');
      } else {
        logger.warn('Backup completed but cloud upload failed');
        console.log('\nBackup completed successfully but cloud upload failed.');
        console.log('The backup file is still available locally.');
      }

      return true;
    } else {
      logger.error('Backup failed: Could not copy configuration files');
      console.log('\nBackup failed: Could not copy configuration files');
      return false;
    }
  } catch (error) {
    logger.error(`Backup failed: ${error.message}`);
    console.error(`\nBackup failed: ${error.message}`);

    if (error.code === 'CONNECTION_ERROR') {
      console.log('\nTroubleshooting tips:');
      console.log('1. Make sure OBS Studio is running');
      console.log('2. Verify WebSocket server is enabled in OBS (Tools > WebSocket Server Settings)');
      console.log('3. Check that the port is correct (default is 4455)');
      console.log('4. Verify the password is correct');
    }

    return false;
  } finally {
    // Disconnect from OBS
    try {
      await obs.disconnect();
      logger.info('Disconnected from OBS WebSocket');
    } catch (error) {
      logger.warn(`Error disconnecting: ${error.message}`);
    }
  }
}

// Run the backup function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupOBSConfiguration();
}

export default backupOBSConfiguration;
