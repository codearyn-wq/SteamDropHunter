import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { User } from '../types';
import { logger } from '../utils/logger';

export interface Game {
  id: number;
  title: string;
  discounted: number;
  discount_percent: number;
  original_price: number;
  final_price: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  window_discount_url: string;
  header_image: string;
  is_free: number;
  platform_windows: number;
  platform_mac: number;
  platform_linux: number;
  timestamp_detected: number;
  notified: number;
  end_time: number | null;
  created_at: number;
  updated_at: number;
}

export interface FreeGame extends Omit<Game, 'is_free' | 'discounted' | 'notified' | 'platform_windows' | 'platform_mac' | 'platform_linux'> {
  is_free: boolean;
  discounted: boolean;
  notified: boolean;
  platform_windows: boolean;
  platform_mac: boolean;
  platform_linux: boolean;
}

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = './data/steam_drop_hunter.db') {
    this.dbPath = path.resolve(dbPath);
    this.init();
  }

  private async init(): Promise<void> {
    try {
      const SQL = await initSqlJs();
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info(`Created data directory: ${dataDir}`);
      }

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
        logger.info(`Loaded database from ${this.dbPath}`);
      } else {
        this.db = new SQL.Database();
        logger.info('Created new in-memory database');
      }

      this.initializeTables();
      this.save();
    } catch (error) {
      logger.error('Failed to initialize database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private initializeTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        discounted INTEGER NOT NULL,
        discount_percent INTEGER NOT NULL,
        original_price INTEGER NOT NULL,
        final_price INTEGER NOT NULL,
        currency TEXT NOT NULL,
        large_capsule_image TEXT,
        small_capsule_image TEXT,
        window_discount_url TEXT,
        header_image TEXT,
        is_free INTEGER NOT NULL,
        platform_windows INTEGER DEFAULT 0,
        platform_mac INTEGER DEFAULT 0,
        platform_linux INTEGER DEFAULT 0,
        timestamp_detected INTEGER NOT NULL,
        notified INTEGER NOT NULL DEFAULT 0,
        end_time INTEGER,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INT)),
        updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INT))
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        subscribed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INT)),
        updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INT))
      );

      CREATE TABLE IF NOT EXISTS notification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        sent_at INTEGER NOT NULL,
        success INTEGER NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS promotion_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE INDEX IF NOT EXISTS idx_games_timestamp ON games(timestamp_detected);
      CREATE INDEX IF NOT EXISTS idx_games_notified ON games(notified);
      CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_subscribed ON users(subscribed);
      CREATE INDEX IF NOT EXISTS idx_notification_logs_game ON notification_logs(game_id);
      CREATE INDEX IF NOT EXISTS idx_promotion_history_game ON promotion_history(game_id);
      CREATE INDEX IF NOT EXISTS idx_promotion_history_active ON promotion_history(is_active);
    `);
    logger.info('Database tables initialized');
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      logger.error('Failed to save database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Games operations
  public getGame(gameId: number): FreeGame | undefined {
    if (!this.db) return undefined;

    const stmt = this.db.prepare('SELECT * FROM games WHERE id = ?');
    stmt.bind([gameId]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return this.convertToFreeGame(row);
    }
    
    stmt.free();
    return undefined;
  }

  public getActiveFreeGames(): FreeGame[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM games 
      WHERE discount_percent = 100 
        AND is_free = 0 
        AND notified = 1
      ORDER BY timestamp_detected DESC
    `);
    
    const games: FreeGame[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      games.push(this.convertToFreeGame(row));
    }
    stmt.free();
    
    return games;
  }

  public getUnnotifiedFreeGames(): FreeGame[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM games 
      WHERE discount_percent = 100 
        AND is_free = 0 
        AND notified = 0
      ORDER BY timestamp_detected ASC
    `);
    
    const games: FreeGame[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      games.push(this.convertToFreeGame(row));
    }
    stmt.free();
    
    return games;
  }

  public insertGame(game: any): number {
    if (!this.db) return 0;

    const now = Math.floor(Date.now() / 1000);
    
    this.db.run(`
      INSERT OR REPLACE INTO games (
        id, title, discounted, discount_percent, original_price, final_price,
        currency, large_capsule_image, small_capsule_image, window_discount_url,
        header_image, is_free, platform_windows, platform_mac, platform_linux,
        timestamp_detected, notified, end_time, created_at, updated_at
      ) VALUES (
        @id, @title, @discounted, @discount_percent, @original_price, @final_price,
        @currency, @large_capsule_image, @small_capsule_image, @window_discount_url,
        @header_image, @is_free, @platform_windows, @platform_mac, @platform_linux,
        @timestamp_detected, @notified, @end_time, 
        COALESCE((SELECT created_at FROM games WHERE id = @id), @created_at), @updated_at
      )
    `, {
      ...game,
      is_free: game.is_free ? 1 : 0,
      discounted: game.discounted ? 1 : 0,
      platform_windows: game.platform_windows ? 1 : 0,
      platform_mac: game.platform_mac ? 1 : 0,
      platform_linux: game.platform_linux ? 1 : 0,
      notified: game.notified ? 1 : 0,
      created_at: now,
      updated_at: now
    });
    
    this.save();
    return game.id;
  }

  public markGameAsNotified(gameId: number): void {
    if (!this.db) return;

    const now = Math.floor(Date.now() / 1000);
    this.db.run(`
      UPDATE games SET notified = 1, updated_at = ?
      WHERE id = ?
    `, [now, gameId]);
    this.save();
  }

  public markPromotionEnded(gameId: number): void {
    if (!this.db) return;

    const now = Math.floor(Date.now() / 1000);
    this.db.run(`
      UPDATE games SET 
        discount_percent = 0,
        notified = 0,
        end_time = ?,
        updated_at = ?
      WHERE id = ?
    `, [now, now, gameId]);

    this.db.run(`
      UPDATE promotion_history SET 
        end_time = ?,
        is_active = 0
      WHERE game_id = ? AND is_active = 1
    `, [now, gameId]);
    
    this.save();
  }

  // User operations
  public getUserByTelegramId(telegramId: string): User | undefined {
    if (!this.db) return undefined;

    const stmt = this.db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    stmt.bind([telegramId]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        ...row,
        subscribed: row.subscribed === 1
      } as User;
    }
    
    stmt.free();
    return undefined;
  }

  public createUser(telegramId: string, username?: string, firstName?: string, lastName?: string): User {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = Math.floor(Date.now() / 1000);
    this.db.run(`
      INSERT INTO users (telegram_id, username, first_name, last_name, subscribed, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `, [telegramId, username || null, firstName || null, lastName || null, now, now]);
    this.save();
    
    return this.getUserByTelegramId(telegramId)!;
  }

  public updateUserSubscription(telegramId: string, subscribed: boolean): User | undefined {
    if (!this.db) return undefined;

    const now = Math.floor(Date.now() / 1000);
    this.db.run(`
      UPDATE users SET subscribed = ?, updated_at = ?
      WHERE telegram_id = ?
    `, [subscribed ? 1 : 0, now, telegramId]);
    this.save();
    
    return this.getUserByTelegramId(telegramId);
  }

  public getSubscribedUsers(): User[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM users WHERE subscribed = 1');
    const users: User[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      users.push({
        ...row,
        subscribed: true
      });
    }
    stmt.free();
    
    return users;
  }

  public getAllUsers(): User[] {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const users: User[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      users.push({
        ...row,
        subscribed: row.subscribed === 1
      });
    }
    stmt.free();
    
    return users;
  }

  // Notification log operations
  public logNotification(gameId: number, userId: number, success: boolean): void {
    if (!this.db) return;

    const now = Math.floor(Date.now() / 1000);
    this.db.run(`
      INSERT INTO notification_logs (game_id, user_id, sent_at, success)
      VALUES (?, ?, ?, ?)
    `, [gameId, userId, now, success ? 1 : 0]);
    this.save();
  }

  // Promotion history operations
  public createPromotionHistory(gameId: number, startTime: number): void {
    if (!this.db) return;

    this.db.run(`
      INSERT INTO promotion_history (game_id, start_time, is_active)
      VALUES (?, ?, 1)
    `, [gameId, startTime]);
    this.save();
  }

  public getPromotionHistory(gameId: number): any[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM promotion_history WHERE game_id = ? ORDER BY start_time DESC
    `);
    stmt.bind([gameId]);
    
    const history: any[] = [];
    while (stmt.step()) {
      history.push(stmt.getAsObject());
    }
    stmt.free();
    
    return history;
  }

  // Stats operations
  public getStats(): {
    totalGames: number;
    activePromotions: number;
    totalUsers: number;
    subscribedUsers: number;
    totalNotifications: number;
  } {
    if (!this.db) {
      return {
        totalGames: 0,
        activePromotions: 0,
        totalUsers: 0,
        subscribedUsers: 0,
        totalNotifications: 0
      };
    }

    const totalGames = this.db.exec('SELECT COUNT(*) as count FROM games')[0]?.values[0][0] as number || 0;
    const activePromotions = this.db.exec(
      'SELECT COUNT(*) as count FROM games WHERE discount_percent = 100 AND is_free = 0 AND notified = 1'
    )[0]?.values[0][0] as number || 0;
    const totalUsers = this.db.exec('SELECT COUNT(*) as count FROM users')[0]?.values[0][0] as number || 0;
    const subscribedUsers = this.db.exec('SELECT COUNT(*) as count FROM users WHERE subscribed = 1')[0]?.values[0][0] as number || 0;
    const totalNotifications = this.db.exec('SELECT COUNT(*) as count FROM notification_logs')[0]?.values[0][0] as number || 0;

    return {
      totalGames,
      activePromotions,
      totalUsers,
      subscribedUsers,
      totalNotifications
    };
  }

  public close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  private convertToFreeGame(row: any): FreeGame {
    return {
      ...row,
      is_free: row.is_free === 1,
      discounted: row.discounted === 1,
      notified: row.notified === 1,
      platform_windows: row.platform_windows === 1,
      platform_mac: row.platform_mac === 1,
      platform_linux: row.platform_linux === 1
    };
  }
}
