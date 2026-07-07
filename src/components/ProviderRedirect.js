/**
 * Provider Redirect Component
 * 
 * Handles outbound provider redirects with click tracking.
 * Logs provider, title, TMDB ID, and timestamp before redirecting.
 * 
 * @author CineHub Team
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildProviderUrl } from '../utils/providerLinkService';

const ProviderRedirect = () => {
  const { provider } = useParams();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const title = searchParams.get('title');
  const tmdbId = searchParams.get('id');

  useEffect(() => {
    if (!provider || !title) {
      // Redirect to home if missing required params
      navigate('/');
      return;
    }

    // Log the click for analytics
    logClick(provider, title, tmdbId);

    // Build the final provider URL
    const decodedTitle = decodeURIComponent(title);
    const finalUrl = buildProviderUrl(provider, decodedTitle);

    if (finalUrl) {
      // Redirect to the provider
      window.location.href = finalUrl;
    } else {
      // If URL building fails, redirect to home
      navigate('/');
    }
  }, [provider, title, tmdbId, navigate]);

  /**
   * Log click for analytics
   * In production, this would send data to your analytics backend
   */
  const logClick = (provider, title, tmdbId) => {
    const clickData = {
      provider,
      title: decodeURIComponent(title),
      tmdbId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Log to console for now (replace with actual analytics in production)
    console.log('Provider Click Tracked:', clickData);

    // TODO: Send to analytics backend
    // Example: fetch('/api/analytics/click', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(clickData),
    // });

    // Store in localStorage for basic tracking
    const clickHistory = JSON.parse(localStorage.getItem('providerClicks') || '[]');
    clickHistory.push(clickData);
    localStorage.setItem('providerClicks', JSON.stringify(clickHistory.slice(-100))); // Keep last 100 clicks
  };

  // Show loading state while redirecting
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="text-center text-white">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4>Redirecting to {provider}...</h4>
        <p className="text-secondary">You will be redirected shortly.</p>
      </div>
    </div>
  );
};

export default ProviderRedirect;
