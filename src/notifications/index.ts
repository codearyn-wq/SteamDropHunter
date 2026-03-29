import TelegramBot from 'node-telegram-bot-api';
import { FreeGame, User } from '../types';
import { DatabaseService } from '../database';
import { logger } from '../utils/logger';
import { SteamService } from '../services/steam.service';

export class NotificationService {
  private bot: TelegramBot;
  private db: DatabaseService;
  private steamService: SteamService;

  constructor(db: DatabaseService, steamService: SteamService) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      logger.warn('Telegram bot token not provided. Notifications will be disabled.');
      this.bot = null as unknown as TelegramBot;
    } else {
      this.bot = new TelegramBot(token, { polling: false });
    }
    
    this.db = db;
    this.steamService = steamService;
  }

  /**
   * Send notification about new free games to all subscribed users
   */
  public async notifyNewFreeGames(game: FreeGame): Promise<void> {
    const subscribedUsers = this.db.getSubscribedUsers();
    
    if (subscribedUsers.length === 0) {
      logger.info('No subscribed users to notify');
      return;
    }

    const message = this.buildGameMessage(game);
    const photoUrl = game.header_image || game.large_capsule_image;

    for (const user of subscribedUsers) {
      try {
        await this.sendNotification(user, message, photoUrl);
        this.db.logNotification(game.id, user.id, true);
        logger.debug(`Notification sent to user ${user.telegram_id} for game ${game.title}`);
      } catch (error) {
        logger.error(`Failed to notify user ${user.telegram_id}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.db.logNotification(game.id, user.id, false);
      }
    }

    // Mark game as notified in database
    this.db.markGameAsNotified(game.id);
  }

  /**
   * Send notification about ended promotions
   */
  public async notifyPromotionEnded(game: FreeGame): Promise<void> {
    const subscribedUsers = this.db.getSubscribedUsers();
    
    if (subscribedUsers.length === 0) {
      return;
    }

    const message = `❌ <b>Promotion Ended</b>\n\n` +
      `<b>${this.escapeHtml(game.title)}</b>\n` +
      `The free promotion has ended. The game is no longer available for free.\n\n` +
      `<a href="${game.window_discount_url}">Steam Page</a>`;

    for (const user of subscribedUsers) {
      try {
        await this.sendNotification(user, message);
        logger.debug(`Promotion ended notification sent to user ${user.telegram_id}`);
      } catch (error) {
        logger.error(`Failed to send ended promotion notification to user ${user.telegram_id}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Send a message to a specific user
   */
  private async sendNotification(user: User, message: string, photoUrl?: string): Promise<void> {
    if (!this.bot) {
      logger.warn('Telegram bot not initialized, skipping notification');
      return;
    }

    const chatId = user.telegram_id;

    if (photoUrl && photoUrl.startsWith('http')) {
      await this.bot.sendPhoto(chatId, photoUrl, {
        caption: message,
        parse_mode: 'HTML'
      });
    } else {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
    }
  }

  /**
   * Build HTML message for a free game
   */
  private buildGameMessage(game: FreeGame): string {
    const originalPrice = this.steamService.formatPrice(game.original_price, game.currency);
    const timeDetected = new Date(game.timestamp_detected * 1000).toLocaleString();

    return `🎁 <b>FREE GAME ALERT!</b>\n\n` +
      `<b>${this.escapeHtml(game.title)}</b>\n\n` +
      `💰 Original Price: <s>${originalPrice}</s>\n` +
      `🏷️ Discount: <b>-100%</b>\n` +
      `⏰ Detected: ${timeDetected}\n\n` +
      `🔗 <a href="${game.window_discount_url}">Get it on Steam</a>\n\n` +
      `<i>Claim it now while it's still free!</i>`;
  }

  /**
   * Get current free games message for /free command
   */
  public buildCurrentFreeGamesMessage(games: FreeGame[]): string {
    if (games.length === 0) {
      return '🔍 <b>No Free Games Currently</b>\n\n' +
        'There are no paid games available for free at the moment.\n' +
        'Subscribe to get notified when new free promotions are detected!';
    }

    let message = `🎁 <b>Current Free Games (${games.length})</b>\n\n`;

    for (const game of games) {
      const originalPrice = this.steamService.formatPrice(game.original_price, game.currency);
      message += `🎮 <b>${this.escapeHtml(game.title)}</b>\n` +
        `💰 Was: <s>${originalPrice}</s>\n` +
        `🔗 <a href="${game.window_discount_url}">Steam</a>\n\n`;
    }

    message += '<i>Click the links to claim the games on Steam!</i>';

    return message;
  }

  /**
   * Build welcome message for /start command
   */
  public buildWelcomeMessage(user: User): string {
    return `👋 <b>Welcome to Steam Drop Hunter!</b>\n\n` +
      `I'm a bot that monitors Steam for temporarily free paid games and notifies you instantly.\n\n` +
      `<b>Commands:</b>\n` +
      `/free - Show current free games\n` +
      `/subscribe - Enable notifications\n` +
      `/unsubscribe - Disable notifications\n` +
      `/stats - View bot statistics\n\n` +
      `🔔 You are currently ${user.subscribed ? '✅ subscribed' : '❌ not subscribed'} to notifications.\n\n` +
      `<i>Never miss a free game again!</i>`;
  }

  /**
   * Build stats message
   */
  public buildStatsMessage(): string {
    const stats = this.db.getStats();
    
    return `📊 <b>Bot Statistics</b>\n\n` +
      `🎮 Games Tracked: ${stats.totalGames}\n` +
      `🎁 Active Promotions: ${stats.activePromotions}\n` +
      `👥 Total Users: ${stats.totalUsers}\n` +
      `🔔 Subscribed Users: ${stats.subscribedUsers}\n` +
      `📬 Notifications Sent: ${stats.totalNotifications}`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get the Telegram bot instance
   */
  public getBot(): TelegramBot {
    return this.bot;
  }

  /**
   * Check if bot is initialized
   */
  public isInitialized(): boolean {
    return !!this.bot;
  }
}
