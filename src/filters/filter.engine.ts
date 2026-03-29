import { SteamGame, FreeGame } from '../types';
import { logger } from '../utils/logger';

export interface FilterResult {
  newFreeGames: FreeGame[];
  endedPromotions: FreeGame[];
  updatedGames: FreeGame[];
}

export class FilterEngine {
  private previousState: Map<number, SteamGame> = new Map();

  /**
   * Filter games to find 100% discount promotions
   * Excludes free-to-play games (is_free = true)
   */
  public filterFreeGames(games: SteamGame[]): FreeGame[] {
    const now = Math.floor(Date.now() / 1000);
    
    const freeGames = games.filter(game => {
      // Must have 100% discount
      if (game.discount_percent !== 100) {
        return false;
      }
      
      // Must be discounted
      if (!game.discounted) {
        return false;
      }
      
      // Must NOT be a free-to-play game
      if (game.is_free) {
        return false;
      }
      
      // Must have been previously paid (original price > 0)
      if (game.original_price <= 0) {
        return false;
      }
      
      return true;
    });

    logger.info(`Found ${freeGames.length} games with 100% discount (excluding F2P)`);
    
    return freeGames.map(game => ({
      ...game,
      timestamp_detected: now,
      notified: false
    }));
  }

  /**
   * Compare current state with previous state to detect changes
   */
  public detectChanges(currentGames: FreeGame[]): FilterResult {
    const result: FilterResult = {
      newFreeGames: [],
      endedPromotions: [],
      updatedGames: []
    };

    const currentMap = new Map(currentGames.map(g => [g.id, g]));

    // Detect new free games and updated games
    for (const game of currentGames) {
      const previousGame = this.previousState.get(game.id);
      
      if (!previousGame) {
        // New game detected
        result.newFreeGames.push(game);
        logger.info(`New free game detected: ${game.title} (ID: ${game.id})`);
      } else if (previousGame.discount_percent !== game.discount_percent) {
        // Game discount changed
        result.updatedGames.push(game);
        logger.debug(`Game discount updated: ${game.title} (ID: ${game.id})`);
      }
    }

    // Detect ended promotions
    for (const [id, previousGame] of this.previousState.entries()) {
      const currentGame = currentMap.get(id);
      
      // If game was previously 100% off but now isn't, promotion ended
      if (previousGame.discount_percent === 100 && (!currentGame || currentGame.discount_percent !== 100)) {
        result.endedPromotions.push(previousGame as FreeGame);
        logger.info(`Promotion ended: ${previousGame.title} (ID: ${id})`);
      }
    }

    // Update previous state
    this.previousState = currentMap;

    return result;
  }

  /**
   * Initialize previous state from database (for bot restart scenarios)
   */
  public initializeState(games: FreeGame[]): void {
    this.previousState = new Map(games.map(g => [g.id, g]));
    logger.info(`Initialized filter state with ${games.length} games`);
  }

  /**
   * Clear previous state
   */
  public clearState(): void {
    this.previousState.clear();
    logger.info('Cleared filter state');
  }

  /**
   * Get the number of games being tracked
   */
  public getTrackedGamesCount(): number {
    return this.previousState.size;
  }
}
