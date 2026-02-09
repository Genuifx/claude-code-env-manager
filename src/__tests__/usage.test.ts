import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getModelPrice,
  calculateCost,
  formatTokens,
  formatCost,
  getTotalTokens,
} from '../usage.js';
import type { TokenUsage, ModelPrice } from '../types.js';

describe('usage', () => {
  describe('getModelPrice', () => {
    const mockPrices: Record<string, ModelPrice> = {
      'claude-sonnet-4-5': {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 15e-6,
        cache_read_input_token_cost: 0.3e-6,
        cache_creation_input_token_cost: 3.75e-6,
      },
      'claude-haiku-4-5': {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 5e-6,
        cache_read_input_token_cost: 0.1e-6,
        cache_creation_input_token_cost: 1.25e-6,
      },
      'claude-opus-4-5': {
        input_cost_per_token: 5e-6,
        output_cost_per_token: 25e-6,
        cache_read_input_token_cost: 0.5e-6,
        cache_creation_input_token_cost: 6.25e-6,
      },
    };

    it('should return exact match', () => {
      const price = getModelPrice('claude-sonnet-4-5', mockPrices);
      expect(price.input_cost_per_token).toBe(3e-6);
    });

    it('should normalize model name with date suffix', () => {
      const price = getModelPrice('claude-sonnet-4-5-20250929', mockPrices);
      expect(price.input_cost_per_token).toBe(3e-6);
    });

    it('should fallback to sonnet for unknown model', () => {
      const price = getModelPrice('unknown-model', mockPrices);
      expect(price).toBeDefined();
    });

    it('should match haiku model', () => {
      const price = getModelPrice('claude-haiku-4-5-20251001', mockPrices);
      expect(price.input_cost_per_token).toBe(1e-6);
    });

    it('should match opus model', () => {
      const price = getModelPrice('claude-opus-4-5-20251101', mockPrices);
      expect(price.input_cost_per_token).toBe(5e-6);
    });
  });

  describe('calculateCost', () => {
    const price: ModelPrice = {
      input_cost_per_token: 3e-6,
      output_cost_per_token: 15e-6,
      cache_read_input_token_cost: 0.3e-6,
      cache_creation_input_token_cost: 3.75e-6,
    };

    it('should calculate cost correctly', () => {
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 100,
        cacheCreationTokens: 50,
      };

      const cost = calculateCost(usage, price);
      // 1000 * 3e-6 + 500 * 15e-6 + 100 * 0.3e-6 + 50 * 3.75e-6
      // = 0.003 + 0.0075 + 0.00003 + 0.0001875
      // = 0.0107175
      expect(cost).toBeCloseTo(0.0107175, 6);
    });

    it('should handle zero tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      };

      const cost = calculateCost(usage, price);
      expect(cost).toBe(0);
    });

    it('should handle missing cache costs', () => {
      const priceWithoutCache: ModelPrice = {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 15e-6,
      };

      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 100,
        cacheCreationTokens: 50,
      };

      const cost = calculateCost(usage, priceWithoutCache);
      // 1000 * 3e-6 + 500 * 15e-6 + 0 + 0
      expect(cost).toBeCloseTo(0.0105, 6);
    });
  });

  describe('formatTokens', () => {
    it('should format millions', () => {
      expect(formatTokens(1_500_000)).toBe('1.5M');
      expect(formatTokens(2_000_000)).toBe('2.0M');
    });

    it('should format thousands', () => {
      expect(formatTokens(1_500)).toBe('1.5K');
      expect(formatTokens(50_000)).toBe('50.0K');
    });

    it('should format small numbers', () => {
      expect(formatTokens(500)).toBe('500');
      expect(formatTokens(0)).toBe('0');
    });
  });

  describe('formatCost', () => {
    it('should format large costs', () => {
      expect(formatCost(10.5)).toBe('$10.50');
      expect(formatCost(1.234)).toBe('$1.23');
    });

    it('should format small costs', () => {
      expect(formatCost(0.05)).toBe('$0.05');
      expect(formatCost(0.01)).toBe('$0.01');
    });

    it('should format very small costs', () => {
      expect(formatCost(0.001)).toBe('$0.0010');
      expect(formatCost(0.0001)).toBe('$0.0001');
    });
  });

  describe('getTotalTokens', () => {
    it('should sum all token types', () => {
      const usage: TokenUsage = {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 20,
        cacheCreationTokens: 10,
      };

      expect(getTotalTokens(usage)).toBe(180);
    });

    it('should handle zero tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      };

      expect(getTotalTokens(usage)).toBe(0);
    });
  });
});
