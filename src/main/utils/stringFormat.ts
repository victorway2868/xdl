/**
 * Formats a device name to be safe for use as a file or directory name for OBS profiles.
 * Replaces spaces with underscores and removes characters that are invalid in file paths.
 * @param deviceName The original device name.
 * @returns A sanitized string suitable for file paths.
 */
export function formatProfileName(deviceName: string): string {
  if (!deviceName) return '';

  // Replace spaces with underscores, then remove all characters that are not:
  // - CJK characters (Chinese, Japanese, Korean)
  // - Latin letters (a-z, A-Z)
  // - Numbers (0-9)
  // - Underscore or hyphen
  return deviceName
    .replace(/\s+/g, '_')
    .replace(/[^\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\w-]/g, '');
}

