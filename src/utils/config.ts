export const config = {
  steam: {
    featuredUrl: 'https://store.steampowered.com/api/featuredcategories',
    searchUrl: 'https://store.steampowered.com/search/',
    appDetailsUrl: 'https://store.steampowered.com/api/appdetails/'
  },
  polling: {
    intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '300000', 10), // 5 minutes default
    retryDelayMs: 5000,
    maxRetries: 3
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || ''
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  },
  server: {
    port: parseInt(process.env.SERVER_PORT || '3000', 10),
    host: process.env.SERVER_HOST || '0.0.0.0'
  },
  database: {
    path: process.env.DATABASE_PATH || './data/steam_drop_hunter.db'
  }
};
