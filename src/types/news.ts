export interface NewsSource {
  name: string;
  url?: string;
}

export interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  source: NewsSource;
  publishedAt: string;
  content?: string;
  image?: string;
  author?: string;
  summary?: string;
  humorScore?: number;
  contentFetched?: boolean; // Track if we've attempted to fetch full content
  summaryLoading?: boolean; // Track if summary/humorScore is being loaded
  summaryError?: boolean; // Track if summary/humorScore failed to load
  authorityScore?: number; // 0-100 score based on position in Google News results
  isAuthoritative?: boolean; // True if in top 5 results (most authoritative)
  rankPosition?: number; // Position in Google News results (1 = most authoritative)
}

export interface NewsResponse {
  articles: NewsArticle[];
  totalArticles: number;
  topic?: string;
  location?: string;
  timestamp?: number;
}

export interface NewsData {
  articles: NewsArticle[];
  topic: string;
  date: string;
  location?: string;
}
