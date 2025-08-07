import fs from 'fs';
import path from 'path';

/**
 * This script handles the fsevents issue on Windows by creating an empty directory
 * to satisfy the build process without causing errors.
 */
async function fixFsevents() {
  try {
    // Only run on Windows
    if (process.platform !== 'win32') {
      console.log('Not on Windows, skipping fsevents fix');
      return;
    }

    const fseventsPath = path.resolve('./node_modules/fsevents');

    // Check if fsevents directory exists
    if (!fs.existsSync(fseventsPath)) {
      console.log('Creating empty fsevents directory to fix build issue');

      // Create the directory
      fs.mkdirSync(fseventsPath, { recursive: true });

      // Create a dummy package.json to satisfy the build process
      const dummyPackage = {
        name: 'fsevents',
        version: '2.3.3',
        description: 'Dummy fsevents package for Windows builds',
        os: ['darwin'],
        optional: true
      };

      fs.writeFileSync(
        path.join(fseventsPath, 'package.json'),
        JSON.stringify(dummyPackage, null, 2)
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

      console.log('Created dummy fsevents package');
    } else {
      console.log('fsevents directory already exists, checking contents');

      // Ensure the directory has the necessary files
      const packageJsonPath = path.join(fseventsPath, 'package.json');
      const indexJsPath = path.join(fseventsPath, 'index.js');

      if (!fs.existsSync(packageJsonPath) || !fs.existsSync(indexJsPath)) {
        console.log('Fixing incomplete fsevents directory');

        // Create a dummy package.json if it doesn't exist
        if (!fs.existsSync(packageJsonPath)) {
          const dummyPackage = {
            name: 'fsevents',
            version: '2.3.3',
            description: 'Dummy fsevents package for Windows builds',
            os: ['darwin'],
            optional: true
          };

          fs.writeFileSync(
            packageJsonPath,
            JSON.stringify(dummyPackage, null, 2)
          );
        }

        // Create a dummy index.js file if it doesn't exist
        if (!fs.existsSync(indexJsPath)) {
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
        }

        console.log('Fixed fsevents directory');
      } else {
        console.log('fsevents directory is complete, no fix needed');
      }
    }
  } catch (error) {
    console.error('Error fixing fsevents:', error);
  }
}

// Run the fix
fixFsevents();
