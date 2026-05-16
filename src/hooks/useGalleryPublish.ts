import { useState } from 'react';
import { useCartoonStore } from '../store/cartoonStore';
import { useNewsStore } from '../store/newsStore';
import { uploadToGallery } from '../services/galleryService';

export type PublishStatus = 'idle' | 'success' | 'error';

export interface UseGalleryPublishResult {
  publish: () => Promise<void>;
  isPublishing: boolean;
  publishStatus: PublishStatus;
  publishError: string | null;
  resetPublish: () => void;
}

export function useGalleryPublish(): UseGalleryPublishResult {
  const { imagePath, cartoon, selectedConceptIndex } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  const selectedConcept = cartoon && selectedConceptIndex !== null && cartoon.ideas[selectedConceptIndex]
    ? cartoon.ideas[selectedConceptIndex]
    : undefined;

  const publish = async (): Promise<void> => {
    if (!imagePath || !selectedConcept || !selectedArticles.length) {
      setPublishError('Missing required data for publishing');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setPublishStatus('idle');

    try {
      const firstArticle = selectedArticles[0];
      const result = await uploadToGallery(
        imagePath,
        selectedConcept.title,
        firstArticle.url,
        firstArticle.source.name
      );

      if (result.success) {
        setPublishStatus('success');
      } else {
        setPublishStatus('error');
        setPublishError(result.error ?? 'Failed to publish to gallery');
      }
    } catch (err) {
      setPublishStatus('error');
      setPublishError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsPublishing(false);
    }
  };

  const resetPublish = (): void => {
    setPublishStatus('idle');
    setPublishError(null);
  };

  return { publish, isPublishing, publishStatus, publishError, resetPublish };
}
