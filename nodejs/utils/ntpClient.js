const dgram = require('dgram');

/**
 * Simple NTP Client untuk sync time dengan NTP server
 * Menggunakan SNTP protocol (Simple Network Time Protocol)
 */

/**
 * Sync time dengan NTP server
 * @param {string} server - NTP server hostname (default: pool.ntp.org)
 * @param {number} timeout - Timeout dalam ms (default: 5000)
 * @returns {Promise<number>} - Offset dalam milliseconds (server time - local time)
 */
function syncTime(server = 'pool.ntp.org', timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    let timeoutHandle = null;
    let resolved = false;

    // NTP message buffer (48 bytes)
    const message = Buffer.alloc(48);
    
    // Set LI (Leap Indicator), VN (Version Number), Mode
    // LI = 0 (no warning), VN = 3 (NTPv3), Mode = 3 (client)
    message[0] = 0x1B; // 00 011 011 in binary
    
    // Record transmit timestamp (local time saat kirim request)
    const localTransmitTime = Date.now();

    // Setup timeout
    timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.close();
        reject(new Error(`NTP sync timeout after ${timeout}ms`));
      }
    }, timeout);

    // Handle response
    client.on('message', (msg) => {
      if (resolved) return;
      resolved = true;
      
      clearTimeout(timeoutHandle);
      client.close();

      try {
        // Record receive timestamp (local time saat terima response)
        const localReceiveTime = Date.now();

        // Parse NTP timestamps dari response
        // Transmit Timestamp (bytes 40-47): server time saat kirim response
        const serverTransmitSeconds = msg.readUInt32BE(40);
        const serverTransmitFraction = msg.readUInt32BE(44);
        
        // Convert NTP timestamp ke Unix timestamp (milliseconds)
        // NTP epoch: 1 Jan 1900, Unix epoch: 1 Jan 1970
        // Difference: 2208988800 seconds
        const NTP_EPOCH_OFFSET = 2208988800;
        const serverTime = (serverTransmitSeconds - NTP_EPOCH_OFFSET) * 1000 + 
                          (serverTransmitFraction / 0x100000000) * 1000;

        // Calculate offset
        // Simple calculation: server time - average of local transmit and receive time
        const localAverage = (localTransmitTime + localReceiveTime) / 2;
        const offset = Math.round(serverTime - localAverage);

        resolve(offset);
      } catch (error) {
        reject(new Error(`Failed to parse NTP response: ${error.message}`));
      }
    });

    // Handle errors
    client.on('error', (error) => {
      if (resolved) return;
      resolved = true;
      
      clearTimeout(timeoutHandle);
      client.close();
      reject(new Error(`NTP client error: ${error.message}`));
    });

    // Send request ke NTP server (port 123)
    client.send(message, 0, message.length, 123, server, (error) => {
      if (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          client.close();
          reject(new Error(`Failed to send NTP request: ${error.message}`));
        }
      }
    });
  });
}

/**
 * Sync dengan retry mechanism
 * @param {string} server - NTP server hostname
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} timeout - Timeout per attempt dalam ms (default: 5000)
 * @returns {Promise<number>} - Offset dalam milliseconds
 */
async function syncTimeWithRetry(server = 'pool.ntp.org', retries = 3, timeout = 5000) {
  let lastError = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const offset = await syncTime(server, timeout);
      return offset;
    } catch (error) {
      lastError = error;
      // Wait sebentar sebelum retry (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  syncTime,
  syncTimeWithRetry
};
