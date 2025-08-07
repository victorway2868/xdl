/**
 * Zip utilities for OBS configuration backup and restore
 */

import fs from 'fs-extra';
import path from 'path';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import archiver from 'archiver';
import extract from 'extract-zip';
import winston from 'winston';

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
    new winston.transports.File({ filename: 'zip-utils.log' })
  ]
});

/**
 * Create a ZIP archive of a directory
 * @param {string} sourceDir - Directory to zip
 * @param {string} outputPath - Path to save the ZIP file
 * @returns {Promise<boolean>} - Success status
 */
async function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Create output stream
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Listen for all archive data to be written
      output.on('close', () => {
        logger.info(`ZIP archive created: ${outputPath} (${archive.pointer()} bytes)`);
        resolve(true);
      });

      // Handle warnings and errors
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          logger.warn(`Warning while creating ZIP: ${err.message}`);
        } else {
          reject(err);
        }
      });

      archive.on('error', (err) => {
        logger.error(`Error creating ZIP: ${err.message}`);
        reject(err);
      });

      // Pipe archive data to the output file
      archive.pipe(output);

      // Add the directory to the archive
      archive.directory(sourceDir, false);

      // Finalize the archive
      archive.finalize();
    } catch (error) {
      logger.error(`Failed to create ZIP archive: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Extract a ZIP archive to a directory
 * @param {string} zipPath - Path to the ZIP file
 * @param {string} outputDir - Directory to extract to
 * @returns {Promise<boolean>} - Success status
 */
async function extractZipArchive(zipPath, outputDir) {
  try {
    await fs.ensureDir(outputDir);
    await extract(zipPath, { dir: outputDir });
    logger.info(`ZIP archive extracted to: ${outputDir}`);
    return true;
  } catch (error) {
    logger.error(`Failed to extract ZIP archive: ${error.message}`);
    throw error;
  }
}

/**
 * Find all OBS backup ZIP files on the desktop
 * @returns {Promise<Array<string>>} - Array of ZIP file paths
 */
async function findBackupZipFiles() {
  try {
    const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop');
    const publicDesktopPath = process.platform === 'win32'
      ? path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop')
      : '';

    const desktopFiles = await fs.readdir(desktopPath);
    const desktopBackups = desktopFiles
      .filter(file => file.startsWith('obsbackup_') && file.endsWith('.zip'))
      .map(file => path.join(desktopPath, file));

    let publicDesktopBackups = [];
    if (publicDesktopPath && await fs.pathExists(publicDesktopPath)) {
      const publicFiles = await fs.readdir(publicDesktopPath);
      publicDesktopBackups = publicFiles
        .filter(file => file.startsWith('obsbackup_') && file.endsWith('.zip'))
        .map(file => path.join(publicDesktopPath, file));
    }

    const allBackups = [...desktopBackups, ...publicDesktopBackups];
    logger.info(`Found ${allBackups.length} backup ZIP files`);

    return allBackups;
  } catch (error) {
    logger.error(`Error finding backup ZIP files: ${error.message}`);
    return [];
  }
}

export {
  createZipArchive,
  extractZipArchive,
  findBackupZipFiles
};
