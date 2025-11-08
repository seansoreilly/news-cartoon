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
