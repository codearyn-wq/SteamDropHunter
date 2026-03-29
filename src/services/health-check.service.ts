import express, { Request, Response } from 'express';
import { DatabaseService } from '../database';
import { SchedulerService } from '../services/scheduler.service';
import { logger } from '../utils/logger';

export class HealthCheckService {
  private app: express.Application;
  private db: DatabaseService;
  private scheduler: SchedulerService;
  private startTime: number;

  constructor(db: DatabaseService, scheduler: SchedulerService) {
    this.app = express();
    this.db = db;
    this.scheduler = scheduler;
    this.startTime = Date.now();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Basic health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000)
      });
    });

    // Detailed health check with dependencies
    this.app.get('/health/detailed', (_req: Request, res: Response) => {
      try {
        const stats = this.db.getStats();
        const queueStats = this.scheduler.getQueueStats();
        const isSchedulerRunning = this.scheduler.isSchedulerRunning();

        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          scheduler: {
            running: isSchedulerRunning
          },
          queue: Promise.resolve(queueStats),
          database: {
            connected: true,
            stats
          }
        };

        res.json(health);
      } catch (error) {
        logger.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Readiness check
    this.app.get('/ready', (_req: Request, res: Response) => {
      const isSchedulerRunning = this.scheduler.isSchedulerRunning();
      
      if (isSchedulerRunning) {
        res.json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          reason: 'Scheduler not running'
        });
      }
    });

    // Liveness check
    this.app.get('/live', (_req: Request, res: Response) => {
      res.json({
        status: 'alive',
        timestamp: new Date().toISOString()
      });
    });

    // API stats endpoint
    this.app.get('/api/stats', (_req: Request, res: Response) => {
      try {
        const stats = this.db.getStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API endpoint to get current free games
    this.app.get('/api/free-games', (_req: Request, res: Response) => {
      try {
        const games = this.db.getActiveFreeGames();
        res.json({
          success: true,
          count: games.length,
          data: games
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API endpoint to trigger manual check (protected)
    this.app.get('/api/trigger-check', async (req: Request, res: Response) => {
      try {
        const apiKey = req.headers['x-api-key'];
        const expectedKey = process.env.API_KEY;

        if (expectedKey && apiKey !== expectedKey) {
          res.status(401).json({
            success: false,
            error: 'Unauthorized'
          });
          return;
        }

        await this.scheduler.triggerCheck();
        res.json({
          success: true,
          message: 'Check triggered'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.info('Health check routes initialized');
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number, host: string = '0.0.0.0'): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        logger.info(`Health check server listening on ${host}:${port}`);
        resolve();
      });
    });
  }
}
