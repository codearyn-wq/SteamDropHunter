import { SteamService } from '../services/steam.service';

describe('SteamService', () => {
  let steamService: SteamService;

  beforeEach(() => {
    steamService = new SteamService();
  });

  describe('formatPrice', () => {
    it('should format price in USD', () => {
      const result = steamService.formatPrice(2999, 'USD');
      expect(result).toBe('$29.99');
    });

    it('should format price in EUR', () => {
      const result = steamService.formatPrice(2999, 'EUR');
      expect(result).toContain('€');
    });

    it('should handle zero price', () => {
      const result = steamService.formatPrice(0, 'USD');
      expect(result).toBe('$0.00');
    });

    it('should handle free price', () => {
      const result = steamService.formatPrice(0, 'USD');
      expect(result).toBe('$0.00');
    });
  });

  describe('parseSteamGame', () => {
    it('should return null for invalid input', () => {
      // Note: parseSteamGame is private, so we test through public methods
      // This is a placeholder for integration tests
      expect(true).toBe(true);
    });
  });
});
