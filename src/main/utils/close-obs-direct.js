/**
 * Direct PowerShell method to close OBS from Node.js
 * This script doesn't require the batch file and directly uses PowerShell commands
 * ES Module version
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

// 将回调函数转换为 Promise
const exec = promisify(execCallback);

/**
 * Function to check if OBS is running
 * @returns {Promise<boolean>} Promise that resolves to true if OBS is running
 */
async function isOBSRunning() {
  try {
    await exec('powershell -command "Get-Process obs64 -ErrorAction SilentlyContinue"');
    return true; // 如果命令成功执行，OBS正在运行
  } catch (error) {
    return false; // 如果命令执行失败，OBS未运行
  }
}

/**
 * Function to gracefully close OBS
 * @returns {Promise} Promise that resolves when the command completes
 */
async function closeOBSGracefully() {
  try {
    const { stdout, stderr } = await exec('powershell -command "Get-Process obs64 | ForEach-Object { $_.CloseMainWindow() }"');
    return { stdout, stderr };
  } catch (error) {
    throw error;
  }
}

/**
 * Function to force close OBS
 * @returns {Promise} Promise that resolves when the command completes
 */
async function forceCloseOBS() {
  try {
    const { stdout, stderr } = await exec('powershell -command "Get-Process obs64 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"');
    return { stdout, stderr };
  } catch (error) {
    throw error;
  }
}

/**
 * Main function to close OBS
 * @returns {Promise} Promise that resolves when OBS is closed
 */
async function closeOBS() {
  console.log('Checking if OBS is running...');
  const running = await isOBSRunning();

  if (!running) {
    console.log('OBS is not running. No action needed.');
    return { status: 'not_running' };
  }

  console.log('OBS is running. Attempting to close it gracefully...');
  await closeOBSGracefully();

  // Wait a moment for OBS to close
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if OBS is still running
  console.log('Checking if OBS is still running...');
  const stillRunning = await isOBSRunning();

  if (stillRunning) {
    console.log('OBS is still running. Forcing it to close...');
    await forceCloseOBS();
    return { status: 'force_closed' };
  } else {
    console.log('OBS has been closed gracefully.');
    return { status: 'gracefully_closed' };
  }
}


// Export the functions so they can be used in other ES modules
export { closeOBS, isOBSRunning };
