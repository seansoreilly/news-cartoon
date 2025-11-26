/**
 * Location-to-Mainstream-News-Sources Data Structure
 *
 * This file contains a mapping of major cities to their most authoritative local news sources.
 * Sources are ranked based on Google News's authority ranking algorithm and local market dominance.
 *
 * Schema:
 * - sourceName: Display name of the news outlet
 * - domain: Canonical domain (lowercase, no www prefix)
 * - authorityRank: 1 = highest authority, ascending order
 * - countryCode: ISO 3166-1 alpha-2 country code for Google News gl parameter
 * - languageCode: BCP 47 language tag for Google News hl parameter
 */

export interface NewsSource {
  sourceName: string;
  domain: string;
  authorityRank: number;
}

export interface CityNewsConfig {
  sources: NewsSource[];
  countryCode: string;
  languageCode: string;
}

export type LocationNewsSourcesMap = Record<string, CityNewsConfig>;

/**
 * Mainstream news sources by city, ordered by authority rank.
 * Sources with lower authorityRank values are considered more authoritative.
 */
export const LOCATION_NEWS_SOURCES: LocationNewsSourcesMap = {
  // Australia
  Melbourne: {
    countryCode: 'AU',
    languageCode: 'en-AU',
    sources: [
      { sourceName: 'The Age', domain: 'theage.com.au', authorityRank: 1 },
      { sourceName: 'Herald Sun', domain: 'heraldsun.com.au', authorityRank: 2 },
      { sourceName: 'The Guardian Australia', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'The Australian', domain: 'theaustralian.com.au', authorityRank: 4 },
      { sourceName: 'ABC News', domain: 'abc.net.au', authorityRank: 5 },
      { sourceName: '9News', domain: '9news.com.au', authorityRank: 6 },
      { sourceName: '7NEWS', domain: '7news.com.au', authorityRank: 7 },
    ],
  },
  Sydney: {
    countryCode: 'AU',
    languageCode: 'en-AU',
    sources: [
      { sourceName: 'Sydney Morning Herald', domain: 'smh.com.au', authorityRank: 1 },
      { sourceName: 'Daily Telegraph', domain: 'dailytelegraph.com.au', authorityRank: 2 },
      { sourceName: 'The Guardian Australia', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'The Australian', domain: 'theaustralian.com.au', authorityRank: 4 },
      { sourceName: 'ABC News', domain: 'abc.net.au', authorityRank: 5 },
      { sourceName: '9News', domain: '9news.com.au', authorityRank: 6 },
      { sourceName: '7NEWS', domain: '7news.com.au', authorityRank: 7 },
    ],
  },
  Brisbane: {
    countryCode: 'AU',
    languageCode: 'en-AU',
    sources: [
      { sourceName: 'The Courier Mail', domain: 'couriermail.com.au', authorityRank: 1 },
      { sourceName: 'Brisbane Times', domain: 'brisbanetimes.com.au', authorityRank: 2 },
      { sourceName: 'The Guardian Australia', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'ABC News', domain: 'abc.net.au', authorityRank: 4 },
      { sourceName: '9News', domain: '9news.com.au', authorityRank: 5 },
      { sourceName: '7NEWS', domain: '7news.com.au', authorityRank: 6 },
    ],
  },
  Perth: {
    countryCode: 'AU',
    languageCode: 'en-AU',
    sources: [
      { sourceName: 'The West Australian', domain: 'thewest.com.au', authorityRank: 1 },
      { sourceName: 'WAtoday', domain: 'watoday.com.au', authorityRank: 2 },
      { sourceName: 'The Guardian Australia', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'ABC News', domain: 'abc.net.au', authorityRank: 4 },
      { sourceName: '9News', domain: '9news.com.au', authorityRank: 5 },
      { sourceName: '7NEWS', domain: '7news.com.au', authorityRank: 6 },
    ],
  },
  Adelaide: {
    countryCode: 'AU',
    languageCode: 'en-AU',
    sources: [
      { sourceName: 'The Advertiser', domain: 'adelaidenow.com.au', authorityRank: 1 },
      { sourceName: 'InDaily', domain: 'indaily.com.au', authorityRank: 2 },
      { sourceName: 'The Guardian Australia', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'ABC News', domain: 'abc.net.au', authorityRank: 4 },
      { sourceName: '9News', domain: '9news.com.au', authorityRank: 5 },
      { sourceName: '7NEWS', domain: '7news.com.au', authorityRank: 6 },
    ],
  },
  Canberra: {
    countryCode: 'AU',
    languageCode: 'en-AU',
    sources: [
      { sourceName: 'The Canberra Times', domain: 'canberratimes.com.au', authorityRank: 1 },
      { sourceName: 'ABC News', domain: 'abc.net.au', authorityRank: 2 },
      { sourceName: 'The Guardian Australia', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'The Australian', domain: 'theaustralian.com.au', authorityRank: 4 },
      { sourceName: '9News', domain: '9news.com.au', authorityRank: 5 },
    ],
  },

  // United States
  'New York': {
    countryCode: 'US',
    languageCode: 'en-US',
    sources: [
      { sourceName: 'The New York Times', domain: 'nytimes.com', authorityRank: 1 },
      { sourceName: 'New York Post', domain: 'nypost.com', authorityRank: 2 },
      { sourceName: 'Wall Street Journal', domain: 'wsj.com', authorityRank: 3 },
      { sourceName: 'New York Daily News', domain: 'nydailynews.com', authorityRank: 4 },
      { sourceName: 'Gothamist', domain: 'gothamist.com', authorityRank: 5 },
      { sourceName: 'NBC New York', domain: 'nbcnewyork.com', authorityRank: 6 },
      { sourceName: 'ABC7 New York', domain: 'abc7ny.com', authorityRank: 7 },
    ],
  },
  'Los Angeles': {
    countryCode: 'US',
    languageCode: 'en-US',
    sources: [
      { sourceName: 'Los Angeles Times', domain: 'latimes.com', authorityRank: 1 },
      { sourceName: 'LA Daily News', domain: 'dailynews.com', authorityRank: 2 },
      { sourceName: 'KTLA', domain: 'ktla.com', authorityRank: 3 },
      { sourceName: 'NBC Los Angeles', domain: 'nbclosangeles.com', authorityRank: 4 },
      { sourceName: 'ABC7 Los Angeles', domain: 'abc7.com', authorityRank: 5 },
      { sourceName: 'LAist', domain: 'laist.com', authorityRank: 6 },
    ],
  },
  Chicago: {
    countryCode: 'US',
    languageCode: 'en-US',
    sources: [
      { sourceName: 'Chicago Tribune', domain: 'chicagotribune.com', authorityRank: 1 },
      { sourceName: 'Chicago Sun-Times', domain: 'suntimes.com', authorityRank: 2 },
      { sourceName: 'Block Club Chicago', domain: 'blockclubchicago.org', authorityRank: 3 },
      { sourceName: 'NBC Chicago', domain: 'nbcchicago.com', authorityRank: 4 },
      { sourceName: 'ABC7 Chicago', domain: 'abc7chicago.com', authorityRank: 5 },
      { sourceName: 'WGN TV', domain: 'wgntv.com', authorityRank: 6 },
    ],
  },
  'San Francisco': {
    countryCode: 'US',
    languageCode: 'en-US',
    sources: [
      { sourceName: 'San Francisco Chronicle', domain: 'sfchronicle.com', authorityRank: 1 },
      { sourceName: 'SF Gate', domain: 'sfgate.com', authorityRank: 2 },
      { sourceName: 'The San Francisco Standard', domain: 'sfstandard.com', authorityRank: 3 },
      { sourceName: 'NBC Bay Area', domain: 'nbcbayarea.com', authorityRank: 4 },
      { sourceName: 'ABC7 Bay Area', domain: 'abc7news.com', authorityRank: 5 },
      { sourceName: 'KQED', domain: 'kqed.org', authorityRank: 6 },
    ],
  },

  // United Kingdom
  London: {
    countryCode: 'GB',
    languageCode: 'en-GB',
    sources: [
      { sourceName: 'BBC News', domain: 'bbc.com', authorityRank: 1 },
      { sourceName: 'The Guardian', domain: 'theguardian.com', authorityRank: 2 },
      { sourceName: 'The Times', domain: 'thetimes.com', authorityRank: 3 },
      { sourceName: 'Evening Standard', domain: 'standard.co.uk', authorityRank: 4 },
      { sourceName: 'The Telegraph', domain: 'telegraph.co.uk', authorityRank: 5 },
      { sourceName: 'The Independent', domain: 'independent.co.uk', authorityRank: 6 },
      { sourceName: 'Sky News', domain: 'news.sky.com', authorityRank: 7 },
    ],
  },
  Manchester: {
    countryCode: 'GB',
    languageCode: 'en-GB',
    sources: [
      { sourceName: 'Manchester Evening News', domain: 'manchestereveningnews.co.uk', authorityRank: 1 },
      { sourceName: 'BBC News', domain: 'bbc.com', authorityRank: 2 },
      { sourceName: 'The Guardian', domain: 'theguardian.com', authorityRank: 3 },
      { sourceName: 'The Times', domain: 'thetimes.com', authorityRank: 4 },
      { sourceName: 'Sky News', domain: 'news.sky.com', authorityRank: 5 },
    ],
  },

  // Canada
  Toronto: {
    countryCode: 'CA',
    languageCode: 'en-CA',
    sources: [
      { sourceName: 'Toronto Star', domain: 'thestar.com', authorityRank: 1 },
      { sourceName: 'Globe and Mail', domain: 'theglobeandmail.com', authorityRank: 2 },
      { sourceName: 'CBC News', domain: 'cbc.ca', authorityRank: 3 },
      { sourceName: 'National Post', domain: 'nationalpost.com', authorityRank: 4 },
      { sourceName: 'CTV News', domain: 'ctvnews.ca', authorityRank: 5 },
      { sourceName: 'BlogTO', domain: 'blogto.com', authorityRank: 6 },
    ],
  },
  Vancouver: {
    countryCode: 'CA',
    languageCode: 'en-CA',
    sources: [
      { sourceName: 'Vancouver Sun', domain: 'vancouversun.com', authorityRank: 1 },
      { sourceName: 'The Province', domain: 'theprovince.com', authorityRank: 2 },
      { sourceName: 'CBC News', domain: 'cbc.ca', authorityRank: 3 },
      { sourceName: 'Global News', domain: 'globalnews.ca', authorityRank: 4 },
      { sourceName: 'CTV News', domain: 'ctvnews.ca', authorityRank: 5 },
      { sourceName: 'Daily Hive', domain: 'dailyhive.com', authorityRank: 6 },
    ],
  },

  // New Zealand
  Auckland: {
    countryCode: 'NZ',
    languageCode: 'en-NZ',
    sources: [
      { sourceName: 'NZ Herald', domain: 'nzherald.co.nz', authorityRank: 1 },
      { sourceName: 'Stuff', domain: 'stuff.co.nz', authorityRank: 2 },
      { sourceName: 'RNZ', domain: 'rnz.co.nz', authorityRank: 3 },
      { sourceName: 'Newshub', domain: 'newshub.co.nz', authorityRank: 4 },
      { sourceName: '1 News', domain: '1news.co.nz', authorityRank: 5 },
    ],
  },
  Wellington: {
    countryCode: 'NZ',
    languageCode: 'en-NZ',
    sources: [
      { sourceName: 'Stuff', domain: 'stuff.co.nz', authorityRank: 1 },
      { sourceName: 'NZ Herald', domain: 'nzherald.co.nz', authorityRank: 2 },
      { sourceName: 'RNZ', domain: 'rnz.co.nz', authorityRank: 3 },
      { sourceName: 'Newshub', domain: 'newshub.co.nz', authorityRank: 4 },
      { sourceName: '1 News', domain: '1news.co.nz', authorityRank: 5 },
    ],
  },
};

/**
 * Get all domains for a given city as a Set for efficient lookup.
 */
export function getMainstreamDomainsForCity(cityName: string): Set<string> {
  const normalizedCity = normalizeCity(cityName);
  const cityConfig = LOCATION_NEWS_SOURCES[normalizedCity];

  if (!cityConfig) {
    return new Set();
  }

  return new Set(cityConfig.sources.map(source => source.domain.toLowerCase()));
}

/**
 * Get all mainstream domains across all cities.
 */
export function getAllMainstreamDomains(): Set<string> {
  const allDomains = new Set<string>();

  for (const cityConfig of Object.values(LOCATION_NEWS_SOURCES)) {
    for (const source of cityConfig.sources) {
      allDomains.add(source.domain.toLowerCase());
    }
  }

  return allDomains;
}

/**
 * Get the city configuration including country and language codes.
 */
export function getCityConfig(cityName: string): CityNewsConfig | null {
  const normalizedCity = normalizeCity(cityName);
  return LOCATION_NEWS_SOURCES[normalizedCity] || null;
}

/**
 * Normalize a city name for lookup (title case).
 */
export function normalizeCity(cityName: string): string {
  return cityName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a domain is a mainstream source for the given city.
 */
export function isMainstreamSource(domain: string, cityName: string): boolean {
  const mainstreamDomains = getMainstreamDomainsForCity(cityName);
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  return mainstreamDomains.has(normalizedDomain);
}

/**
 * Get the authority rank for a domain in a specific city.
 * Returns null if the domain is not a mainstream source for that city.
 */
export function getAuthorityRank(domain: string, cityName: string): number | null {
  const normalizedCity = normalizeCity(cityName);
  const cityConfig = LOCATION_NEWS_SOURCES[normalizedCity];

  if (!cityConfig) {
    return null;
  }

  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  const source = cityConfig.sources.find(
    s => s.domain.toLowerCase() === normalizedDomain
  );

  return source?.authorityRank ?? null;
}

/**
 * Get all supported city names.
 */
export function getSupportedCities(): string[] {
  return Object.keys(LOCATION_NEWS_SOURCES);
}

/**
 * Default configuration for fallback when city is not found.
 */
export const DEFAULT_CONFIG: CityNewsConfig = {
  countryCode: 'US',
  languageCode: 'en-US',
  sources: [],
};
