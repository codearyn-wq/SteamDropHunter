import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { SteamService } from './steam.service';
import { FilterEngine } from '../filters/filter.engine';
import { DatabaseService } from '../database';
import { NotificationService } from '../notifications';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export class SchedulerService {
  private queue: Queue;
  private worker: Worker;
  private steamService: SteamService;
  private filterEngine: FilterEngine;
  private db: DatabaseService;
  private notificationService: NotificationService;
  private isRunning: boolean = false;

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

    // Initialize Redis connection
    const connection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection retries exceeded, using in-memory fallback');
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });

    connection.on('error', (error) => {
      logger.error('Redis connection error', {
        error: error.message
      });
    });

    connection.on('connect', () => {
      logger.info('Redis connection established');
    });

    // Initialize BullMQ queue
    this.queue = new Queue('steam-drop-hunter', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    // Initialize worker
    this.worker = new Worker(
      'steam-drop-hunter',
      async (job: Job) => this.processJob(job),
      {
        connection,
        concurrency: 1 // Only one job at a time to prevent race conditions
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed`, {
        jobId: job.id,
        duration: (job.finishedOn || 0) - (job.processedOn || 0)
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed`, {
        jobId: job?.id,
        error: error.message
      });
    });

    logger.info('Scheduler service initialized');
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

    // Add initial job
    await this.queue.add('check-steam', {}, {
      repeat: {
        every: config.polling.intervalMs
      }
    });

    // Also add immediate job to start right away
    await this.queue.add('check-steam', {});

    logger.info(`Scheduler started with ${config.polling.intervalMs / 1000}s interval`);
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

    await this.queue.close();
    await this.worker.close();

    logger.info('Scheduler service stopped');
  }

  /**
   * Process a scheduled job
   */
  private async processJob(job: Job): Promise<void> {
    logger.info('Starting Steam free games check', { jobId: job.id });

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
    await this.queue.add('check-steam', {}, { priority: 1 });
    logger.info('Manual check triggered');
  }

  /**
   * Get queue stats
   */
  public async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Check if scheduler is running
   */
  public isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}
