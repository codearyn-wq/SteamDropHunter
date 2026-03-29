import TelegramBot from 'node-telegram-bot-api';
import { DatabaseService } from '../database';
import { NotificationService } from '../notifications';
import { logger } from '../utils/logger';

export class TelegramBotService {
  private bot: TelegramBot;
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      logger.warn('Telegram bot token not provided. Bot will not start.');
      this.bot = null as unknown as TelegramBot;
    } else {
      this.bot = new TelegramBot(token, { polling: true });
    }
    
    this.db = db;
    this.notificationService = notificationService;
    
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    if (!this.bot) {
      return;
    }

    // /start command
    this.bot.onText(/\/start/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = chatId.toString();
        
        // Get or create user
        let user = this.db.getUserByTelegramId(telegramId);
        if (!user) {
          user = this.db.createUser(
            telegramId,
            msg.from?.username,
            msg.from?.first_name,
            msg.from?.last_name
          );
        }
        
        const message = this.notificationService.buildWelcomeMessage(user);
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
      } catch (error) {
        logger.error('Error handling /start command', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // /free command - show current free games
    this.bot.onText(/\/free/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const games = this.db.getActiveFreeGames();
        const message = this.notificationService.buildCurrentFreeGamesMessage(games);
        
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
      } catch (error) {
        logger.error('Error handling /free command', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // /subscribe command
    this.bot.onText(/\/subscribe/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = chatId.toString();
        
        let user = this.db.getUserByTelegramId(telegramId);
        if (!user) {
          user = this.db.createUser(
            telegramId,
            msg.from?.username,
            msg.from?.first_name,
            msg.from?.last_name
          );
        }
        
        user = this.db.updateUserSubscription(telegramId, true);
        
        await this.bot.sendMessage(chatId, 
          '✅ <b>Subscribed!</b>\n\n' +
          'You will now receive instant notifications when new free games are detected.',
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        logger.error('Error handling /subscribe command', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // /unsubscribe command
    this.bot.onText(/\/unsubscribe/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = chatId.toString();
        
        const user = this.db.getUserByTelegramId(telegramId);
        if (user) {
          this.db.updateUserSubscription(telegramId, false);
        }
        
        await this.bot.sendMessage(chatId,
          '❌ <b>Unsubscribed</b>\n\n' +
          'You will no longer receive notifications about new free games.',
          { parse_mode: 'HTML' }
        );
      } catch (error) {
        logger.error('Error handling /unsubscribe command', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // /stats command
    this.bot.onText(/\/stats/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const message = this.notificationService.buildStatsMessage();
        
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'HTML'
        });
      } catch (error) {
        logger.error('Error handling /stats command', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // /help command
    this.bot.onText(/\/help/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const message = 
          '<b>Steam Drop Hunter - Help</b>\n\n' +
          'This bot monitors Steam for temporarily free paid games and notifies you instantly.\n\n' +
          '<b>Available Commands:</b>\n' +
          '/start - Welcome message and bot info\n' +
          '/free - Show current free games\n' +
          '/subscribe - Enable notifications\n' +
          '/unsubscribe - Disable notifications\n' +
          '/stats - View bot statistics\n' +
          '/help - Show this help message\n\n' +
          '<b>How it works:</b>\n' +
          '1. The bot checks Steam every 5 minutes\n' +
          '2. When a paid game becomes 100% free, it\'s detected\n' +
          '3. Subscribed users receive instant notifications\n' +
          '4. Click the link in the notification to claim the game\n\n' +
          '<i>Note: Free-to-play games are not included in notifications.</i>';
        
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'HTML'
        });
      } catch (error) {
        logger.error('Error handling /help command', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Telegram bot handlers initialized');
  }

  /**
   * Get the bot instance
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

  /**
   * Send a test message to admin
   */
  public async sendAdminMessage(message: string): Promise<void> {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    
    if (!adminId || !this.bot) {
      return;
    }

    try {
      await this.bot.sendMessage(adminId, message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      logger.error('Failed to send admin message', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
