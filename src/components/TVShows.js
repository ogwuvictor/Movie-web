import React from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from './Moviecard';
import useGenreCatalog from '../hooks/useGenreCatalog';

const TVShows = () => {
  const { genreId } = useParams();
  const { items: tvShows, genreName, loading, error, hasMore, loadMore, sentinelRef } = useGenreCatalog('tv', genreId);

  if (loading && !tvShows.length) {
    return (
      <div className="container catalog-page py-5">
        <div className="catalog-grid" role="status" aria-label="Loading TV shows">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="catalog-card skeleton-card" aria-hidden="true">
              <div className="catalog-card-artwork skeleton-shimmer" />
              <div className="catalog-card-info">
                <div className="skeleton-shimmer skeleton-line" />
                <div className="skeleton-shimmer skeleton-line skeleton-line-short" />
              </div>
            </div>
          ))}
        </div>
        <span className="visually-hidden">Loading TV shows...</span>
      </div>
    );
  }

  if (error && !tvShows.length) {
    return (
      <div className="container catalog-page py-5">
        <div className="row">
          <div className="col-12">
            <div className="section-header text-center">
              <h2 className="section-title">Error</h2>
              <p className="text-danger" role="alert">{error}</p>
              <button type="button" className="btn btn-outline-light" onClick={loadMore}>Try again</button>
              <Link to="/" className="btn btn-primary mt-3">Go Back Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container catalog-page py-5">
      <div className="row">
        <div className="col-12">
          <Link to="/" className="btn btn-outline-light mb-4">
            <i className="fas fa-arrow-left me-2"></i>
            Back to Home
          </Link>

          <div className="section-header">
            <h2 className="section-title">{genreName} TV Shows</h2>
            <p className="text-secondary">
              {tvShows.length} {genreName.toLowerCase()} TV shows found
            </p>
          </div>

          {tvShows.length > 0 ? (
            <div className="catalog-grid">
              {tvShows.map(show => <MovieCard key={show.id} movie={show} mediaType="tv" />)}
              {loading && Array.from({ length: 4 }).map((_, index) => (
                <div key={`more-${index}`} className="catalog-card skeleton-card" aria-hidden="true">
                  <div className="catalog-card-artwork skeleton-shimmer" />
                  <div className="catalog-card-info">
                    <div className="skeleton-shimmer skeleton-line" />
                    <div className="skeleton-shimmer skeleton-line skeleton-line-short" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-tv fa-3x text-secondary mb-3"></i>
              <h4 className="text-white">No TV shows found</h4>
              <p className="text-secondary">No TV shows available in this genre.</p>
              <Link to="/" className="btn btn-primary mt-3">
                Browse Other Genres
              </Link>
            </div>
          )}
          <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
          {loading && <p className="text-secondary text-center py-3" role="status">Loading more titles...</p>}
          {error && <div className="text-center py-3" role="alert">
            <p className="text-danger">{error}</p>
            <button type="button" className="btn btn-outline-light" onClick={loadMore}>Try again</button>
          </div>}
          {!hasMore && tvShows.length > 0 && <p className="text-secondary text-center py-3">All available titles loaded.</p>}
        </div>
      </div>
    </div>
  );
};

export default TVShows;
