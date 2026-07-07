import React, { useState, useEffect } from 'react';
import { fetchMovieTrailer, getYouTubeEmbedUrl } from '../utils/movieTrailerService';

/**
 * TrailerExample Component
 * 
 * Demonstrates production-ready usage of the movieTrailerService.
 * Shows how to properly fetch and display movie trailers.
 */
const TrailerExample = ({ movieId }) => {
  const [trailerKey, setTrailerKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch trailer when component mounts or movieId changes
  useEffect(() => {
    const loadTrailer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch trailer using our production-ready service
        const videoKey = await fetchMovieTrailer(movieId);
        
        if (videoKey) {
          setTrailerKey(videoKey);
          console.log('Trailer loaded successfully');
        } else {
          setError('No trailer available for this movie');
          console.log('No trailer found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load trailer');
        console.error('Trailer loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTrailer();
  }, [movieId]);

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading trailer...</span>
        </div>
        <p className="mt-2 text-white">Fetching movie trailer...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  // No trailer available
  if (!trailerKey) {
    return (
      <div className="alert alert-info" role="alert">
        <i className="fas fa-film me-2"></i>
        No trailer available for this movie.
      </div>
    );
  }

  // Success - Display trailer
  return (
    <div className="container py-5">
      <div className="text-center mb-4">
        <h3 className="text-white mb-3">Movie Trailer</h3>
      </div>
      
      <div className="ratio ratio-16x9">
        <iframe
          src={getYouTubeEmbedUrl(trailerKey)}
          title="Movie Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
          className="rounded"
        />
      </div>
      
      <div className="text-center mt-4">
        <a 
          href={getYouTubeEmbedUrl(trailerKey).replace('embed', 'watch')}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-light"
        >
          <i className="fas fa-external-link-alt me-2"></i>
          Watch on YouTube
        </a>
      </div>
    </div>
  );
};

export default TrailerExample;
