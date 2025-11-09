import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImageGenerationRateLimiter } from '../rateLimiter';

describe('ImageGenerationRateLimiter', () => {
  beforeEach(() => {
    // Reset rate limiter before each test
    ImageGenerationRateLimiter.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canGenerateImage', () => {
    it('should allow first image generation', () => {
      const canGenerate = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerate).toBe(true);
    });

    it('should allow second image generation within limit', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      const canGenerate = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerate).toBe(true);
    });

    it('should block third image generation within minute', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();
      const canGenerate = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerate).toBe(false);
    });

    it('should allow generation after minute has passed', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      const canGenerate = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerate).toBe(true);
    });

    it('should properly clean old timestamps', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      // Advance time by 61 seconds (past the 60-second limit)
      vi.advanceTimersByTime(61 * 1000);

      // Now canGenerateImage should clean up old timestamps
      const canGenerate = ImageGenerationRateLimiter.canGenerateImage();

      expect(canGenerate).toBe(true);
      // Verify that old timestamps were cleaned up
      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(2);
    });
  });

  describe('recordImageGeneration', () => {
    it('should record image generation timestamp', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(1);
    });

    it('should record multiple generations', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();
      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(0);
    });

    it('should not exceed limit', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();
      // Third record should still work but checking if generation is allowed
      const canGenerate = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerate).toBe(false);
    });
  });

  describe('getTimeUntilNextGeneration', () => {
    it('should return 0 when under limit', () => {
      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      expect(timeUntilNext).toBe(0);
    });

    it('should return 0 when only one generation recorded', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      expect(timeUntilNext).toBe(0);
    });

    it('should return wait time when limit is reached', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();

      // Should be approximately 60 seconds (60000ms)
      expect(timeUntilNext).toBeGreaterThan(0);
      expect(timeUntilNext).toBeLessThanOrEqual(60000);
    });

    it('should decrease time as time passes', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      const timeUntilNext1 = ImageGenerationRateLimiter.getTimeUntilNextGeneration();

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30 * 1000);

      const timeUntilNext2 = ImageGenerationRateLimiter.getTimeUntilNextGeneration();

      expect(timeUntilNext2).toBeLessThan(timeUntilNext1);
    });

    it('should return 0 after minute has passed', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      const timeUntilNext = ImageGenerationRateLimiter.getTimeUntilNextGeneration();
      expect(timeUntilNext).toBe(0);
    });
  });

  describe('getRemainingGenerations', () => {
    it('should return 2 when no generations recorded', () => {
      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(2);
    });

    it('should return 1 after one generation', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(1);
    });

    it('should return 0 after two generations', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();
      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(0);
    });

    it('should reset remaining after minute passes', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(0);

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(2);
    });

    it('should handle partial cleanup of timestamps', () => {
      ImageGenerationRateLimiter.recordImageGeneration();

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30 * 1000);

      ImageGenerationRateLimiter.recordImageGeneration();

      // At this point, first timestamp is 30 seconds old, second is new
      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(0);

      // Advance another 31 seconds (total 61 from first timestamp)
      vi.advanceTimersByTime(31 * 1000);

      // Now first timestamp should be cleaned, leaving only the second
      const remaining = ImageGenerationRateLimiter.getRemainingGenerations();
      expect(remaining).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all timestamps', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(0);

      ImageGenerationRateLimiter.reset();

      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(2);
    });

    it('should allow generations after reset', () => {
      ImageGenerationRateLimiter.recordImageGeneration();
      ImageGenerationRateLimiter.recordImageGeneration();

      const canGenerateBefore = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerateBefore).toBe(false);

      ImageGenerationRateLimiter.reset();

      const canGenerateAfter = ImageGenerationRateLimiter.canGenerateImage();
      expect(canGenerateAfter).toBe(true);
    });

    it('should be idempotent', () => {
      ImageGenerationRateLimiter.reset();
      ImageGenerationRateLimiter.reset();

      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(2);
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(true);
    });
  });

  describe('Complete Usage Scenarios', () => {
    it('should handle typical usage pattern', () => {
      // User generates first image
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(true);
      ImageGenerationRateLimiter.recordImageGeneration();

      // User generates second image
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(true);
      ImageGenerationRateLimiter.recordImageGeneration();

      // User tries to generate third image (blocked)
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(false);

      // Wait for minute to pass
      vi.advanceTimersByTime(61 * 1000);

      // User can generate again
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(true);
      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(2);
    });

    it('should handle rapid successive calls', () => {
      // Rapid calls should respect the limit
      for (let i = 0; i < 5; i++) {
        const canGenerate = ImageGenerationRateLimiter.canGenerateImage();
        if (i < 2) {
          expect(canGenerate).toBe(true);
          ImageGenerationRateLimiter.recordImageGeneration();
        } else {
          expect(canGenerate).toBe(false);
        }
      }
    });

    it('should handle staggered generations over time', () => {
      // Generate first image
      ImageGenerationRateLimiter.recordImageGeneration();
      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(1);

      // Wait 30 seconds
      vi.advanceTimersByTime(30 * 1000);

      // Generate second image
      ImageGenerationRateLimiter.recordImageGeneration();
      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(0);

      // Can't generate more immediately
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(false);

      // Wait another 31 seconds (total 61 from first)
      vi.advanceTimersByTime(31 * 1000);

      // First timestamp should be cleaned, can generate again
      expect(ImageGenerationRateLimiter.canGenerateImage()).toBe(true);
      expect(ImageGenerationRateLimiter.getRemainingGenerations()).toBe(1);
    });
  });
});
