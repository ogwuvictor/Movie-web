/**
 * Movie Trailer Service
 * 
 * Production-ready utility for fetching movie trailers from TMDB API.
 * Uses modern async/await pattern with proper error handling.
 * 
 * @author CineHub Team
 * @version 1.0.0
 */

// TMDB API configuration
import { TMDB_API_BASE, TMDB_API_KEY, TMDB_IMAGE_BASE, TMDB_READ_TOKEN, tmdbAuthHeaders } from './tmdbConfig';

const TMDB_CONFIG = {
  BASE_URL: TMDB_API_BASE,
  API_KEY: TMDB_API_KEY,
  READ_TOKEN: TMDB_READ_TOKEN,
  IMAGES_BASE_URL: TMDB_IMAGE_BASE,
  TIMEOUT: 10000 // 10 seconds timeout for API calls
};

/**
 * Fetch with timeout wrapper
 * Prevents hanging requests on slow networks
 * 
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
const fetchWithTimeout = async (url, options = {}, timeout = TMDB_CONFIG.TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
};

/**
 * Fetches movie trailers from TMDB API
 * 
 * Based on TMDB API documentation:
 * - Response contains "results" array with video objects
 * - Each video has: id, iso_639_1, iso_3166_1, name, key, site, size, type, official, published_at
 * - Official trailers have type: "Trailer" and official: true
 * - Priority: Official Trailer > Any YouTube video > No trailer
 * 
 * @param {string|number} movieId - The TMDB movie ID
 * @returns {Promise<string|null>} YouTube video ID or null if no trailer found
 */
export const fetchMovieTrailer = async (movieId) => {
  try {
    // Validate input - check for null, undefined, empty string, or invalid types
    if (!movieId || movieId === 'undefined' || movieId === '' || (typeof movieId !== 'string' && typeof movieId !== 'number')) {
      console.error('Invalid Movie ID:', movieId, 'Type:', typeof(movieId));
      return null;
    }
    
    // Additional validation for movie ID format
    if (typeof movieId === 'string' && movieId.trim() === '') {
      console.error('Empty Movie ID provided');
      return null;
    }

    // Construct API endpoint URL (using Bearer token as per TMDB v4)
    // No language parameter to get all trailers globally
    const apiUrl = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}/videos`;

    // Make API request using fetch with Bearer token authentication
    const response = await fetchWithTimeout(apiUrl, {
      method: 'GET',
      headers: {
        ...tmdbAuthHeaders(),
        'accept': 'application/json'
      }
    });
    
    // Check if response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response (matches TMDB documentation structure)
    const data = await response.json();

    // Check if videos exist
    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Priority 1: Find official trailer (type: "Trailer" AND official: true)
    const officialTrailer = data.results.find(video => 
      video.type === 'Trailer' && 
      video.official === true &&
      video.site === 'YouTube' &&
      video.key
    );

    if (officialTrailer) {
      return officialTrailer.key;
    }

    // Priority 2: Find any trailer (type: "Trailer") on YouTube
    const anyTrailer = data.results.find(video => 
      video.type === 'Trailer' && 
      video.site === 'YouTube' &&
      video.key
    );

    if (anyTrailer) {
      return anyTrailer.key;
    }

    // Priority 3: Find any official video (official: true) on YouTube
    const officialVideo = data.results.find(video => 
      video.official === true &&
      video.site === 'YouTube' &&
      video.key
    );

    if (officialVideo) {
      return officialVideo.key;
    }

    // Priority 4: Find any YouTube video
    const anyYouTubeVideo = data.results.find(video => 
      video.site === 'YouTube' &&
      video.key
    );

    if (anyYouTubeVideo) {
      return anyYouTubeVideo.key;
    }

    // No suitable video found
    return null;

  } catch (error) {
    // Enhanced error handling with specific error types
    if (error.name === 'TypeError') {
      console.error('Network error: Failed to fetch trailer data');
    } else if (error.message.includes('HTTP error')) {
      console.error('API error:', error.message);
    } else if (error.message.includes('403')) {
      console.error('Authentication error: Invalid API token or permissions');
    } else if (error.message.includes('404')) {
      console.error('Not found: Movie ID does not exist');
    } else {
      console.error('Unexpected error:', error.message);
    }
    
    // Return null on any error
    return null;
  }
};

/**
 * Alternative function to fetch all videos (not just trailers)
 * Useful for debugging or when you need all video content
 * 
 * @param {string|number} movieId - The TMDB movie ID
 * @returns {Promise<object|null>} All videos object or null if error
 */
export const fetchAllMovieVideos = async (movieId) => {
  try {
    // Validate input
    if (!movieId) {
      console.error('Movie ID is required');
      return null;
    }

    // Construct API endpoint URL
    const apiUrl = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_CONFIG.API_KEY}`;

    // Make API request with timeout
    const response = await fetchWithTimeout(apiUrl);
    
    // Check response status
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse and return all videos
    const data = await response.json();
    
    return data;

  } catch (error) {
    console.error('Error fetching movie videos:', error.message);
    return null;
  }
};

/**
 * Get YouTube embed URL from video key
 * 
 * @param {string} videoKey - YouTube video key
 * @returns {string} Complete YouTube embed URL
 */
export const getYouTubeEmbedUrl = (videoKey) => {
  if (!videoKey) {
    return null;
  }
  
  return `https://www.youtube.com/embed/${videoKey}`;
};

/**
 * Get YouTube watch URL from video key
 * 
 * @param {string} videoKey - YouTube video key
 * @returns {string} Complete YouTube watch URL
 */
export const getYouTubeWatchUrl = (videoKey) => {
  if (!videoKey) {
    return null;
  }
  
  return `https://www.youtube.com/watch?v=${videoKey}`;
};

// Export configuration for external use
export { TMDB_CONFIG };
