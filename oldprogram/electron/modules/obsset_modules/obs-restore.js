/**
 * OBS Configuration Restore Utility
 *
 * This script finds OBS configuration backups, extracts them, and restores them to OBS.
 */

// Using ES modules
import OBSWebSocket from 'obs-websocket-js';
import fs from 'fs-extra';
import path from 'path';
import ini from 'ini';
import winston from 'winston';
import os from 'os';
import { findBackupZipFiles, extractZipArchive } from './utils/zip-utils.js';

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
    new winston.transports.File({ filename: 'obs-restore.log' })
  ]
});

// Get __dirname equivalent in ES modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const globalIniPath = path.join(obsStudioPath, 'global.ini');
const userIniPath = path.join(obsStudioPath, 'user.ini');

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
 * Copy files from backup to OBS configuration directory
 * @param {string} backupDir - Path to extracted backup directory
 * @returns {Promise<{profileName: string, sceneCollectionName: string}>} - Names of restored profile and scene collection
 */
async function copyFilesToOBS(backupDir) {
  try {
    // Get profile and scene collection names from backup
    const backupProfilesPath = path.join(backupDir, 'basic', 'profiles');
    const backupScenesPath = path.join(backupDir, 'basic', 'scenes');

    // Check if backup paths exist
    if (!await fs.pathExists(backupProfilesPath) || !await fs.pathExists(backupScenesPath)) {
      throw new Error('Invalid backup structure: missing profiles or scenes directory');
    }

    // Get profile name (first directory in profiles)
    const profileDirs = await fs.readdir(backupProfilesPath);
    const profileFolders = [];
    for (const item of profileDirs) {
      const itemPath = path.join(backupProfilesPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        profileFolders.push(item);
      }
    }

    if (profileFolders.length === 0) {
      throw new Error('No profile found in backup');
    }

    const profileName = profileFolders[0];
    logger.info(`Found profile in backup: ${profileName}`);

    // Get scene collection name (first JSON file in scenes)
    const sceneFiles = await fs.readdir(backupScenesPath);
    const jsonFiles = sceneFiles.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      throw new Error('No scene collection found in backup');
    }

    const sceneFileName = jsonFiles[0];
    const sceneCollectionName = path.basename(sceneFileName, '.json');
    logger.info(`Found scene collection in backup: ${sceneCollectionName}`);

    // Copy profile to OBS
    const sourceProfilePath = path.join(backupProfilesPath, profileName);
    const destProfilePath = path.join(profilesPath, profileName);

    await fs.ensureDir(path.dirname(destProfilePath));
    if (await fs.pathExists(destProfilePath)) {
      await fs.remove(destProfilePath);
    }
    await fs.copy(sourceProfilePath, destProfilePath);
    logger.info(`Copied profile to: ${destProfilePath}`);

    // Copy scene collection to OBS
    const sourceScenePath = path.join(backupScenesPath, sceneFileName);
    const destScenePath = path.join(scenesPath, sceneFileName);

    await fs.ensureDir(path.dirname(destScenePath));
    if (await fs.pathExists(destScenePath)) {
      await fs.remove(destScenePath);
    }
    await fs.copy(sourceScenePath, destScenePath);
    logger.info(`Copied scene collection to: ${destScenePath}`);

    // Copy media files
    const sceneData = await fs.readJson(sourceScenePath);
    await updateSceneFilePaths(sceneData, backupDir, destScenePath);

    // Copy any other files from backup root to their original locations
    const backupFiles = await fs.readdir(backupDir);
    for (const file of backupFiles) {
      if (file !== 'basic') {
        const sourcePath = path.join(backupDir, file);
        const stats = await fs.stat(sourcePath);
        if (stats.isFile()) {
          // Copy to OBS media directory or other appropriate location
          // This is a simplified approach - in a real implementation, you might want
          // to restore files to their original paths if that information is available
          const destPath = path.join(obsStudioPath,'obs_media', file);
          await fs.copy(sourcePath, destPath);
          logger.info(`Copied media file to: ${destPath}`);
        }
      }
    }

    return { profileName, sceneCollectionName };
  } catch (error) {
    logger.error(`Error copying files to OBS: ${error.message}`);
    throw error;
  }
}

/**
 * Update scene file paths to point to the correct locations
 * @param {Object} sceneData - Scene collection data
 * @param {string} backupDir - Path to backup directory
 * @param {string} destScenePath - Path where the scene file will be saved
 */
async function updateSceneFilePaths(sceneData, backupDir, destScenePath) {
  // Find all file paths in the scene data and update them
  function updatePaths(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => updatePaths(item));
    } else {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const fileName = path.basename(value);
          const backupFilePath = path.join(backupDir, fileName);

          // If the file exists in the backup, update the path
          if (fs.existsSync(backupFilePath)) {
            const destFilePath = path.join(obsStudioPath, 'obs_media',fileName);
            obj[key] = destFilePath;
          }
        } else if (typeof value === 'object') {
          updatePaths(value);
        }
      }
    }
  }

  updatePaths(sceneData);

  // Save the updated scene data
  await fs.writeJson(destScenePath, sceneData, { spaces: 2 });
  logger.info(`Updated file paths in scene collection`);
}

/**
 * Update a specific INI file with profile and scene collection settings
 * Using Python configparser-like approach for maximum reliability
 * @param {string} iniPath - Path to the INI file
 * @param {string} iniName - Name of the INI file (for logging)
 * @param {string} profileName - Name of the profile
 * @param {string} sceneCollectionName - Name of the scene collection
 */
async function updateIniFile(iniPath, iniName, profileName, sceneCollectionName) {
  try {
    // Check if INI file exists (similar to Python's os.path.exists)
    if (await fs.pathExists(iniPath)) {
      // Create backup before modifying
      const backupPath = `${iniPath}.backup.${Date.now()}`;
      await fs.copy(iniPath, backupPath);
      logger.info(`Created backup: ${backupPath}`);

      try {
        // Read and parse INI file using robust method (similar to Python's configparser.read)
        const config = await readIniFileRobust(iniPath);

        // Set configuration values (similar to Python's config.set)
        setIniValue(config, 'Basic', 'Profile', profileName);
        setIniValue(config, 'Basic', 'ProfileDir', profileName);
        setIniValue(config, 'Basic', 'SceneCollection', sceneCollectionName);
        setIniValue(config, 'Basic', 'SceneCollectionFile', sceneCollectionName);

        // Write INI file with proper formatting (similar to Python's config.write)
        await writeIniFileRobust(iniPath, config);
        logger.info(`Updated ${iniName} with profile: ${profileName}, scene collection: ${sceneCollectionName}`);

        // Remove backup if successful
        await fs.remove(backupPath);
        logger.info(`Removed backup after successful update`);

      } catch (updateError) {
        // Restore from backup if update failed
        logger.error(`Update failed, restoring from backup: ${updateError.message}`);
        await fs.copy(backupPath, iniPath);
        await fs.remove(backupPath);
        throw updateError;
      }
    } else {
      logger.warn(`${iniName} not found at: ${iniPath}, will create a new one`);
      // Ensure the directory exists
      await fs.ensureDir(path.dirname(iniPath));

      // Create a new config object and write it
      const config = {
        Basic: {
          Profile: profileName,
          ProfileDir: profileName,
          SceneCollection: sceneCollectionName,
          SceneCollectionFile: sceneCollectionName
        }
      };

      await writeIniFileRobust(iniPath, config);
      logger.info(`Created new ${iniName} with profile: ${profileName}, scene collection: ${sceneCollectionName}`);
    }
  } catch (error) {
    logger.error(`Error updating ${iniName}: ${error.message}`);
    throw error;
  }
}

/**
 * Update both global.ini and user.ini with the restored profile and scene collection
 * @param {string} profileName - Name of the profile
 * @param {string} sceneCollectionName - Name of the scene collection
 */
async function updateConfigurationFiles(profileName, sceneCollectionName) {
  try {
    // Update global.ini
    await updateIniFile(globalIniPath, 'global.ini', profileName, sceneCollectionName);

    // Update user.ini
    await updateIniFile(userIniPath, 'user.ini', profileName, sceneCollectionName);

    logger.info(`Successfully updated both global.ini and user.ini configuration files`);
  } catch (error) {
    logger.error(`Error updating configuration files: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to restore OBS configuration
 * @param {string} [zipFilePath] - Optional path to specific backup ZIP file
 */
async function restoreOBSConfiguration(zipFilePath) {
  try {
    logger.info('Starting OBS configuration restore...');

    // Find backup ZIP files if not specified
    let backupZipPath = zipFilePath;
    if (!backupZipPath) {
      const backupFiles = await findBackupZipFiles();

      if (backupFiles.length === 0) {
        logger.error('No backup files found');
        console.error('No OBS configuration backup files found on the desktop.');
        return false;
      }

      // Sort by modification time (newest first)
      backupFiles.sort(async (a, b) => {
        const statA = await fs.stat(a);
        const statB = await fs.stat(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

      // Use the most recent backup
      backupZipPath = backupFiles[0];
    }

    logger.info(`Using backup file: ${backupZipPath}`);
    console.log(`Restoring OBS configuration from: ${backupZipPath}`);

    // Create temporary directory for extraction
    const tempDir = path.join(os.tmpdir(), `obs-restore-${Date.now()}`);
    await fs.ensureDir(tempDir);

    try {
      // Extract backup
      await extractZipArchive(backupZipPath, tempDir);

      // Copy files to OBS
      const { profileName, sceneCollectionName } = await copyFilesToOBS(tempDir);

      // Update global.ini
      await updateConfigurationFiles(profileName, sceneCollectionName);

      logger.info('Restore completed successfully');
      console.log('\nOBS configuration restore completed successfully!');
      console.log(`Restored profile: ${profileName}`);
      console.log(`Restored scene collection: ${sceneCollectionName}`);
      console.log('\nPlease restart OBS Studio for the changes to take effect.');

      return true;
    } finally {
      // Clean up temporary directory
      try {
        await fs.remove(tempDir);
        logger.info(`Removed temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        logger.warn(`Error cleaning up temporary directory: ${cleanupError.message}`);
      }
    }
  } catch (error) {
    logger.error(`Restore failed: ${error.message}`);
    console.error(`\nRestore failed: ${error.message}`);
    return false;
  }
}

// Run the restore function if this file is executed directly
// In ES modules, this is the equivalent of checking if the file is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if a specific backup file was specified
  const specifiedBackupPath = process.argv[2];
  restoreOBSConfiguration(specifiedBackupPath);
}

// Export the restore function
export default restoreOBSConfiguration;
