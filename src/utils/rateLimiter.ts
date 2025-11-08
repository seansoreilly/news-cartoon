/**
 * Rate limiter for image generation
 * Limits to 2 images per minute per session
 */
export class ImageGenerationRateLimiter {
  private static readonly IMAGE_GENERATION_LIMIT = 2;
  private static readonly MINUTE_IN_MS = 60 * 1000;
  private static imageGenerationTimestamps: number[] = [];

  /**
   * Check if image generation is allowed
   */
  static canGenerateImage(): boolean {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.imageGenerationTimestamps = this.imageGenerationTimestamps.filter(
      (timestamp) => now - timestamp < this.MINUTE_IN_MS,
    );

    return this.imageGenerationTimestamps.length < this.IMAGE_GENERATION_LIMIT;
  }

  /**
   * Record an image generation
   */
  static recordImageGeneration(): void {
    this.imageGenerationTimestamps.push(Date.now());
  }

  /**
   * Get time in milliseconds until next image can be generated
   */
  static getTimeUntilNextGeneration(): number {
    if (
      this.imageGenerationTimestamps.length < this.IMAGE_GENERATION_LIMIT
    ) {
      return 0;
    }

    const oldestTimestamp = Math.min(...this.imageGenerationTimestamps);
    const timeElapsed = Date.now() - oldestTimestamp;
    return Math.max(0, this.MINUTE_IN_MS - timeElapsed);
  }

  /**
   * Get number of remaining generations this minute
   */
  static getRemainingGenerations(): number {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.imageGenerationTimestamps = this.imageGenerationTimestamps.filter(
      (timestamp) => now - timestamp < this.MINUTE_IN_MS,
    );

    return Math.max(
      0,
      this.IMAGE_GENERATION_LIMIT - this.imageGenerationTimestamps.length,
    );
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  static reset(): void {
    this.imageGenerationTimestamps = [];
  }
}

export default ImageGenerationRateLimiter;
