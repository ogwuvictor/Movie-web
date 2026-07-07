/**
 * Provider Link Service
 * 
 * Handles provider detection from TMDB, normalization of provider names,
 * and generation of outbound provider URLs with click tracking.
 * 
 * @author CineHub Team
 * @version 1.0.0
 */

// ===========================================
// PROVIDER NORMALIZATION MAP
// ===========================================
// Maps various TMDB provider names to our standardized provider keys
const PROVIDER_NORMALIZATION = {
  // Amazon variants
  'amazon prime video': 'amazon',
  'amazon video': 'amazon',
  'amazon': 'amazon',
  'prime video': 'amazon',
  
  // Apple TV variants
  'apple tv': 'apple',
  'apple tv plus': 'apple',
  'apple tv+': 'apple',
  'appletv': 'apple',
  
  // YouTube variants
  'youtube': 'youtube',
  'youtube premium': 'youtube',
  'youtube movies': 'youtube',
  
  // Netflix variants
  'netflix': 'netflix',
  
  // Other providers (for future expansion)
  'disney+': 'disney',
  'disney plus': 'disney',
  'hbo max': 'hbomax',
  'hulu': 'hulu',
  'paramount+': 'paramount',
  'peacock': 'peacock',
};

// ===========================================
// PROVIDER CONFIGURATION
// ===========================================
// URL patterns and configuration for each provider
const PROVIDER_CONFIG = {
  amazon: {
    name: 'Amazon Prime Video',
    buttonLabel: 'Watch on Amazon',
    baseUrl: 'https://www.amazon.com/s',
    queryParams: {
      k: '{title}',
      i: 'instant-video',
      tag: 'cinehub-20', // Replace with your actual Amazon affiliate tag
    },
    searchType: 'query',
  },
  apple: {
    name: 'Apple TV',
    buttonLabel: 'Find on Apple TV',
    baseUrl: 'https://tv.apple.com/search',
    queryParams: {
      term: '{title}',
      at: 'YOUR_APPLE_TOKEN', // Replace with your actual Apple affiliate token
    },
    searchType: 'query',
  },
  youtube: {
    name: 'YouTube',
    buttonLabel: 'Search on YouTube',
    baseUrl: 'https://www.youtube.com/results',
    queryParams: {
      search_query: '{title} movie',
    },
    searchType: 'query',
  },
  netflix: {
    name: 'Netflix',
    buttonLabel: 'Find on Netflix',
    baseUrl: 'https://www.netflix.com/search',
    queryParams: {
      q: '{title}',
    },
    searchType: 'query',
  },
};

// ===========================================
// SUPPORTED PROVIDERS
// ===========================================
const SUPPORTED_PROVIDERS = ['amazon', 'apple', 'youtube', 'netflix'];

/**
 * Normalize provider name from TMDB to our standardized key
 * @param {string} providerName - Provider name from TMDB
 * @returns {string|null} Normalized provider key or null if unsupported
 */
export const normalizeProviderName = (providerName) => {
  if (!providerName) return null;
  
  const normalizedName = providerName.toLowerCase().trim();
  return PROVIDER_NORMALIZATION[normalizedName] || null;
};

/**
 * Check if a provider is supported
 * @param {string} providerKey - Normalized provider key
 * @returns {boolean} True if provider is supported
 */
export const isProviderSupported = (providerKey) => {
  return SUPPORTED_PROVIDERS.includes(providerKey);
};

/**
 * Build provider URL with title
 * @param {string} providerKey - Normalized provider key
 * @param {string} title - Movie/TV show title
 * @returns {string|null} Full provider URL or null if provider not found
 */
export const buildProviderUrl = (providerKey, title) => {
  if (!providerKey || !title) return null;
  
  const config = PROVIDER_CONFIG[providerKey];
  if (!config) return null;
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(config.queryParams).forEach(([key, value]) => {
    const paramValue = value.replace('{title}', encodeURIComponent(title));
    queryParams.append(key, paramValue);
  });
  
  return `${config.baseUrl}?${queryParams.toString()}`;
};

/**
 * Get provider button label
 * @param {string} providerKey - Normalized provider key
 * @returns {string} Button label for the provider
 */
export const getProviderButtonLabel = (providerKey) => {
  const config = PROVIDER_CONFIG[providerKey];
  return config ? config.buttonLabel : 'Watch Now';
};

/**
 * Get provider display name
 * @param {string} providerKey - Normalized provider key
 * @returns {string} Display name for the provider
 */
export const getProviderDisplayName = (providerKey) => {
  const config = PROVIDER_CONFIG[providerKey];
  return config ? config.name : providerKey;
};

/**
 * Process TMDB providers and return supported providers with links
 * @param {object} tmdbProviders - Providers object from TMDB API
 * @param {string} title - Movie/TV show title
 * @returns {Array} Array of supported provider objects
 */
export const processProviders = (tmdbProviders, title) => {
  if (!tmdbProviders || !title) return [];
  
  const supportedProviders = [];
  
  // Check all regions for providers
  Object.entries(tmdbProviders).forEach(([regionCode, regionData]) => {
    if (!regionData) {
      return;
    }
    
    // Check flatrate (streaming)
    if (regionData.flatrate) {
      regionData.flatrate.forEach(provider => {
        const normalizedKey = normalizeProviderName(provider.provider_name);
        if (normalizedKey && isProviderSupported(normalizedKey)) {
          // Avoid duplicates
          const alreadyAdded = supportedProviders.some(p => p.key === normalizedKey);
          if (!alreadyAdded) {
            supportedProviders.push({
              key: normalizedKey,
              name: provider.provider_name,
              displayName: getProviderDisplayName(normalizedKey),
              buttonLabel: getProviderButtonLabel(normalizedKey),
              url: buildProviderUrl(normalizedKey, title),
              logoPath: provider.logo_path,
            });
          }
        }
      });
    }
    
    // Check rent
    if (regionData.rent) {
      regionData.rent.forEach(provider => {
        const normalizedKey = normalizeProviderName(provider.provider_name);
        if (normalizedKey && isProviderSupported(normalizedKey)) {
          const alreadyAdded = supportedProviders.some(p => p.key === normalizedKey);
          if (!alreadyAdded) {
            supportedProviders.push({
              key: normalizedKey,
              name: provider.provider_name,
              displayName: getProviderDisplayName(normalizedKey),
              buttonLabel: getProviderButtonLabel(normalizedKey),
              url: buildProviderUrl(normalizedKey, title),
              logoPath: provider.logo_path,
            });
          }
        }
      });
    }
    
    // Check buy
    if (regionData.buy) {
      regionData.buy.forEach(provider => {
        const normalizedKey = normalizeProviderName(provider.provider_name);
        if (normalizedKey && isProviderSupported(normalizedKey)) {
          const alreadyAdded = supportedProviders.some(p => p.key === normalizedKey);
          if (!alreadyAdded) {
            supportedProviders.push({
              key: normalizedKey,
              name: provider.provider_name,
              displayName: getProviderDisplayName(normalizedKey),
              buttonLabel: getProviderButtonLabel(normalizedKey),
              url: buildProviderUrl(normalizedKey, title),
              logoPath: provider.logo_path,
            });
          }
        }
      });
    }
  });
  
  return supportedProviders;
};

/**
 * Generate redirect URL for our outbound tracking
 * @param {string} providerKey - Normalized provider key
 * @param {string} title - Movie/TV show title
 * @param {number} tmdbId - TMDB ID
 * @returns {string} Redirect URL
 */
export const generateRedirectUrl = (providerKey, title, tmdbId) => {
  const encodedTitle = encodeURIComponent(title);
  return `/out/${providerKey}?title=${encodedTitle}&id=${tmdbId}`;
};

export default {
  normalizeProviderName,
  isProviderSupported,
  buildProviderUrl,
  getProviderButtonLabel,
  getProviderDisplayName,
  processProviders,
  generateRedirectUrl,
  SUPPORTED_PROVIDERS,
  PROVIDER_CONFIG,
};
