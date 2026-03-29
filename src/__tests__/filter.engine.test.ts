import { FilterEngine } from '../filters/filter.engine';
import { SteamGame } from '../types';

describe('FilterEngine', () => {
  let filterEngine: FilterEngine;

  beforeEach(() => {
    filterEngine = new FilterEngine();
  });

  const createMockGame = (overrides: Partial<SteamGame> = {}): SteamGame => ({
    id: 123456,
    title: 'Test Game',
    discounted: true,
    discount_percent: 100,
    original_price: 2999,
    final_price: 0,
    currency: 'USD',
    large_capsule_image: 'https://example.com/image.jpg',
    small_capsule_image: 'https://example.com/image_small.jpg',
    window_discount_url: 'https://store.steampowered.com/app/123456',
    header_image: 'https://example.com/header.jpg',
    is_free: false,
    ...overrides
  });

  describe('filterFreeGames', () => {
    it('should return games with 100% discount', () => {
      const games = [
        createMockGame({ id: 1, discount_percent: 100 }),
        createMockGame({ id: 2, discount_percent: 50 }),
        createMockGame({ id: 3, discount_percent: 100 })
      ];

      const result = filterEngine.filterFreeGames(games);

      expect(result).toHaveLength(2);
      expect(result.every(g => g.discount_percent === 100)).toBe(true);
    });

    it('should exclude free-to-play games', () => {
      const games = [
        createMockGame({ id: 1, is_free: false, discount_percent: 100 }),
        createMockGame({ id: 2, is_free: true, discount_percent: 100 })
      ];

      const result = filterEngine.filterFreeGames(games);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should exclude games with original price of 0', () => {
      const games = [
        createMockGame({ id: 1, original_price: 2999, discount_percent: 100 }),
        createMockGame({ id: 2, original_price: 0, discount_percent: 100 })
      ];

      const result = filterEngine.filterFreeGames(games);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should exclude games that are not discounted', () => {
      const games = [
        createMockGame({ id: 1, discounted: true, discount_percent: 100 }),
        createMockGame({ id: 2, discounted: false, discount_percent: 100 })
      ];

      const result = filterEngine.filterFreeGames(games);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('detectChanges', () => {
    it('should detect new free games', () => {
      const currentGames = [
        { ...createMockGame({ id: 1 }), timestamp_detected: 1000, notified: false }
      ];

      const result = filterEngine.detectChanges(currentGames);

      expect(result.newFreeGames).toHaveLength(1);
      expect(result.newFreeGames[0].id).toBe(1);
    });

    it('should detect ended promotions', () => {
      // Initialize state with a game
      const previousGame = { ...createMockGame({ id: 1 }), timestamp_detected: 1000, notified: false };
      filterEngine.initializeState([previousGame]);

      // Game is no longer in current list (promotion ended)
      const currentGames: any[] = [];

      const result = filterEngine.detectChanges(currentGames);

      expect(result.endedPromotions).toHaveLength(1);
      expect(result.endedPromotions[0].id).toBe(1);
    });

    it('should handle empty game list', () => {
      const result = filterEngine.detectChanges([]);

      expect(result.newFreeGames).toHaveLength(0);
      expect(result.endedPromotions).toHaveLength(0);
      expect(result.updatedGames).toHaveLength(0);
    });
  });

  describe('initializeState', () => {
    it('should initialize state from existing games', () => {
      const games = [
        { ...createMockGame({ id: 1 }), timestamp_detected: 1000, notified: false },
        { ...createMockGame({ id: 2 }), timestamp_detected: 1000, notified: false }
      ];

      filterEngine.initializeState(games);

      expect(filterEngine.getTrackedGamesCount()).toBe(2);
    });
  });
});
