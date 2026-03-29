/**
 * Keep-Alive Service
 * Prevents Render free tier from sleeping by pinging the server periodically
 */

import { logger } from './utils/logger';

const PING_INTERVAL_MS = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '240000', 10); // 4 minutes (Render sleeps after 15 min)
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

async function pingServer(): Promise<void> {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SteamDropHunter-KeepAlive/1.0'
      }
    });

    if (response.ok) {
      logger.info('Keep-alive ping successful', {
        status: response.status,
        url: SERVER_URL
      });
    } else {
      logger.warn('Keep-alive ping returned non-OK status', {
        status: response.status
      });
    }
  } catch (error) {
    logger.error('Keep-alive ping failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: SERVER_URL
    });
  }
}

function startKeepAlive(): void {
  logger.info('Keep-alive service started', {
    interval: PING_INTERVAL_MS / 1000,
    serverUrl: SERVER_URL
  });

  // Initial ping
  pingServer();

  // Schedule periodic pings
  setInterval(() => {
    pingServer();
  }, PING_INTERVAL_MS);
}

// Start the keep-alive service
startKeepAlive();
