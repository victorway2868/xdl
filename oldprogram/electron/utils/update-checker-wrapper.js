/**
 * Update Checker Wrapper
 * 
 * This module serves as a wrapper for the update-checker.js file,
 * ensuring that it can be properly imported in both development and production environments.
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Export functions that will be used by the main process
export async function initUpdateChecker() {
  try {
    console.log('Initializing update checker wrapper...');
    
    // Try to import the update-checker.js file from different possible locations
    let updateChecker;
    
    try {
      // First try the relative path from development environment
      updateChecker = await import('../../build/update-checker.js');
      console.log('Successfully imported update-checker.js from development path');
    } catch (devError) {
      console.error('Failed to import update-checker.js from development path:', devError.message);
      
      try {
        // Try the path relative to the app resources in production
        const resourcesPath = process.resourcesPath;
        const prodPath = path.join(resourcesPath, 'app.asar', 'build', 'update-checker.js');
        
        console.log('Trying to import from production path:', prodPath);
        
        // Check if the file exists before trying to import it
        if (fs.existsSync(prodPath)) {
          // Convert the file path to a file URL for import
          const fileUrl = `file://${prodPath.replace(/\\/g, '/')}`;
          updateChecker = await import(fileUrl);
          console.log('Successfully imported update-checker.js from production path');
        } else {
          throw new Error(`File not found at ${prodPath}`);
        }
      } catch (prodError) {
        console.error('Failed to import update-checker.js from production path:', prodError.message);
        
        // Create a dummy implementation as fallback
        console.log('Using dummy implementation for update checker');
        updateChecker = {
          initUpdateChecker: () => console.log('Dummy update checker initialized'),
          checkForUpdates: async () => {
            console.log('Dummy update check - no actual check performed');
            return false;
          }
        };
      }
    }
    
    // Call the actual initUpdateChecker function
    if (typeof updateChecker.initUpdateChecker === 'function') {
      updateChecker.initUpdateChecker();
    } else {
      console.error('initUpdateChecker function not found in imported module');
    }
  } catch (error) {
    console.error('Error in update checker wrapper:', error);
  }
}

export async function checkForUpdates(force = false) {
  try {
    console.log(`Wrapper: Checking for updates (force=${force})...`);
    
    // Try to import the update-checker.js file from different possible locations
    let updateChecker;
    
    try {
      // First try the relative path from development environment
      updateChecker = await import('../../build/update-checker.js');
    } catch (devError) {
      try {
        // Try the path relative to the app resources in production
        const resourcesPath = process.resourcesPath;
        const prodPath = path.join(resourcesPath, 'app.asar', 'build', 'update-checker.js');
        
        // Check if the file exists before trying to import it
        if (fs.existsSync(prodPath)) {
          // Convert the file path to a file URL for import
          const fileUrl = `file://${prodPath.replace(/\\/g, '/')}`;
          updateChecker = await import(fileUrl);
        } else {
          throw new Error(`File not found at ${prodPath}`);
        }
      } catch (prodError) {
        console.error('Failed to import update-checker.js:', prodError.message);
        return false;
      }
    }
    
    // Call the actual checkForUpdates function
    if (typeof updateChecker.checkForUpdates === 'function') {
      return await updateChecker.checkForUpdates(force);
    } else {
      console.error('checkForUpdates function not found in imported module');
      return false;
    }
  } catch (error) {
    console.error('Error in update checker wrapper:', error);
    return false;
  }
}
