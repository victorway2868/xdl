/**
 * OBS WebSocket - Enable Default Audio Sources
 *
 * This module provides functions to enable default audio sources in OBS:
 * 1. Desktop Audio (wasapi_output_capture)
 * 2. Microphone/AUX (wasapi_input_capture)
 *
 * It also adds a noise suppression filter to the microphone audio source.
 */

// Import OBS WebSocket
import OBSWebSocket from 'obs-websocket-js';

/**
 * Default audio source names
 */
const DEFAULT_AUDIO_SOURCES = {
  desktopAudio: '桌面音频', // "Desktop Audio" in Chinese
  micAudio: '麦克风/Aux', // "Microphone/Aux" in Chinese
  noiseSuppressionFilter: '噪声抑制' // "Noise Suppression" in Chinese
};

/**
 * Enable default audio sources in OBS
 * @param {Object} options - Configuration options
 * @param {Object} options.audioSources - Audio source names (optional)
 * @param {string} options.audioSources.desktopAudio - Desktop audio source name
 * @param {string} options.audioSources.micAudio - Microphone audio source name
 * @param {string} options.audioSources.noiseSuppressionFilter - Noise suppression filter name
 * @param {Object} options.obs - OBS WebSocket client (optional)
 * @returns {Promise<Object>} Result of the operation
 */
async function enableAudioSources(options = {}) {
  // Set default options
  const {
    audioSources = DEFAULT_AUDIO_SOURCES,
    obs // OBS WebSocket client must be provided
  } = options;

  // Check if OBS WebSocket client is provided
  if (!obs) {
    throw new Error('OBS WebSocket client is required. Please provide an OBS WebSocket client instance.');
  }

  // Extract audio source names
  const {
    desktopAudio = DEFAULT_AUDIO_SOURCES.desktopAudio,
    micAudio = DEFAULT_AUDIO_SOURCES.micAudio,
    noiseSuppressionFilter = DEFAULT_AUDIO_SOURCES.noiseSuppressionFilter
  } = audioSources;

  try {
    // Check if the client is connected
    if (!obs.identified) {
      throw new Error('OBS WebSocket client is not connected');
    }

    // Get OBS version
    const { obsVersion } = await obs.call('GetVersion');
    console.log(`OBS Studio Version: ${obsVersion}`);

    // Get current scene
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    console.log(`Current Scene: ${currentProgramSceneName}`);

    // Get current inputs to check if audio sources already exist
    const { inputs } = await obs.call('GetInputList');

    // Check for desktop audio source
    const desktopAudioExists = inputs.some(input =>
      input.inputName === desktopAudio && input.inputKind === 'wasapi_output_capture'
    );

    // Check for microphone/AUX audio source
    const micAudioExists = inputs.some(input =>
      input.inputName === micAudio && input.inputKind === 'wasapi_input_capture'
    );

    // Create desktop audio source if it doesn't exist
    if (!desktopAudioExists) {
      console.log(`Creating desktop audio source: ${desktopAudio}`);
      try {
        await obs.call('CreateInput', {
          sceneName: currentProgramSceneName,
          inputName: desktopAudio,
          inputKind: 'wasapi_output_capture',
          inputSettings: {
            'device_id': 'default'
          }
        });
        console.log(`Successfully created desktop audio source: ${desktopAudio}`);
      } catch (error) {
        console.error(`Error creating desktop audio source: ${error.message}`);
      }
    } else {
      console.log(`Desktop audio source already exists: ${desktopAudio}`);
    }

    // Create microphone/AUX audio source if it doesn't exist
    if (!micAudioExists) {
      console.log(`Creating microphone/AUX audio source: ${micAudio}`);
      try {
        await obs.call('CreateInput', {
          sceneName: currentProgramSceneName,
          inputName: micAudio,
          inputKind: 'wasapi_input_capture',
          inputSettings: {
            'device_id': 'default'
          }
        });

        // Apply noise suppression filter to microphone audio

        const { filters } = await obs.call('GetSourceFilterList', {
          sourceName: micAudio
        });

        const noiseSuppressFilterExists = filters.some(filter =>
          filter.filterName === noiseSuppressionFilter && filter.filterKind === 'noise_suppress_filter_v2'
        );

        if (!noiseSuppressFilterExists) {
          console.log(`Adding noise suppression filter to ${micAudio}`);
          await obs.call('CreateSourceFilter', {
            sourceName: micAudio,
            filterName: noiseSuppressionFilter,
            filterKind: 'noise_suppress_filter_v2',
            filterSettings: {}
          });
          console.log(`Successfully added noise suppression filter to ${micAudio}`);
        } else {
          console.log(`Noise suppression filter already exists for ${micAudio}`);
        }

        console.log(`Successfully created microphone/AUX audio source: ${micAudio}`);
      } catch (error) {
        console.error(`Error creating microphone/AUX audio source: ${error.message}`);
      }
    } else {
      console.log(`Microphone/AUX audio source already exists: ${micAudio}`);
    }

    console.log('\nAudio sources setup completed successfully!');

    // Return success result
    return {
      success: true,
      desktopAudio,
      micAudio,
      noiseSuppressionFilter,
      message: 'Audio sources setup completed successfully'
    };
  } catch (error) {
    console.error('Error:', error.message);

    // Provide troubleshooting tips
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure OBS Studio is running');
    console.log('2. Verify WebSocket server is enabled in OBS (Tools > WebSocket Server Settings)');
    console.log('3. Check that the port is correct (default is 4455)');
    console.log('4. Verify the password is correct');

    // Return error result
    return {
      success: false,
      error: error.message,
      message: 'Failed to setup audio sources'
    };
  }
  // We don't disconnect here since the client is managed by the caller
}

/**
 * Simple function to enable default audio sources with default names
 * @param {Object} obs - OBS WebSocket client (required)
 * @returns {Promise<Object>} Result of the operation
 */
async function enableDefaultAudioSources(obs) {
  if (!obs) {
    throw new Error('OBS WebSocket client is required. Please provide an OBS WebSocket client instance.');
  }
  return enableAudioSources({ obs });
}

// Export functions
export {
  enableAudioSources,
  enableDefaultAudioSources,
  DEFAULT_AUDIO_SOURCES
};
