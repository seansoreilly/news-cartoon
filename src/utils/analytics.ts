/**
 * Google Analytics event tracking.
 *
 * Thin typed wrapper around the global `gtag` function. Page views are sent
 * automatically by the `gtag('config', ...)` call in index.html, so only
 * custom events go through here.
 *
 * Events are only sent from the production hostnames so preview deployments,
 * localhost and *.vercel.app traffic don't pollute GA reports.
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4/events
 */
import type { IAppError } from '../types/error';
import { logger } from './logger';

const PRODUCTION_HOSTNAMES: readonly string[] = ['newscartoon.lol', 'www.newscartoon.lol'];

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: object) => void;
  }
}

export type GenerationMode = 'express' | 'wizard';
export type GenerationErrorType = 'rate_limit' | 'validation' | 'other';
export type ShareMethod = 'twitter' | 'facebook' | 'linkedin' | 'copy_link';

/** Event names and their parameters. Keep in sync with GA4 custom dimensions. */
export interface AnalyticsEvents {
  /** Primary conversion: a cartoon image was generated. */
  cartoon_generated: { mode: GenerationMode };
  cartoon_generation_failed: {
    mode: GenerationMode;
    error_type: GenerationErrorType;
    failed_phase: 'news' | 'concept' | 'script' | 'image';
  };
  cartoon_downloaded: { mode: GenerationMode };
  gallery_published: Record<string, never>;
  gallery_publish_failed: Record<string, never>;
  /** GA4 recommended event. */
  share: { method: ShareMethod; content_type: 'cartoon' };
}

/** True when the hostname is one of the production hostnames. */
export const isProductionHostname = (hostname: string): boolean =>
  PRODUCTION_HOSTNAMES.includes(hostname);

const shouldSend = (): boolean =>
  typeof window !== 'undefined' &&
  isProductionHostname(window.location.hostname) &&
  typeof window.gtag === 'function';

/** Buckets an app error into a low-cardinality GA parameter value. */
export const classifyError = (error: IAppError): GenerationErrorType => {
  if (error.statusCode === 429 || error.code === 'RATE_LIMIT_ERROR' || /rate limit/i.test(error.message)) {
    return 'rate_limit';
  }
  if (error.code === 'VALIDATION_ERROR') return 'validation';
  return 'other';
};

/**
 * Sends a custom event to Google Analytics.
 *
 * Off the production hostnames the event is logged to the console instead.
 * Never throws.
 */
export const track = <K extends keyof AnalyticsEvents>(
  eventName: K,
  params: AnalyticsEvents[K]
): void => {
  if (!shouldSend()) {
    logger.debug(`[Analytics Event]: ${eventName}`, params);
    return;
  }

  try {
    window.gtag?.('event', eventName, params);
  } catch (error) {
    logger.error(`[Analytics]: Failed to track event "${eventName}":`, error);
  }
};
