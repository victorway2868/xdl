/**
 * OBS WebSocket - Create Image Source
 *
 * This script connects to OBS via WebSocket and creates an image source with a specified file path.
 * - If the image source already exists, its file path will be updated
 * - If the image source doesn't exist, it will be created with the specified name and file path
 *
 * Usage:
 *   node create-image-source.js [sourceName] [filePath]
 *
 * Examples:
 *   node create-image-source.js                                # Creates "图像" with default image
 *   node create-image-source.js "Logo"                         # Creates "Logo" with default image
 *   node create-image-source.js "Logo" "C:/path/to/image.png"  # Creates "Logo" with specified image
 *
 * Note for Windows users:
 *   When using absolute paths, use double backslashes or forward slashes:
 *   node create-image-source.js "Logo" "C:\\Users\\username\\Pictures\\image.png"
 *   node create-image-source.js "Logo" "C:/Users/username/Pictures/image.png"
 */

// Import the OBS WebSocket library
import OBSWebSocket from 'obs-websocket-js';
import fs from 'fs';

// Create a new instance of the OBS WebSocket client
const obs = new OBSWebSocket();

// Connection parameters - adjust these as needed
const connectionParams = {
  address: 'ws://localhost:4455', // Default OBS WebSocket address and port
  password: 'OwuWIvIyVGFwcL01', // OBS WebSocket password (change if needed)
};

// Default image path - will be used if no path is provided
// You should replace this with an actual image file path on your system
const defaultImagePath = 'default-image.png';

// Function to create or update an image source
async function createImageSource() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let sourceName = '图像'; // Default source name (Chinese for "Image")
    let filePath = defaultImagePath; // Default file path

    // Check if arguments were provided
    if (args.length >= 1) {
      sourceName = args[0];
    }
    if (args.length >= 2) {
      filePath = args[1];

      // Don't modify the path - use it exactly as provided
      console.log(`Using file path as provided: ${filePath}`);
    }

    // Validate file path
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File does not exist at path: ${filePath}`);
      console.log('Please provide a valid file path. For Windows absolute paths, use double backslashes or forward slashes:');
      console.log('Example: C:\\\\Users\\\\username\\\\Pictures\\\\image.png');
      console.log('Example: C:/Users/username/Pictures/image.png');
      return;
    }

    console.log('Connecting to OBS WebSocket...');

    // Connect to OBS WebSocket
    await obs.connect(connectionParams.address, connectionParams.password);
    console.log('Connected to OBS WebSocket!');

    // Get current scene
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log(`Current Scene: ${currentProgramSceneName}`);

    // Get available input kinds to find the image source kind
    const { inputKinds } = await obs.call('GetInputKindList');
    const imageInputKind = inputKinds.find(kind => kind === 'image_source');

    if (!imageInputKind) {
      throw new Error('Could not find image_source input kind in OBS');
    }

    console.log(`Using image input kind: ${imageInputKind}`);

    // Check if an image source with the same name already exists
    const { inputs } = await obs.call('GetInputList');
    const existingImageSource = inputs.find(input =>
      input.inputName === sourceName
    );

    if (existingImageSource) {
      console.log(`Updating existing image source "${sourceName}" with new file path...`);

      // Update the existing image source with the new file path
      await obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: {
          file: filePath
        }
      });

      console.log(`Successfully updated image source "${sourceName}" with file: ${filePath}`);
    } else {
      console.log(`Creating new image source "${sourceName}" in scene "${currentProgramSceneName}"...`);

      // Create new image source with the file path
      await obs.call('CreateInput', {
        sceneName: currentProgramSceneName,
        inputName: sourceName,
        inputKind: imageInputKind,
        inputSettings: {
          file: filePath
        }
      });

      console.log(`Successfully created image source "${sourceName}" with file: ${filePath}`);
    }

    console.log('Image source operation completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Disconnect from OBS WebSocket
    if (obs.identified) {
      await obs.disconnect();
      console.log('Disconnected from OBS WebSocket');
    }
  }
}

// Run the image source creation function
createImageSource();
