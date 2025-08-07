/**
 * Fix FSEvents Module for Windows
 *
 * This script creates a dummy fsevents module to prevent errors on Windows.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to fsevents module
const fseventsPath = path.resolve('./node_modules/fsevents');

// Check if fsevents directory exists
if (!fs.existsSync(fseventsPath)) {
  console.log('Creating dummy fsevents module...');

  // Create the directory
  fs.mkdirSync(fseventsPath, { recursive: true });

  // Create a dummy package.json
  const packageJson = {
    name: 'fsevents',
    version: '2.3.3',
    description: 'Dummy fsevents package for Windows',
    main: 'index.js',
    os: ['darwin'],
    optional: true
  };

  fs.writeFileSync(
    path.join(fseventsPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create a dummy index.js file that works with both ESM and CommonJS
  const indexJs = `
// Dummy fsevents module for Windows
const fakeWatch = function() {
  console.warn('fsevents is not supported on this platform');
  return function() {}; // Return a no-op function
};

// Support both ESM and CommonJS
export const watch = fakeWatch;
export default { watch: fakeWatch };

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { watch: fakeWatch };
}
`;

  fs.writeFileSync(path.join(fseventsPath, 'index.js'), indexJs);

  console.log('Created dummy fsevents module successfully');
} else {
  console.log('fsevents directory already exists, checking contents...');

  // Check if index.js exists and contains the watch function
  const indexJsPath = path.join(fseventsPath, 'index.js');

  if (!fs.existsSync(indexJsPath) || !fs.readFileSync(indexJsPath, 'utf8').includes('watch')) {
    console.log('Fixing fsevents index.js...');

    // Create a dummy index.js file with the watch function that works with both ESM and CommonJS
    const indexJs = `
// Dummy fsevents module for Windows
const fakeWatch = function() {
  console.warn('fsevents is not supported on this platform');
  return function() {}; // Return a no-op function
};

// Support both ESM and CommonJS
export const watch = fakeWatch;
export default { watch: fakeWatch };

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { watch: fakeWatch };
}
`;

    fs.writeFileSync(indexJsPath, indexJs);
    console.log('Fixed fsevents index.js successfully');
  } else {
    console.log('fsevents module appears to be correctly configured');
  }
}

console.log('FSEvents fix completed');
