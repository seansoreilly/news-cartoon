import type { CartoonImage, CartoonConcept } from '../../types/cartoon';
import type { ImageCacheEntry } from './types';

export class ImageCacheService {
    private imageCache: Map<string, ImageCacheEntry> = new Map();
    private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

    buildCacheKey(concept: CartoonConcept): string {
        return `image_${concept.title.replace(/\s+/g, '_').toLowerCase()}`;
    }

    get(key: string): CartoonImage | null {
        const entry = this.imageCache.get(key);
        if (!entry) {
            return null;
        }

        const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION_MS;
        if (isExpired) {
            this.imageCache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(key: string, data: CartoonImage): void {
        this.imageCache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    clear(): void {
        this.imageCache.clear();
    }
}
