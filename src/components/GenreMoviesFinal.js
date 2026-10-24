import React from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from './Moviecard';
import useGenreCatalog from '../hooks/useGenreCatalog';

const GenreMovies = () => {
  const { genreId } = useParams();
  const { items: movies, genreName, loading, error, hasMore, loadMore, sentinelRef } = useGenreCatalog('movie', genreId);

  if (loading && !movies.length) {
    return (
      <div className="container catalog-page py-5">
        <div className="row">
          <div className="col-12">
            <div className="section-header text-center">
              <h2 className="section-title">Loading...</h2>
              <div className="spinner-border text-primary mt-3" role="status">
                <span className="visually-hidden">Loading movies...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !movies.length) {
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
          {/* Back Button */}
          <Link to="/" className="btn btn-outline-light mb-4">
            <i className="fas fa-arrow-left me-2"></i>
            Back to Home
          </Link>

          {/* Section Header */}
          <div className="section-header">
            <h2 className="section-title">{genreName} Movies</h2>
            <p className="text-secondary">
              {movies.length} {genreName.toLowerCase()} movies found
            </p>
          </div>

          {/* Movies Grid */}
          {movies.length > 0 ? (
            <div className="catalog-grid">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-film fa-3x text-secondary mb-3"></i>
              <h4 className="text-white">No movies found</h4>
              <p className="text-secondary">No movies available in this genre.</p>
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
          {!hasMore && movies.length > 0 && <p className="text-secondary text-center py-3">All available titles loaded.</p>}
        </div>
      </div>
    </div>
  );
};

export default GenreMovies;
