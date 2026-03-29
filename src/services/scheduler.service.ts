import cron from 'node-cron';
import { SteamService } from './steam.service';
import { FilterEngine } from '../filters/filter.engine';
import { DatabaseService } from '../database';
import { NotificationService } from '../notifications';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export class SchedulerService {
  private steamService: SteamService;
  private filterEngine: FilterEngine;
  private db: DatabaseService;
  private notificationService: NotificationService;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    db: DatabaseService,
    steamService: SteamService,
    filterEngine: FilterEngine,
    notificationService: NotificationService
  ) {
    this.db = db;
    this.steamService = steamService;
    this.filterEngine = filterEngine;
    this.notificationService = notificationService;

    logger.info('Scheduler service initialized (cron-based)');
  }

  /**
   * Start the scheduler
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting scheduler service');

    // Schedule job every 5 minutes
    const intervalMinutes = config.polling.intervalMs / 60000;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.cronJob = cron.schedule(cronExpression, () => {
      this.processJob();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Run initial check immediately
    await this.processJob();

    logger.info(`Scheduler started with ${intervalMinutes} minute interval`);
  }

  /**
   * Stop the scheduler
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping scheduler service');

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    logger.info('Scheduler service stopped');
  }

  /**
   * Process a scheduled job
   */
  private async processJob(): Promise<void> {
    logger.info('Starting Steam free games check');

    try {
      // Fetch games from Steam
      const games = await this.steamService.getFeaturedGames();
      logger.info(`Fetched ${games.length} games from Steam`);

      // Filter for 100% discount games (excluding F2P)
      const freeGames = this.filterEngine.filterFreeGames(games);
      logger.info(`Found ${freeGames.length} free games after filtering`);

      // Detect changes
      const changes = this.filterEngine.detectChanges(freeGames);

      // Process new free games
      for (const game of changes.newFreeGames) {
        // Save to database
        this.db.insertGame(game);
        
        // Create promotion history
        this.db.createPromotionHistory(game.id, game.timestamp_detected);

        // Send notifications
        await this.notificationService.notifyNewFreeGames(game);
      }

      // Process ended promotions
      for (const game of changes.endedPromotions) {
        this.db.markPromotionEnded(game.id);
        await this.notificationService.notifyPromotionEnded(game);
      }

      // Log summary
      logger.info('Steam check completed', {
        newFreeGames: changes.newFreeGames.length,
        endedPromotions: changes.endedPromotions.length,
        updatedGames: changes.updatedGames.length
      });

    } catch (error) {
      logger.error('Error processing Steam check job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Manually trigger a check
   */
  public async triggerCheck(): Promise<void> {
    await this.processJob();
    logger.info('Manual check triggered');
  }

  /**
   * Check if scheduler is running
   */
  public isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}
