import fs from 'fs';
import axios from 'axios';
import pathManager, { PathType } from '../utils/pathManager.js';

/**
 * Read cookies from a file
 * @param {string} cookieFilePath - Path to the cookie file
 * @returns {string} - Cookie string
 */
function readCookiesFromFile(cookieFilePath) {
  try {
    if (fs.existsSync(cookieFilePath)) {
      return fs.readFileSync(cookieFilePath, 'utf8').trim();
    }
    console.error(`Cookie file not found: ${cookieFilePath}`);
    return null;
  } catch (error) {
    console.error(`Error reading cookie file: ${error.message}`);
    return null;
  }
}

/**
 * Get stream URL for Douyin live streaming with proper handling of IDs and URLs
 * @param {string} mode - Mode type ("phone" or "auto")
 * @returns {Promise<Object>} - Promise resolving to stream information
 */
async function getStreamURL(mode = "phone") {
  try {
    // Read cookie data
    const cookieData = readCookiesFromFile(pathManager.getPath(PathType.DOUYIN_COOKIES));
    if (!cookieData) {
      console.error('No cookie data available');
      return {
        success: false,
        error: 'No cookie data available'
      };
    }

    console.log(`Cookie data loaded: ${cookieData.length} characters`);

    // Set up request parameters based on mode type
    let url, data, agentValue;

    if (mode === "phone") {
      // Phone mode
      url = "https://webcast.amemv.com/webcast/room/get_latest_room/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880";
      data = {};
      agentValue = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    } else { // mode === "auto"
      // Auto mode
      url = "https://webcast.amemv.com/webcast/room/create/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&webcast_sdk_version=1520&device_platform=android&resolution=1920*1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=2515294039547702&iid=1776452427890550";
      data = {
        "multi_resolution": "true",
        "title": "我刚刚开播,大家快来看吧",
        "thumb_width": "1080",
        "thumb_height": "1920",
        "orientation": "0",
        "base_category": "416",
        "category": "1124",
        "has_commerce_goods": "false",
        "disable_location_permission": "1",
        "push_stream_type": "3",
        "auto_cover": "1",
        "cover_uri": "",
        "third_party": "1",
        "gift_auth": "1",
        "record_screen": "1"
      };
      agentValue = "okhttp/3.10.0.1";
    }

    // Set up headers
    const headers = {
      "Connection": "Keep-Alive",
      "Content-Type": "application/x-www-form-urlencoded; Charset=UTF-8",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-cn",
      "Cookie": cookieData,
      "Host": "webcast.amemv.com",
      "Referer": url,
      "User-Agent": agentValue,
      "Origin": "file://",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-Mode": "cors",
      "X-Requested-With": "XMLHttpRequest"
    };

    console.log(`Getting stream URL in ${mode} mode...`);

    // Make the request
    const response = await axios.post(url, data, { headers });

    // Process response
    if (response.status === 200) {
      const responseData = response.data;

      // Save the full response to a file for reference
      fs.writeFileSync('stream_response.json', JSON.stringify(responseData, null, 2));

      // Check for security authentication requirement (status_code 4003028)
      if (responseData.status_code === 4003028 && responseData.extra && responseData.extra.web_auth_address) {
        // Always use our custom message regardless of what the API returns
        const customAuthMessage = '直播安全认证，请完成后重试！';
        console.error(`Security authentication required: ${customAuthMessage}`);
        return {
          success: false,
          status_code: 4003028,
          status_msg: customAuthMessage, // Use our custom message instead of responseData.data?.prompts
          web_auth_address: responseData.extra.web_auth_address,
          requiresAuth: true
        };
      }

      // Check for other API errors
      if (responseData.status_code !== undefined && responseData.status_code !== 0) {
        console.error(`API Error: ${responseData.status_msg || 'Unknown error'}`);
        return {
          success: false,
          error: responseData.status_msg || 'Unknown error'
        };
      }

      // Extract data from response - ALWAYS use string values for IDs
      const status = responseData?.data?.status;

      // Use string versions of IDs to avoid precision issues
      const room_id = responseData?.data?.living_room_attrs?.room_id_str ||
                      String(responseData?.data?.living_room_attrs?.room_id);

      const stream_id = responseData?.data?.stream_id_str ||
                        String(responseData?.data?.stream_id);

      // Get the complete rtmp_push_url
      const rtmp_push_url = responseData?.data?.stream_url?.rtmp_push_url;

      // Create result object
      const result = {
        success: true,
        status,
        room_id,
        stream_id,
        rtmp_push_url,
        isReady: (status === 2 && mode === "phone") || (status === 1 && mode === "auto")
      };

      // Print extracted fields
      console.log("\n=== Stream Information ===");
      console.log(`Status: ${result.status}`);
      console.log(`Room ID: ${result.room_id}`);
      console.log(`Stream ID: ${result.stream_id}`);
      console.log(`RTMP Push URL: ${result.rtmp_push_url}`);
      console.log(`Is Ready: ${result.isReady}`);
      console.log("=========================\n");

      return result;
    } else {
      console.error(`HTTP Error: ${response.status} - ${response.statusText}`);
      return {
        success: false,
        error: `HTTP Error: ${response.status} - ${response.statusText}`
      };
    }
  } catch (error) {
    console.error(`Error in getStreamURL: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Maintain live stream status
 * @param {string} room_id - Room ID (string)
 * @param {string} stream_id - Stream ID (string)
 * @param {string} mode - Mode type ("phone" or "auto")
 * @returns {Promise<Object>} - Success status and info
 */
async function webcastStart(room_id, stream_id, mode = "phone") {
  try {
    // Read cookie data
    const cookieData = readCookiesFromFile(pathManager.getPath(PathType.DOUYIN_COOKIES));
    if (!cookieData) {
      console.error('No cookie data available');
      return {
        success: false,
        error: 'No cookie data available'
      };
    }

    // Set up request parameters based on mode type
    let url, agentValue;

    if (mode === "phone") {
      // Phone mode
      url = "https://webcast.amemv.com/webcast/room/ping/anchor/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&device_platform=windows&webcast_sdk_version=1520&resolution=1920%2A1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=3096676051989080&iid=1117559680415880";
      agentValue = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    } else { // mode === "auto"
      // Auto mode
      url = "https://webcast.amemv.com/webcast/room/ping/anchor/?ac=wifi&app_name=webcast_mate&version_code=5.6.0&webcast_sdk_version=1520&device_platform=android&resolution=1920*1080&os_version=10.0.22631&language=zh&aid=2079&live_id=1&channel=online&device_id=2515294039547702&iid=1776452427890550";
      agentValue = "okhttp/3.10.0.1";
    }

    // Set up headers
    const headers = {
      "Connection": "Keep-Alive",
      "Content-Type": "application/x-www-form-urlencoded; Charset=UTF-8",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-cn",
      "Cookie": cookieData,
      "Host": "webcast.amemv.com",
      "Referer": url,
      "User-Agent": agentValue,
      "Origin": "file://",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-Mode": "cors",
      "X-Requested-With": "XMLHttpRequest"
    };

    // Prepare data - ensure IDs are strings
    const data = `stream_id=${stream_id}&room_id=${room_id}&status=2`;

    console.log(`Maintaining stream with room_id: ${room_id}, stream_id: ${stream_id}`);

    // Send request
    const response = await axios.post(url, data, { headers });

    // Process response
    if (response.status === 200) {
      const responseData = response.data;

      // Check for API error
      if (responseData.status_code !== undefined && responseData.status_code !== 0) {
        console.error(`API Error: ${responseData.status_msg || 'Unknown error'}`);
        return {
          success: false,
          error: responseData.status_msg || 'Unknown error',
          response: responseData
        };
      }

      console.log("Stream maintained successfully!");
      return {
        success: true,
        response: responseData
      };
    } else {
      console.error(`HTTP Error: ${response.status} - ${response.statusText}`);
      return {
        success: false,
        error: `HTTP Error: ${response.status} - ${response.statusText}`
      };
    }
  } catch (error) {
    console.error(`Error in webcastStart: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get stream URL and maintain the stream state
 * @param {string} mode - Mode type ("phone" or "auto")
 * @returns {Promise<Object>} - Stream information and maintenance status
 */
async function getStreamURLAndMaintain(mode = "phone") {
  try {
    // Get stream URL and details
    const streamResult = await getStreamURL(mode);

    if (!streamResult.success) {
      return streamResult;
    }

    // Check if stream is ready
    if (streamResult.isReady) {
      // Maintain the stream state
      const maintainResult = await webcastStart(streamResult.room_id, streamResult.stream_id, mode);

      // Return combined result
      return {
        ...streamResult,
        maintained: maintainResult.success,
        maintainError: maintainResult.error
      };
    } else {
      return {
        ...streamResult,
        maintained: false,
        maintainError: 'Stream not ready'
      };
    }
  } catch (error) {
    console.error(`Error in getStreamURLAndMaintain: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Continuously maintain a stream
 * @param {string} room_id - Room ID
 * @param {string} stream_id - Stream ID
 * @param {string} mode - Mode type ("phone" or "auto")
 * @param {number} interval - Interval in milliseconds
 */
async function continuouslyMaintainStream(room_id, stream_id, mode = "phone", interval = 30000) {
  console.log(`Starting continuous stream maintenance (${mode} mode) with interval ${interval}ms`);
  console.log(`Press Ctrl+C to stop`);

  // Initial maintenance
  await webcastStart(room_id, stream_id, mode);

  // Set up interval for continuous maintenance
  const intervalId = setInterval(async () => {
    try {
      const result = await webcastStart(room_id, stream_id, mode);
      const timestamp = new Date().toISOString();

      if (result.success) {
        console.log(`[${timestamp}] Stream maintained successfully`);
      } else {
        console.error(`[${timestamp}] Failed to maintain stream: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error maintaining stream: ${error.message}`);
    }
  }, interval);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log("\nStream maintenance stopped by user");
    process.exit(0);
  });

  return intervalId;
}

// Run the CLI main function with the specified mode
async function cliMain() {
  const mode = process.argv[2] || "phone";
  const action = process.argv[3] || "both"; // "get", "maintain", or "both"

  console.log(`Douyin Stream Manager - Mode: ${mode}, Action: ${action}`);

  if (action === "get" || action === "both") {
    // Get stream URL
    const streamResult = await getStreamURL(mode);

    if (streamResult.success) {
      // Save stream info to file for easy access
      fs.writeFileSync('stream_info.json', JSON.stringify({
        room_id: streamResult.room_id,
        stream_id: streamResult.stream_id,
        rtmp_push_url: streamResult.rtmp_push_url,
        status: streamResult.status,
        timestamp: new Date().toISOString()
      }, null, 2));

      console.log("Stream information saved to stream_info.json");

      if (streamResult.isReady && action === "both") {
        // Maintain the stream
        await continuouslyMaintainStream(streamResult.room_id, streamResult.stream_id, mode);
      }
    } else {
      console.error(`Failed to get stream URL: ${streamResult.error}`);
    }
  } else if (action === "maintain") {
    // Use values from command line or from saved file
    let room_id = process.argv[4];
    let stream_id = process.argv[5];

    // If not provided, try to read from file
    if (!room_id || !stream_id) {
      try {
        if (fs.existsSync('stream_info.json')) {
          const savedInfo = JSON.parse(fs.readFileSync('stream_info.json', 'utf8'));
          room_id = savedInfo.room_id;
          stream_id = savedInfo.stream_id;
          console.log(`Using saved stream info from stream_info.json`);
        }
      } catch (error) {
        console.error(`Error reading saved stream info: ${error.message}`);
      }
    }

    if (!room_id || !stream_id) {
      console.error("For 'maintain' action, you must provide room_id and stream_id as arguments");
      console.error("Usage: node get_stream_url_fixed.js phone maintain <room_id> <stream_id>");
      return;
    }

    await continuouslyMaintainStream(room_id, stream_id, mode);
  }
}

/**
 * Main function to be called from Electron main process
 * @param {string} mode - Mode type ("phone" for mobile streaming or "auto" for auto streaming)
 * @param {Object} options - Additional options
 * @param {boolean} options.handleAuth - Whether to handle authentication
 * @returns {Promise<Object>} - Stream information
 */
async function main(mode = "phone", options = { handleAuth: false }) {
  console.log(`Douyin Stream API - Mode: ${mode}`);

  try {
    // Get stream URL based on mode
    const streamResult = await getStreamURL(mode);

    // Single check for authentication requirement (consolidated)
    if ((streamResult.status_code === 4003028 || streamResult.requiresAuth) &&
        streamResult.web_auth_address && options.handleAuth) {
      // Always use our custom message regardless of what the API returns
      const customAuthMessage = '直播安全认证，请完成后重试！';
      console.log('Security authentication required:', customAuthMessage);
      return {
        requiresAuth: true,
        authUrl: streamResult.web_auth_address,
        authPrompt: customAuthMessage // Use our custom message instead of streamResult.status_msg
      };
    }

    if (!streamResult.success) {
      console.error(`Failed to get stream URL: ${streamResult.error}`);
      return {
        error: streamResult.error
      };
    }

    // For phone mode, check if status is not 2 (ready)
    // If not, return a special response indicating we need to retry
    if (mode === "phone") {
      // Status = 4: Prompt user to start broadcasting on their phone
      if (streamResult.status === 4) {
        console.log(`Stream status is 4: User needs to start broadcasting on their phone`);
        return {
          needsRetry: true,
          currentStatus: streamResult.status,
          expectedStatus: 2,
          room_id: streamResult.room_id,
          stream_id: streamResult.stream_id,
          statusMessage: '请在手机上开播',
          error: '请在手机上开播'
        };
      }
      // Status = 2: Prompt user to enable airplane mode or quit the APP
      else if (streamResult.status === 2) {
        console.log(`Stream status is 2: Ready for streaming`);
        // For status 2, we don't need to retry, it's the expected status
        // But we still want to show a prompt to the user

        // Extract RTMP URL for status=2
        const rtmpUrl = streamResult.rtmp_push_url;

        if (rtmpUrl) {
          // Split RTMP URL into stream URL and stream key
          const lastSlashIndex = rtmpUrl.lastIndexOf('/');
          let streamUrl = '';
          let streamKey = '';

          if (lastSlashIndex !== -1 && lastSlashIndex < rtmpUrl.length - 1) {
            streamUrl = rtmpUrl.substring(0, lastSlashIndex);
            streamKey = rtmpUrl.substring(lastSlashIndex + 1);
            console.log(`Split RTMP URL - Stream URL: ${streamUrl}, Stream Key: ${streamKey ? '******' : 'none'}`);
          }

          return {
            needsRetry: false,
            currentStatus: streamResult.status,
            expectedStatus: 2,
            room_id: streamResult.room_id,
            stream_id: streamResult.stream_id,
            statusMessage: '请打开手机飞行模式或清退APP',
            isReady: true,
            rtmpUrl: rtmpUrl,
            streamUrl: streamUrl,
            streamKey: streamKey
          };
        } else {
          return {
            needsRetry: false,
            currentStatus: streamResult.status,
            expectedStatus: 2,
            room_id: streamResult.room_id,
            stream_id: streamResult.stream_id,
            statusMessage: '请打开手机飞行模式或清退APP',
            isReady: true
          };
        }
      }
      // Other status values: Generic "not ready" message
      else if (streamResult.status !== 2) {
        console.log(`Stream not ready yet. Current status: ${streamResult.status}, expected: 2`);
        return {
          needsRetry: true,
          currentStatus: streamResult.status,
          expectedStatus: 2,
          room_id: streamResult.room_id,
          stream_id: streamResult.stream_id,
          error: '直播间未准备好，请等待或重试'
        };
      }
    }

    // Extract RTMP URL
    const rtmpUrl = streamResult.rtmp_push_url;

    if (!rtmpUrl) {
      console.error('No RTMP URL found in response');
      return { error: '未找到有效的推流地址' };
    }

    console.log(`RTMP URL: ${rtmpUrl}`);

    // If the stream is ready, start ping/anchor requests to maintain the stream
    if (streamResult.isReady) {
      console.log('Stream is ready, starting ping/anchor requests');
      startPingAnchor(streamResult.room_id, streamResult.stream_id, mode);
    }

    // Return stream information
    return {
      success: true,
      rtmpUrl: rtmpUrl,
      room_id: streamResult.room_id,
      stream_id: streamResult.stream_id,
      status: streamResult.status,
      statusMessage: streamResult.statusMessage, // Include status message if available
      isReady: streamResult.isReady,
      pingStarted: streamResult.isReady
    };
  } catch (error) {
    console.error(`Error in main function: ${error.message}`);
    return { error: error.message };
  }
}

// Variable to track ping interval
let pingIntervalId = null;
let pingCount = 0;
const MAX_PING_COUNT = 60; // Maximum number of pings

/**
 * Start ping/anchor requests to maintain stream status
 * @param {string} room_id - Room ID
 * @param {string} stream_id - Stream ID
 * @param {string} mode - Mode type ("phone" or "auto")
 * @returns {boolean} - Whether the ping was started
 */
function startPingAnchor(room_id, stream_id, mode = "phone") {
  // Stop any existing ping interval
  stopPingAnchor();

  // Reset ping count
  pingCount = 0;

  console.log(`Starting ping/anchor requests for room_id: ${room_id}, stream_id: ${stream_id}, mode: ${mode}`);

  // Create a new interval to ping every 3 seconds
  pingIntervalId = setInterval(async () => {
    try {
      // Only call webcastStart if we haven't reached the maximum ping count
      if (pingCount < MAX_PING_COUNT) {
        // Increment ping count
        pingCount++;

        // Call webcastStart to maintain the stream
        const result = await webcastStart(room_id, stream_id, mode);

        // Log the result (only log every 10 pings to reduce console spam)
        if (pingCount % 10 === 0) {
          if (result.success) {
            console.log(`Ping/anchor request #${pingCount}/${MAX_PING_COUNT} successful`);
          } else {
            console.error(`Ping/anchor request #${pingCount}/${MAX_PING_COUNT} failed: ${result.error}`);
          }
        }

        // Log when we reach the maximum ping count
        if (pingCount === MAX_PING_COUNT) {
          console.log(`Reached maximum ping count (${MAX_PING_COUNT}), stopping ping/anchor requests but keeping interval active`);
        }
      }
    } catch (error) {
      // Only log errors every 10 pings to reduce console spam
      if (pingCount % 10 === 0 && pingCount < MAX_PING_COUNT) {
        console.error(`Error in ping/anchor request #${pingCount}: ${error.message}`);
      }
    }
  }, 3000); // Ping every 3 seconds

  return true;
}

/**
 * Stop ping/anchor requests
 * @returns {boolean} - Whether the ping was stopped
 */
function stopPingAnchor() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
    pingCount = 0;
    console.log('Ping/anchor requests stopped');
    return true;
  }
  return false;
}

// Export functions
export {
  getStreamURL,
  webcastStart,
  getStreamURLAndMaintain,
  continuouslyMaintainStream,
  readCookiesFromFile,
  main,
  startPingAnchor,
  stopPingAnchor,
  cliMain
};

// Run the CLI main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cliMain().catch(console.error);
}
