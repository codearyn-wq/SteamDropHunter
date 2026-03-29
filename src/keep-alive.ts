/**
 * Keep-Alive Service
 * Prevents Render free tier from sleeping by pinging the server periodically
 * Runs as a separate process from the main bot
 */

import axios from 'axios';

const PING_INTERVAL_MS = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '240000', 10); // 4 minutes
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

async function pingServer(): Promise<void> {
  try {
    const response = await axios.get(`${SERVER_URL}/health`, {
      headers: {
        'User-Agent': 'SteamDropHunter-KeepAlive/1.0'
      },
      timeout: 5000
    });

    if (response.status === 200) {
      console.log(`[${new Date().toISOString()}] ✓ Keep-alive ping successful`);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠ Keep-alive ping returned ${response.status}`);
    }
  } catch (error) {
    console.log(`[${new Date().toISOString()}] ✗ Keep-alive ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function startKeepAlive(): void {
  console.log(`[${new Date().toISOString()}] Keep-alive service started`);
  console.log(`  Interval: ${PING_INTERVAL_MS / 1000}s`);
  console.log(`  Server: ${SERVER_URL}`);

  // Initial ping
  pingServer();

  // Schedule periodic pings
  setInterval(() => {
    pingServer();
  }, PING_INTERVAL_MS);
}

// Start the keep-alive service
startKeepAlive();
