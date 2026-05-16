import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface UseGeneratedImageUrlResult {
  blobUrl: string | null;
}

export function useGeneratedImageUrl(imagePath: string | null): UseGeneratedImageUrlResult {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let url: string | null = null;
    try {
      const byteString = atob(imagePath.split(',')[1]);
      const mimeString = imagePath.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      url = URL.createObjectURL(blob);
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      logger.error('[useGeneratedImageUrl] Failed to create blob URL:', error);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imagePath]);

  return { blobUrl };
}
