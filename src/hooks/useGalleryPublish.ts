import { useState } from 'react';
import { useCartoonStore } from '../store/cartoonStore';
import { useNewsStore } from '../store/newsStore';
import { uploadToGallery } from '../services/galleryService';
import { createAppError, type IAppError } from '../types/error';

export type PublishStatus = 'idle' | 'success' | 'error';

export interface UseGalleryPublishResult {
  publish: () => Promise<void>;
  isPublishing: boolean;
  publishStatus: PublishStatus;
  publishError: IAppError | null;
  resetPublish: () => void;
}

export function useGalleryPublish(): UseGalleryPublishResult {
  const { imagePath, cartoon, selectedConceptIndex } = useCartoonStore();
  const { selectedArticles } = useNewsStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [publishError, setPublishError] = useState<IAppError | null>(null);

  const selectedConcept = cartoon && selectedConceptIndex !== null && cartoon.ideas[selectedConceptIndex]
    ? cartoon.ideas[selectedConceptIndex]
    : undefined;

  const publish = async (): Promise<void> => {
    if (!imagePath || !selectedConcept || !selectedArticles.length) {
      setPublishStatus('error');
      setPublishError(createAppError('VALIDATION_ERROR', 'Missing required data for publishing', 400));
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
        setPublishError(
          createAppError(
            result.code ?? 'GALLERY_ERROR',
            result.error ?? 'Failed to publish to gallery',
            result.statusCode ?? 500,
            { userFacing: true }
          )
        );
      }
    } catch (err) {
      setPublishStatus('error');
      setPublishError(
        createAppError('GALLERY_ERROR', err instanceof Error ? err.message : 'Unknown error occurred', 500, {
          userFacing: true,
        })
      );
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
