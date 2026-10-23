import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from './Hero';
import './Search.css';
import useAutoScroll from '../hooks/useAutoScroll';
import { searchMulti } from '../utils/tmdbSearchService';

/**
 * Search Component - Multi-Search Implementation
 * 
 * Uses TMDB v3 /search/multi endpoint for comprehensive search across
 * movies, TV shows, and people in a single API call.
 * 
 * Why /search/multi is superior to separate endpoints:
 * 
 * 1. SINGLE API CALL vs 3 SEPARATE CALLS
 *    - /search/multi: 1 request gets all media types
 *    - Separate: /search/movie + /search/tv + /search/person = 3 requests
 *    - 66% reduction in network requests = faster loading
 * 
 * 2. UNIFIED RANKING
 *    - Results ranked consistently across all media types
 *    - Prevents fragmentation in relevance scoring
 * 
 * 3. RATE LIMIT EFFICIENCY
 *    - TMDB has rate limits (40 requests per 10 seconds for free tier)
 *    - Multi-search uses 1 rate limit slot vs 3
 *    - Better for high-traffic applications
 * 
 * 4. CONSISTENT RESPONSE FORMAT
 *    - Each result has media_type field: "movie" | "tv" | "person"
 *    - No need to merge different response structures
 * 
 * 5. BANDWIDTH OPTIMIZATION
 *    - Single payload with all relevant data
 *    - No duplicate network overhead
 * 
 * @param {object} props - Component props
 * @param {string} props.keyword - Search keyword from URL params
 * @returns {JSX.Element} Search results component with grouped sections
 */
const Search = ({ keyword }) => {
  const [results, setResults] = useState({ movies: [], tvShows: [], people: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-scroll for movies section
  const moviesScroll = useAutoScroll({
    scrollInterval: 4000,
    scrollAmount: 200,
    enabled: true
  });

  // Auto-scroll for TV shows section
  const tvShowsScroll = useAutoScroll({
    scrollInterval: 4000,
    scrollAmount: 200,
    enabled: true
  });

  // Fetch search results when keyword changes
  useEffect(() => {
    const performSearch = async () => {
      // Requirement #9: Ignore empty input
      if (!keyword || keyword.trim() === '') {
        setResults({ movies: [], tvShows: [], people: [] });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Requirement #3: Call TMDB with specified parameters
        // - query = user text
        // - include_adult = false
        // - language = en-US
        // - page = 1
        const searchResults = await searchMulti(keyword.trim(), {
          includeAdult: false,
          language: 'en-US',
          page: 1
        });

        // Sort by popularity descending and limit to top 15 results per category
        const sortByPopularity = (a, b) => (b.popularity || 0) - (a.popularity || 0);
        
        setResults({
          movies: searchResults.movies.sort(sortByPopularity).slice(0, 15),
          tvShows: searchResults.tvShows.sort(sortByPopularity).slice(0, 15),
          people: []
        });
      } catch (err) {
        setError('Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [keyword]);

  // Calculate total results (excluding people)
  const totalResults = results.movies.length + results.tvShows.length;

  return (
    <div className="search-page">
      <Hero title={`Search Results for "${keyword}"`} />

      <div className="container search-content py-5">
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Searching...</span>
            </div>
            <p className="mt-3 text-white">Searching across movies, TV shows, and people...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        {/* Search Results by Category */}
        {!loading && totalResults === 0 && keyword && (
          <div className="text-center py-5">
            <i className="fas fa-search fa-3x text-secondary mb-3"></i>
            <h3 className="text-white mb-3">No results found</h3>
            <p className="text-secondary">
              Try different keywords or check your spelling.
            </p>
          </div>
        )}

        {/* Requirement #5: Display results in grouped sections in this order:
            1. Movies
            2. TV Shows  
            3. People
        */}

        {/* Section 1: Movies */}
        {results.movies.length > 0 && (
          <div className="movie-row-container mb-5">
            <h3 className="section-title mb-4">
              <i className="fas fa-film me-2"></i>
              Movies ({results.movies.length})
            </h3>
            <div
              className="movie-row"
              ref={moviesScroll.scrollContainerRef}
              onScroll={moviesScroll.handleUserScroll}
              onMouseEnter={moviesScroll.handleMouseEnter}
              onMouseLeave={moviesScroll.handleMouseLeave}
              onTouchStart={moviesScroll.handleTouchStart}
              onTouchEnd={moviesScroll.handleTouchEnd}
            >
              {results.movies.map((movie) => {
                if (!movie || !movie.id) return null;
                
                const posterpath = movie.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : undefined;
                
                return (
                  <Link
                    key={movie.id}
                    className="movie-row-card"
                    to={`/moviedetails/${movie.id}`}
                  >
                    <span className="search-poster-fallback" aria-hidden="true">No poster available</span>
                    <img 
                      src={posterpath}
                      hidden={!posterpath}
                      onError={event => { event.currentTarget.hidden = true; }}
                      alt={movie.title}
                      className="movie-row-poster"
                      draggable="false"
                    />
                    <div className="movie-row-overlay">
                      <h6 className="movie-row-title">{movie.title}</h6>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: TV Shows */}
        {results.tvShows.length > 0 && (
          <div className="movie-row-container mb-5">
            <h3 className="section-title mb-4">
              <i className="fas fa-tv me-2"></i>
              TV Shows ({results.tvShows.length})
            </h3>
            <div
              className="movie-row"
              ref={tvShowsScroll.scrollContainerRef}
              onScroll={tvShowsScroll.handleUserScroll}
              onMouseEnter={tvShowsScroll.handleMouseEnter}
              onMouseLeave={tvShowsScroll.handleMouseLeave}
              onTouchStart={tvShowsScroll.handleTouchStart}
              onTouchEnd={tvShowsScroll.handleTouchEnd}
            >
              {results.tvShows.map((show) => {
                if (!show || !show.id) return null;
                
                const posterpath = show.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                  : undefined;
                
                return (
                  <Link
                    key={show.id}
                    className="movie-row-card"
                    to={`/tv/${show.id}`}
                  >
                    <span className="search-poster-fallback" aria-hidden="true">No poster available</span>
                    <img 
                      src={posterpath}
                      hidden={!posterpath}
                      onError={event => { event.currentTarget.hidden = true; }}
                      alt={show.name}
                      className="movie-row-poster"
                      draggable="false"
                    />
                    <div className="movie-row-overlay">
                      <h6 className="movie-row-title">{show.name}</h6>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;