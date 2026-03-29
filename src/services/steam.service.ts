import axios, { AxiosInstance } from 'axios';
import { SteamGame } from '../types';
import { logger } from '../utils/logger';

export class SteamService {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({
      baseURL: 'https://store.steampowered.com',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    this.httpClient.interceptors.response.use(
      response => response,
      error => {
        logger.error('Steam API request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * Fetch featured games from Steam API
   * This includes games with special discounts
   */
  public async getFeaturedGames(): Promise<SteamGame[]> {
    const games: SteamGame[] = [];

    try {
      const response = await this.httpClient.get('/api/featuredcategories');
      
      if (!response.data || typeof response.data !== 'object') {
        logger.warn('Invalid response from Steam featured API');
        return games;
      }

      // Extract games from different categories
      const categories = [
        response.data.specials?.items || [],
        response.data.featured_win?.items || [],
        response.data.featured_mac?.items || [],
        response.data.featured_linux?.items || []
      ];

      for (const category of categories) {
        for (const item of category) {
          const game = this.parseSteamGame(item);
          if (game) {
            games.push(game);
          }
        }
      }

      logger.info(`Fetched ${games.length} games from Steam featured API`);
    } catch (error) {
      logger.error('Failed to fetch featured games', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }

    return games;
  }

  /**
   * Fetch games from Steam search with specials filter
   * Fallback method if featured API doesn't return enough data
   */
  public async getSpecialsFromSearch(): Promise<SteamGame[]> {
    const games: SteamGame[] = [];

    try {
      const response = await this.httpClient.get('/search/', {
        params: {
          specials: '1',
          category2: 'Specials',
          count: '100',
          start: '0'
        }
      });

      // Parse HTML response to extract game data
      // This is a fallback and may need adjustment based on Steam's HTML structure
      const html = response.data;
      const gameMatches = html.match(/data-ds-appid="(\d+)"/g);

      if (gameMatches) {
        const appIds = [...new Set(gameMatches.map((match: string) => match.match(/(\d+)/)?.[1]).filter(Boolean))] as string[];
        
        // Fetch details for each app
        for (const appId of appIds.slice(0, 50)) { // Limit to prevent rate limiting
          try {
            const details = await this.getAppDetails(parseInt(appId, 10));
            if (details) {
              games.push(details);
            }
          } catch (error) {
            logger.debug(`Failed to fetch details for app ${appId}`, {
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      logger.info(`Fetched ${games.length} games from Steam search`);
    } catch (error) {
      logger.error('Failed to fetch games from search', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return games;
  }

  /**
   * Get detailed information for a specific app
   */
  public async getAppDetails(appId: number): Promise<SteamGame | null> {
    try {
      const response = await this.httpClient.get('/api/appdetails', {
        params: {
          appids: appId,
          cc: 'us'
        }
      });

      const data = response.data[appId];
      
      if (!data || data.success !== true) {
        return null;
      }

      const priceData = data.data?.price_overview;
      
      if (!priceData) {
        return null;
      }

      return {
        id: appId,
        title: data.data.name,
        discounted: priceData.discount_percent > 0,
        discount_percent: priceData.discount_percent,
        original_price: priceData.initial,
        final_price: priceData.final,
        currency: priceData.currency,
        large_capsule_image: data.data.header_image || '',
        small_capsule_image: data.data.header_image || '',
        window_discount_url: `https://store.steampowered.com/app/${appId}`,
        header_image: data.data.header_image || '',
        is_free: data.data.is_free || false,
        platform_windows: data.data.platforms?.windows || false,
        platform_mac: data.data.platforms?.mac || false,
        platform_linux: data.data.platforms?.linux || false
      };
    } catch (error) {
      logger.error(`Failed to fetch app details for ${appId}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Parse a Steam API game item into our standardized format
   */
  private parseSteamGame(item: any): SteamGame | null {
    if (!item || !item.id) {
      return null;
    }

    return {
      id: item.id,
      title: item.name || item.title || 'Unknown Game',
      discounted: item.discounted || false,
      discount_percent: item.discount_percent || 0,
      original_price: item.original_price || 0,
      final_price: item.final_price || 0,
      currency: item.currency || 'USD',
      large_capsule_image: item.large_capsule_image || item.large_capsule_image || '',
      small_capsule_image: item.small_capsule_image || item.small_capsule_image || '',
      window_discount_url: item.window_discount_url || `https://store.steampowered.com/app/${item.id}`,
      header_image: item.header_image || '',
      is_free: item.is_free || false,
      platform_windows: item.platforms?.windows || false,
      platform_mac: item.platforms?.mac || false,
      platform_linux: item.platforms?.linux || false
    };
  }

  /**
   * Format price from Steam's format (cents) to human readable
   */
  public formatPrice(priceCents: number, currency: string = 'USD'): string {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  }
}
