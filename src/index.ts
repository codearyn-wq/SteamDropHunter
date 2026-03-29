import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger';
import { DatabaseService } from './database';
import { SteamService } from './services/steam.service';
import { FilterEngine } from './filters/filter.engine';
import { NotificationService } from './notifications';
import { TelegramBotService } from './services/telegram-bot.service';
import { SchedulerService } from './services/scheduler.service';
import { HealthCheckService } from './services/health-check.service';
import { config } from './utils/config';

// Load environment variables
dotenv.config();

class Application {
  private db: DatabaseService;
  private steamService: SteamService;
  private filterEngine: FilterEngine;
  private notificationService: NotificationService;
  private telegramBotService: TelegramBotService;
  private schedulerService: SchedulerService;
  private healthCheckService: HealthCheckService;
  private isShuttingDown: boolean = false;

  constructor() {
    logger.info('Initializing Steam Drop Hunter...');

    // Ensure data directory exists
    const dataDir = path.dirname(config.database.path);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }

    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      logger.info(`Created logs directory: ${logsDir}`);
    }

    // Initialize services
    this.db = new DatabaseService(config.database.path);
    this.steamService = new SteamService();
    this.filterEngine = new FilterEngine();
    this.notificationService = new NotificationService(this.db, this.steamService);
    this.telegramBotService = new TelegramBotService(this.db, this.notificationService);
    this.schedulerService = new SchedulerService(
      this.db,
      this.steamService,
      this.filterEngine,
      this.notificationService
    );
    this.healthCheckService = new HealthCheckService(this.db, this.schedulerService);

    // Initialize previous state from database
    this.initializeState();

    this.setupGracefulShutdown();
  }

  private initializeState(): void {
    const activeGames = this.db.getActiveFreeGames();
    this.filterEngine.initializeState(activeGames);
    logger.info(`Initialized state with ${activeGames.length} active free games`);
  }

  public async start(): Promise<void> {
    logger.info('Starting Steam Drop Hunter...');

    try {
      // Start health check server
      await this.healthCheckService.start(config.server.port, config.server.host);

      // Start scheduler
      await this.schedulerService.start();

      logger.info('Steam Drop Hunter started successfully!');

      // Send startup notification to admin
      if (this.telegramBotService.isInitialized()) {
        await this.telegramBotService.sendAdminMessage(
          '✅ <b>Steam Drop Hunter Started</b>\n\n' +
          `The bot is now running and monitoring Steam for free games.\n\n` +
          `Health check: http://${config.server.host}:${config.server.port}/health`
        );
      }
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down Steam Drop Hunter...');

    try {
      // Stop scheduler
      await this.schedulerService.stop();

      // Close database connection
      this.db.close();

      logger.info('Steam Drop Hunter stopped gracefully');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      this.stop().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason)
      });
      this.stop().then(() => process.exit(1));
    });
  }
}

// Start application
const app = new Application();

app.start().catch((error) => {
  logger.error('Failed to start application', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
