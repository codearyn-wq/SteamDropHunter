You are a senior full-stack developer and system architect.

Your task is to design and implement a production-ready 24/7 bot that monitors Steam for temporarily free paid games (NOT free-to-play games).

## 🎯 Main Goal
Create a bot that continuously tracks paid games on Steam that become FREE (100% discount) for a limited time and notifies users instantly.

## ⚠️ Important Logic
- Only include games that:
  - Have discount_percent = 100
  - Were previously paid (exclude is_free = true games)
- Do NOT include Free-to-Play games

## 📡 Data Sources
Use a combination of:
1. Steam API:
   https://store.steampowered.com/api/featuredcategories
2. SteamDB (optional scraping or API if available)
3. Fallback parsing of:
   https://store.steampowered.com/search/?specials=1

## 🏗️ Architecture Requirements

### Backend
- Node.js (TypeScript preferred)
- Use a modular architecture:
  - services/
  - scrapers/
  - filters/
  - notifications/
  - database/

### Core Modules
1. Fetch Service
   - Fetch data every X minutes (configurable, default: 5 min)
2. Filter Engine
   - Detect new free promotions (compare with previous state)
3. Database
   - Store:
     - game_id
     - title
     - timestamp_detected
     - notified (boolean)
4. Notification System
   - Telegram bot (required)
   - Optional: Discord webhook

### Scheduler
- Use:
  - node-cron OR
  - BullMQ (preferred for scalability)

### Deployment (24/7)
- Must be deployable on:
  - VPS (Ubuntu)
  - OR Docker container
- Include:
  - Dockerfile
  - docker-compose.yml
- Ensure:
  - Auto-restart
  - Logging
  - Error handling

## 🤖 Telegram Bot Features
- /start — welcome message
- /free — show current free games
- /subscribe — enable notifications
- /unsubscribe — disable notifications

### Notification Format
Send message like:
- Game title
- Original price
- Discount (-100%)
- Link to Steam page
- Time left (if possible)

## 🌐 Optional Frontend
- React dashboard
- Shows:
  - active giveaways
  - history
  - stats

## 🔥 Advanced Features (IMPORTANT)
- Avoid duplicate notifications
- Detect when a giveaway ends
- Track history of free promotions
- Add caching layer (Redis optional)
- Add rate limiting protection

## 📦 Output Requirements
Generate:
1. Full folder structure
2. Complete backend code
3. Telegram bot implementation
4. Deployment instructions (step-by-step)
5. Environment variables example (.env)
6. Docker setup
7. Optional frontend (React)

## 🧪 Bonus
- Add unit tests
- Add logging (Winston or similar)
- Add health check endpoint

## ⚡ Priority
Focus on:
1. Stability (24/7 uptime)
2. Accuracy (no false positives)
3. Performance

Write clean, production-level code.