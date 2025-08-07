/**
 * OBS WebSocket - Create Text Source with Font Configuration
 *
 * This script connects to OBS via WebSocket and configures the font for a text source.
 * - If the text source already exists, only the font settings will be updated (text content preserved)
 * - If the text source doesn't exist, it will be created with the specified name and text content
 *
 * Usage:
 *   node create-text-source.js [sourceName] [textContent]
 *
 * Examples:
 *   node create-text-source.js                         # Updates font for "文本" or creates it with text "自定义文本"
 *   node create-text-source.js "Title"                 # Updates font for "Title" or creates it with text "自定义文本"
 *   node create-text-source.js "Title" "Hello World"   # Updates font for "Title" or creates it with text "Hello World"
 */

// Import the OBS WebSocket library
import OBSWebSocket from 'obs-websocket-js';
import { exec } from 'child_process';

// Create a new instance of the OBS WebSocket client
const obs = new OBSWebSocket();

// Connection parameters - adjust these as needed
const connectionParams = {
  address: 'ws://localhost:4455', // Default OBS WebSocket address and port
  password: 'OwuWIvIyVGFwcL01', // OBS WebSocket password (change if needed)
};

// Available fonts (based on the project's configuration)
const availableFonts = [
  'Aa剑豪体',
  '贤二体',
  'Gen Ei Gothic P Heavy',
  '千图小兔体',
  '汉字之美神勇兔生肖-闪',
  'HongLeiZhuoShu',
  'StarLoveSweety',
  '字玩哥特黑白无常 免费 超黑',
  'Arial',
  'Microsoft YaHei',
  'SimHei'
];

// Text source settings - focusing only on font
const textSourceSettings = {
  kind: 'text_gdiplus_v3', // Updated to v3 based on supported input kinds
  font: {
    face: availableFonts[0], // Use the first available font
    size: 60, // Default font size
    style: 'Regular', // Font style
    flags: 0 // Font flags
  }
  // No additional settings - will use OBS defaults
};

// Function to check if OBS is running
function isOBSRunning() {
  return new Promise((resolve) => {
    console.log('Checking if OBS is running...');

    // Use a more detailed command to check for OBS process
    const command = 'tasklist /FI "IMAGENAME eq obs64.exe" /FO CSV /NH';

    console.log('Executing command:', command);

    exec(command, (error, stdout, stderr) => {
      console.log('Command output:', stdout);

      if (error) {
        console.error('Command error:', error);
        console.error('Command stderr:', stderr);
        resolve(false);
        return;
      }

      if (stdout && stdout.includes('obs64.exe')) {
        console.log('OBS is running');
        resolve(true);
      } else {
        console.log('OBS is not running');
        resolve(false);
      }
    });
  });
}

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

// Main function
/**
 * Creates or updates a text source in the current OBS scene with customized font settings
 * If the text source already exists, only the font settings will be updated (text content preserved)
 * If the text source doesn't exist, it will be created with the specified name and text content
 * @param {string} sourceName - The name of the text source (default: '文本')
 * @param {string} textContent - The text content to display for new sources only (default: '自定义文本')
 */
async function createTextSource(sourceName = '文本', textContent = '自定义文本') {
  try {
    // Check if OBS is running
    const obsRunning = await isOBSRunning();
    if (!obsRunning) {
      console.error('OBS is not running. Please start OBS first.');
      console.log('Troubleshooting tips:');
      console.log('1. Start OBS Studio manually');
      console.log('2. Make sure WebSocket server is enabled in OBS (Tools > WebSocket Server Settings)');
      console.log('3. Check that the port is correct (default is 4455)');
      console.log('4. Verify the password is correct');
      return;
    }

    // Connect to OBS WebSocket with timeout
    console.log('Connecting to OBS WebSocket...');

    try {
      // Create a promise that rejects after a timeout
      const connectPromise = obs.connect(connectionParams.address, connectionParams.password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
      });

      // Race the connection against the timeout
      await Promise.race([connectPromise, timeoutPromise]);
      console.log('Successfully connected to OBS WebSocket!');
    } catch (error) {
      console.error('Failed to connect to OBS WebSocket:', error.message);
      console.log('Troubleshooting tips:');
      console.log('1. Make sure WebSocket server is enabled in OBS (Tools > WebSocket Server Settings)');
      console.log('2. Check that the port is correct (default is 4455)');
      console.log('3. Verify the password is correct');
      return;
    }

    try {
      // Get OBS version
      const { obsVersion } = await obs.call('GetVersion');
      console.log(`OBS Studio Version: ${obsVersion}`);

      // Get current scene
      const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
      console.log(`Current Scene: ${currentProgramSceneName}`);

      // Get available input kinds to find the text input kind
      const { inputKinds } = await obs.call('GetInputKindList');
      console.log('Available input kinds:', inputKinds);

      // Find the text input kind (prefer v3, fallback to any text_gdiplus)
      const textInputKind = inputKinds.find(kind => kind === 'text_gdiplus_v3') ||
                           inputKinds.find(kind => kind.includes('text_gdiplus'));

      if (!textInputKind) {
        throw new Error('No text input kind found in OBS');
      }

      console.log(`Using text input kind: ${textInputKind}`);

      // Check if a text source with the same name already exists
      const { inputs } = await obs.call('GetInputList');
      const existingTextSource = inputs.find(input =>
        input.inputName === sourceName &&
        input.inputKind === textInputKind
      );

      // Create a settings object with just the text content and font
      const inputSettings = {
        text: textContent,
        font: textSourceSettings.font
      };

      if (existingTextSource) {
        console.log(`Text source "${sourceName}" already exists. Updating font settings only...`);

        // Get current settings to preserve other properties
        const { inputSettings: currentSettings } = await obs.call('GetInputSettings', {
          inputName: sourceName
        });

        // Only update the font settings, preserving all other settings including text content
        await obs.call('SetInputSettings', {
          inputName: sourceName,
          inputSettings: {
            ...currentSettings,
            // Don't update text content for existing sources
            font: textSourceSettings.font // Update only the font
          }
        });

        console.log(`Successfully updated font for text source "${sourceName}" (text content preserved)`);
      } else {
        console.log(`Creating new text source "${sourceName}" in scene "${currentProgramSceneName}"...`);

        // Create new text source with minimal settings
        await obs.call('CreateInput', {
          sceneName: currentProgramSceneName,
          inputName: sourceName,
          inputKind: textInputKind, // Use the dynamically found text input kind
          inputSettings: inputSettings
        });

        console.log(`Successfully created text source "${sourceName}" with text "${textContent}" and font settings`);
      }

      console.log('Text source font configuration completed successfully!');
    } catch (error) {
      console.error('Error during text source operation:', error.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
  } finally {
    // Disconnect from OBS WebSocket
    if (obs.identified) {
      await obs.disconnect();
      console.log('Disconnected from OBS WebSocket');
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let sourceName = '文本'; // Default source name
let textContent = '自定义文本'; // Default text content

// Check if arguments were provided
if (args.length >= 1) {
  sourceName = args[0];
}
if (args.length >= 2) {
  textContent = args[1];
}

// Run the main function
console.log('Starting text source font configuration...');
console.log('Script version: 1.0.4');
console.log('Current directory:', __dirname);
console.log('Node.js version:', process.version);
console.log(`Source name: "${sourceName}"`);
console.log(`Text content (for new sources only): "${textContent}"`);
console.log(`Font: "${textSourceSettings.font.face}" (size: ${textSourceSettings.font.size})`);

// Add more debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

createTextSource(sourceName, textContent).catch(error => {
  console.error('Error in main function:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Disconnecting from OBS WebSocket...');
  if (obs.identified) {
    obs.disconnect();
  }
  process.exit(0);
});
