import { trackApiPerformance } from './analyticsService';
/**
 * TMDB Search Service
 * 
 * Implements TMDB v3 /search/multi endpoint for comprehensive search
 * across movies, TV shows, and people in a single API call.
 * 
 * Why /search/multi is better than separate endpoints:
 * 1. Single API call vs 3 separate calls (movies, tv, person) = 66% fewer requests
 * 2. Unified ranking across all media types
 * 3. Faster response time (no parallel Promise.all needed)
 * 4. Lower bandwidth usage
 * 5. Simpler rate limit management
 * 6. Consistent response format with media_type discriminator
 * 
 * @author CineHub Team
 * @version 2.0.0
 */

// TMDB API Configuration
const TMDB_CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  API_KEY: '8f666adc99ee1f6168974514ff6d951a',
  IMAGES_BASE_URL: 'https://image.tmdb.org/t/p',
  POSTER_SIZE: 'w780',
  PROFILE_SIZE: 'w185',
  BACKDROP_SIZE: 'original'
};

/**
 * Performs a multi-search across movies, TV shows, and people
 * 
 * Endpoint: GET /search/multi
 * Documentation: https://developer.themoviedb.org/reference/search-multi
 * 
 * @param {string} query - Search query text
 * @param {Object} options - Search options
 * @param {boolean} options.includeAdult - Include adult content (default: false)
 * @param {string} options.language - Language code (default: 'en-US')
 * @param {number} options.page - Page number (default: 1)
 * @returns {Promise<Object>} Search results grouped by media type
 * 
 * Response structure:
 * {
 *   page: number,
 *   results: [
 *     {
 *       id: number,
 *       media_type: "movie" | "tv" | "person",
 *       // ... media-specific fields
 *     }
 *   ],
 *   total_pages: number,
 *   total_results: number
 * }
 */
export async function searchMulti(query, options = {}) {
  // Validate input
  if (!query || query.trim() === '') {
    return { movies: [], tvShows: [], people: [] };
  }

  const {
    includeAdult = false,
    language = 'en-US',
    page = 1
  } = options;

  try {
    // Build search URL with query parameters
    const params = new URLSearchParams({
      api_key: TMDB_CONFIG.API_KEY,
      query: query.trim(),
      include_adult: includeAdult.toString(),
      language,
      page: page.toString()
    });

    const url = `${TMDB_CONFIG.BASE_URL}/search/multi?${params.toString()}`;

    console.log('🔍 TMDB Multi-Search:', query);
    console.log('📡 API URL:', url);

    const startedAt = performance.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    trackApiPerformance({ endpoint: '/tmdb/search/multi', method: 'GET', response_time_ms: Math.max(0, Math.round(performance.now() - startedAt)), status_code: response.status, cache_hit: false });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Search Results:', data.total_results, 'items');

    // Group and rank results
    const groupedResults = groupAndRankResults(data.results || [], query.trim());
    
    return {
      ...groupedResults,
      totalResults: data.total_results,
      page: data.page,
      totalPages: data.total_pages
    };

  } catch (error) {
    console.error('❌ Search Error:', error.message);
    throw error;
  }
}

/**
 * Groups search results by media_type and applies ranking
 * 
 * Ranking Algorithm:
 * 1. Exact title/name matches (case-insensitive)
 * 2. Sort by popularity (descending)
 * 3. Use release_date/first_air_date as tie-breaker (newer first)
 * 
 * @param {Array} results - Raw TMDB results
 * @param {string} query - Original search query
 * @returns {Object} Grouped and sorted results
 */
function groupAndRankResults(results, query) {
  const lowerQuery = query.toLowerCase();

  // Split by media type
  const movies = results.filter(r => r.media_type === 'movie');
  const tvShows = results.filter(r => r.media_type === 'tv');
  const people = results.filter(r => r.media_type === 'person');

  // Helper: Calculate rank score
  // Higher score = better match
  const calculateRank = (item, type) => {
    let score = 0;
    
    // Get title/name based on type
    const title = type === 'movie' ? item.title : 
                  type === 'tv' ? item.name : 
                  item.name;
    
    // Exact match bonus (highest priority)
    if (title && title.toLowerCase() === lowerQuery) {
      score += 1000;
    }
    
    // Starts with query bonus
    if (title && title.toLowerCase().startsWith(lowerQuery)) {
      score += 500;
    }
    
    // Contains query bonus
    if (title && title.toLowerCase().includes(lowerQuery)) {
      score += 100;
    }
    
    // Popularity boost (TMDB's popularity score, higher is better)
    score += (item.popularity || 0) * 10;
    
    // Date bonus (newer content gets slight preference as tie-breaker)
    let dateStr = type === 'movie' ? item.release_date :
                   type === 'tv' ? item.first_air_date : null;
    
    if (dateStr) {
      const year = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(year)) {
        score += (year - 1900) * 0.1; // Slight preference for newer content
      }
    }
    
    return score;
  };

  // Sort function
  const sortByRank = (a, b, type) => {
    const rankA = calculateRank(a, type);
    const rankB = calculateRank(b, type);
    return rankB - rankA; // Descending order
  };

  return {
    movies: movies.sort((a, b) => sortByRank(a, b, 'movie')),
    tvShows: tvShows.sort((a, b) => sortByRank(a, b, 'tv')),
    people: people.sort((a, b) => sortByRank(a, b, 'person'))
  };
}

/**
 * Fetches detailed information for a specific movie
 * 
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Object>} Movie details
 */
export async function fetchMovieDetails(movieId) {
  try {
    const url = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}&language=en-US`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch movie details`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Movie Details Error:', error.message);
    throw error;
  }
}

/**
 * Fetches detailed information for a specific TV show
 * 
 * @param {number} tvId - TMDB TV show ID
 * @returns {Promise<Object>} TV show details
 */
export async function fetchTVDetails(tvId) {
  try {
    const url = `${TMDB_CONFIG.BASE_URL}/tv/${tvId}?api_key=${TMDB_CONFIG.API_KEY}&language=en-US`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch TV details`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ TV Details Error:', error.message);
    throw error;
  }
}

/**
 * Fetches detailed information for a specific person
 * 
 * @param {number} personId - TMDB person ID
 * @returns {Promise<Object>} Person details
 */
export async function fetchPersonDetails(personId) {
  try {
    const url = `${TMDB_CONFIG.BASE_URL}/person/${personId}?api_key=${TMDB_CONFIG.API_KEY}&language=en-US`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch person details`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Person Details Error:', error.message);
    throw error;
  }
}

/**
 * Fetches videos/trailers for a movie or TV show
 * 
 * @param {number} id - TMDB ID
 * @param {string} type - 'movie' or 'tv'
 * @returns {Promise<Array>} Array of videos
 */
export async function fetchVideos(id, type) {
  try {
    const url = `${TMDB_CONFIG.BASE_URL}/${type}/${id}/videos?api_key=${TMDB_CONFIG.API_KEY}&language=en-US`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch videos`);
    }
    
    const data = await response.json();
    
    // Prioritize official trailers
    const videos = data.results || [];
    return videos.sort((a, b) => {
      // Official trailers first
      if (a.official === b.official) {
        // Then by type: Trailer > Teaser > Other
        const typeOrder = { 'Trailer': 0, 'Teaser': 1, 'Clip': 2, 'Featurette': 3 };
        return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
      }
      return b.official ? 1 : -1;
    });
  } catch (error) {
    console.error('❌ Videos Error:', error.message);
    throw error;
  }
}

/**
 * Gets full image URL for posters
 * 
 * @param {string} path - Image path from TMDB
 * @param {string} size - Image size (default: w780)
 * @returns {string} Full image URL
 */
export function getImageUrl(path, size = TMDB_CONFIG.POSTER_SIZE) {
  if (!path) {
    return 'https://placehold.co/780x1170/2a2a2a/FFFFFF?text=No+Image';
  }
  return `${TMDB_CONFIG.IMAGES_BASE_URL}/${size}${path}`;
}

/**
 * Gets profile image URL for people
 * 
 * @param {string} path - Profile path from TMDB
 * @returns {string} Full profile image URL
 */
export function getProfileImageUrl(path) {
  if (!path) {
    return 'https://placehold.co/185x278/2a2a2a/FFFFFF?text=No+Photo';
  }
  return `${TMDB_CONFIG.IMAGES_BASE_URL}/${TMDB_CONFIG.PROFILE_SIZE}${path}`;
}

// Export configuration for external use
export { TMDB_CONFIG };
