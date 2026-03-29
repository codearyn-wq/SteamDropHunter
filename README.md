# Steam Drop Hunter

A production-ready 24/7 bot that monitors Steam for temporarily free paid games and notifies users instantly via Telegram.

## Features

- 🔍 **Real-time Monitoring**: Checks Steam every 5 minutes (configurable)
- 🎁 **Smart Filtering**: Detects 100% discounts, excludes free-to-play games
- 📱 **Telegram Notifications**: Instant alerts to subscribed users
- 📊 **Statistics Dashboard**: Track active promotions and user metrics
- 🐳 **Docker Ready**: Easy deployment with Docker Compose
- ☁️ **Render Ready**: One-click deployment to Render
- 🔄 **Auto-restart**: Graceful shutdown and recovery
- 📝 **Logging**: Comprehensive logging with Winston
- 🏥 **Health Checks**: Multiple endpoints for monitoring
- ⚡ **Keep-Alive**: Built-in ping service to prevent sleep on free tiers

## Architecture

```
src/
├── database/          # SQLite database layer
├── services/          # Core services (Steam, Scheduler, Health, Bot)
├── filters/           # Game filtering engine
├── notifications/     # Telegram notification service
├── types/             # TypeScript type definitions
├── utils/             # Utilities (config, logger)
└── index.ts           # Application entry point
```

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Docker & Docker Compose (for containerized deployment)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_ADMIN_ID` - Your Telegram user ID for admin notifications

### 3. Run Development

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Build and Run

```bash
# Build the image
npm run docker:build

# Or directly
docker build -t steam-drop-hunter .

# Run with Docker Compose
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f steam-drop-hunter
```

### Stop

```bash
docker-compose down
```

## ☁️ Render Deployment (Free Tier)

### Option 1: One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Option 2: Manual Setup

### 1. Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Create New Web Service on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `steam-drop-hunter`
   - **Region**: Choose closest to you (e.g., Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: (leave blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Instance Type**: **Free**

### 3. Add Environment Variables

In Render dashboard, go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |
| `TELEGRAM_ADMIN_ID` | Your Telegram user ID |
| `POLL_INTERVAL_MS` | `300000` |
| `KEEP_ALIVE_INTERVAL_MS` | `240000` |
| `LOG_LEVEL` | `info` |
| `API_KEY` | Generate a secure random string |

### 4. Add Persistent Disk

In Render dashboard, go to **Disks** tab and add:

- **Name**: `steam-data`
- **Mount Path**: `/opt/render/project/src/data`
- **Size**: `1 GB` (free tier limit)

### 5. Deploy

Click **Create Web Service** and wait for deployment to complete.

### 6. Get Your App URL

After deployment, your app will be available at:
```
https://steam-drop-hunter.onrender.com
```

### 7. Configure Keep-Alive

The keep-alive service is already included. It will ping your server every 4 minutes to prevent Render from putting it to sleep.

**Important**: For the keep-alive to work, you need to set the `RENDER_EXTERNAL_URL` environment variable in Render:

1. Copy your app URL (e.g., `https://steam-drop-hunter.onrender.com`)
2. Add it as `RENDER_EXTERNAL_URL` environment variable
3. Redeploy the service

### 8. Verify Deployment

Visit your app URL and check:
- `/health` - Should return `{"status": "ok", ...}`
- `/api/stats` - Should show bot statistics

### Troubleshooting Render

**Service goes to sleep:**
- Ensure `RENDER_EXTERNAL_URL` is set correctly
- Check logs for keep-alive errors
- Consider upgrading to paid plan for no sleep

**Database errors:**
- Verify disk is mounted at `/opt/render/project/src/data`
- Check file permissions in logs

**Bot not working:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check Render logs for errors

## VPS Deployment (Ubuntu)

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Clone Repository

```bash
git clone <your-repo> steam-drop-hunter
cd steam-drop-hunter
npm install
npm run build
```

### 3. Configure Systemd Service

Create `/etc/systemd/system/steam-drop-hunter.service`:

```ini
[Unit]
Description=Steam Drop Hunter Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/steam-drop-hunter
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 4. Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable steam-drop-hunter
sudo systemctl start steam-drop-hunter
sudo systemctl status steam-drop-hunter
```

### 5. View Logs

```bash
sudo journalctl -u steam-drop-hunter -f
```

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and bot info |
| `/free` | Show current free games |
| `/subscribe` | Enable notifications |
| `/unsubscribe` | Disable notifications |
| `/stats` | View bot statistics |
| `/help` | Show help message |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /health/detailed` | Detailed health with stats |
| `GET /ready` | Readiness probe |
| `GET /live` | Liveness probe |
| `GET /api/stats` | Bot statistics |
| `GET /api/free-games` | Current free games list |
| `GET /api/trigger-check` | Manual check trigger (requires API key) |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | - | Telegram bot token |
| `TELEGRAM_ADMIN_ID` | - | Admin Telegram ID |
| `POLL_INTERVAL_MS` | 300000 | Check interval (ms) |
| `LOG_LEVEL` | info | Logging level |
| `SERVER_PORT` | 3000 | HTTP server port |
| `DATABASE_PATH` | ./data/... | SQLite database path |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `API_KEY` | - | API key for protected endpoints |

## Getting Your Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions to name your bot
4. Copy the token provided

## Getting Your Telegram User ID

1. Search for [@userinfobot](https://t.me/userinfobot)
2. Send any message
3. Copy your ID from the response

## Development

### Run Tests

```bash
npm test
npm run test:watch
```

### Lint

```bash
npm run lint
npm run lint:fix
```

## Troubleshooting

### Bot not starting

- Check if `TELEGRAM_BOT_TOKEN` is correct
- Verify Node.js version >= 18
- Check logs for error messages

### No notifications received

- Ensure you're subscribed (`/subscribe`)
- Check if bot token is valid
- Verify bot has permission to message you

### Redis connection errors

- Bot will work without Redis (uses in-memory queue)
- For production, ensure Redis is running

## License

MIT
