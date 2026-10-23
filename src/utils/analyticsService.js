/**
 * Analytics Service
 * 
 * Service for tracking analytics events from the React frontend.
 * Sends data to PHP backend for storage and analysis.
 * 
 * @author CineHub Team
 * @version 1.0.0
 */

import { API_BASE_URL } from './apiConfig';

// Generate or retrieve session ID
let sessionId = sessionStorage.getItem('analytics_session_id');
if (!sessionId) {
  sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
  sessionStorage.setItem('analytics_session_id', sessionId);
}

/**
 * Get device information
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  
  if (/Mobile|Android|iP(hone|od)/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  return {
    deviceType,
    userAgent: ua,
    screenResolution: `${window.screen.width}x${window.screen.height}`
  };
};

/**
 * Track page view
 * 
 * @param {object} data - Page view data
 * @param {string} data.page_type - Type of page (home, movie, tv, search, trailer)
 * @param {number} data.content_id - Content ID (optional)
 * @param {string} data.content_type - Content type (movie or tv, optional)
 */
export const trackPageView = async (data) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    const payload = {
      event_type: 'page_view',
      session_id: sessionId,
      page_type: data.page_type || 'unknown',
      content_id: data.content_id || null,
      content_type: data.content_type || null,
      referrer: document.referrer || null,
      user_agent: deviceInfo.userAgent,
      ip_address: null, // Backend will capture this
      device_type: deviceInfo.deviceType,
      browser: null, // Could parse from UA if needed
      os: null, // Could parse from UA if needed
      screen_resolution: deviceInfo.screenResolution
    };
    
    await fetch(`${API_BASE_URL}/analytics.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Don't throw - analytics shouldn't break the app
  }
};

/**
 * Track provider click
 * 
 * @param {object} data - Provider click data
 * @param {number} data.content_id - Content ID
 * @param {string} data.content_type - Content type (movie or tv)
 * @param {string} data.content_title - Content title
 * @param {string} data.provider - Provider name (amazon, apple, youtube, netflix)
 * @param {string} data.provider_url - Provider URL
 */
export const trackProviderClick = async (data) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    const payload = {
      event_type: 'provider_click',
      session_id: sessionId,
      content_id: data.content_id,
      content_type: data.content_type,
      content_title: data.content_title || null,
      provider: data.provider,
      provider_url: data.provider_url || null,
      user_agent: deviceInfo.userAgent,
      ip_address: null,
      referrer: document.referrer || null
    };
    
    await fetch(`${API_BASE_URL}/analytics.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

/**
 * Track search query
 * 
 * @param {object} data - Search data
 * @param {string} data.search_query - Search query
 * @param {number} data.results_count - Number of results
 * @param {number} data.clicked_result_id - ID of clicked result (optional)
 * @param {string} data.clicked_result_type - Type of clicked result (movie or tv, optional)
 */
export const trackSearch = async (data) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    const payload = {
      event_type: 'search',
      session_id: sessionId,
      search_query: data.search_query,
      results_count: data.results_count || 0,
      clicked_result_id: data.clicked_result_id || null,
      clicked_result_type: data.clicked_result_type || null,
      user_agent: deviceInfo.userAgent,
      ip_address: null
    };
    
    await fetch(`${API_BASE_URL}/analytics.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

/**
 * Track user engagement
 * 
 * @param {object} data - Engagement data
 * @param {number} data.content_id - Content ID
 * @param {string} data.content_type - Content type (movie or tv)
 * @param {string} data.action_type - Type of action (like, add_to_list, share, trailer_play, details_view)
 * @param {string} data.action_value - Additional action value (optional)
 */
export const trackEngagement = async (data) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    const payload = {
      event_type: 'engagement',
      session_id: sessionId,
      content_id: data.content_id,
      content_type: data.content_type,
      action_type: data.action_type,
      action_value: data.action_value || null,
      user_agent: deviceInfo.userAgent,
      ip_address: null
    };
    
    await fetch(`${API_BASE_URL}/analytics.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

/**
 * Track video playback metrics
 * 
 * @param {object} data - Playback data
 * @param {number} data.content_id - Content ID
 * @param {string} data.content_type - Content type (movie or tv)
 * @param {string} data.content_title - Content title
 * @param {number} data.playback_duration - Duration watched in seconds
 * @param {number} data.buffer_count - Number of buffer events
 * @param {number} data.buffer_duration - Total buffer duration in seconds
 * @param {number} data.playback_errors - Number of playback errors
 * @param {array} data.error_types - Array of error types
 * @param {string} data.quality_played - Video quality played
 * @param {number} data.completion_percentage - Percentage of video completed
 */
export const trackPlayback = async (data) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    const payload = {
      event_type: 'playback',
      session_id: sessionId,
      content_id: data.content_id,
      content_type: data.content_type,
      content_title: data.content_title || null,
      playback_duration: data.playback_duration || 0,
      buffer_count: data.buffer_count || 0,
      buffer_duration: data.buffer_duration || 0,
      playback_errors: data.playback_errors || 0,
      error_types: data.error_types || null,
      quality_played: data.quality_played || null,
      video_start_time: data.video_start_time || new Date().toISOString(),
      video_end_time: data.video_end_time || new Date().toISOString(),
      completion_percentage: data.completion_percentage || 0,
      user_agent: deviceInfo.userAgent,
      ip_address: null,
      device_type: deviceInfo.deviceType
    };
    
    await fetch(`${API_BASE_URL}/analytics.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

/**
 * Track API performance
 * 
 * @param {object} data - API performance data
 * @param {string} data.endpoint - API endpoint
 * @param {string} data.method - HTTP method
 * @param {number} data.response_time_ms - Response time in milliseconds
 * @param {number} data.status_code - HTTP status code
 * @param {boolean} data.cache_hit - Whether the response was from cache
 * @param {string} data.error_message - Error message if any
 */
export const trackApiPerformance = async (data) => {
  try {
    const payload = {
      type: 'api_metric',
      endpoint: data.endpoint,
      method: data.method || 'GET',
      response_time_ms: data.response_time_ms,
      status_code: data.status_code || 200,
      cache_hit: data.cache_hit || false,
      error_message: data.error_message || null
    };
    
    await fetch(`${API_BASE_URL}/performance.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Performance tracking error:', error);
  }
};

export default {
  trackPageView,
  trackProviderClick,
  trackSearch,
  trackEngagement,
  trackPlayback,
  trackApiPerformance,
  sessionId
};
