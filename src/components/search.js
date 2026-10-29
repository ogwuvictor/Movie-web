import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import './Search.css';
import { trackSearch } from '../utils/analyticsService';
import { searchMulti } from '../utils/tmdbSearchService';

const Search = () => {
  const [params, setParams] = useSearchParams();
  const keyword = params.get('q') || '';
  const [inputValue, setInputValue] = useState(keyword);
  const pendingSearch = useRef(null);
  const debouncedSearch = useDebounce(inputValue, 500);

  useEffect(() => {
    pendingSearch.current = null;
    setInputValue(keyword);
  }, [keyword]);

  useEffect(() => {
    if (pendingSearch.current === null || pendingSearch.current !== debouncedSearch) return;
    pendingSearch.current = null;
    const query = debouncedSearch.trim();
    setParams(query ? { q: query } : {}, { replace: true });
  }, [debouncedSearch, setParams]);

  const submitSearch = event => {
    event.preventDefault();
    pendingSearch.current = null;
    const query = inputValue.trim();
    setParams(query ? { q: query } : {}, { replace: true });
  };

  const [results, setResults] = useState({ movies: [], tvShows: [], people: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch search results when keyword changes
  useEffect(() => {
    let active = true;
    const performSearch = async () => {
      // Requirement #9: Ignore empty input
      if (!keyword || keyword.trim() === '') {
        setResults({ movies: [], tvShows: [], people: [] });
        setLoading(false);
        setError(null);
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

        if (!active) return;
        trackSearch({ search_query: keyword.trim(), results_count: searchResults.movies.length + searchResults.tvShows.length });
        // Sort by popularity descending and limit to top 15 results per category
        const sortByPopularity = (a, b) => (b.popularity || 0) - (a.popularity || 0);
        
        setResults({
          movies: searchResults.movies.sort(sortByPopularity).slice(0, 15),
          tvShows: searchResults.tvShows.sort(sortByPopularity).slice(0, 15),
          people: []
        });
      } catch (err) {
        if (!active) return;
        setError('Failed to fetch search results. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    performSearch();
    return () => { active = false; };
  }, [keyword]);

  // Calculate total results (excluding people)
  const totalResults = results.movies.length + results.tvShows.length;

  return (
    <main className="search-page">
      <header className="search-page-header">
        <h1>{keyword ? `Search Results for "${keyword}"` : 'Search'}</h1>
        <p className="search-page-description">Find your next movie or TV series.</p>
        <form className="search-page-form" role="search" onSubmit={submitSearch}>
          <label className="visually-hidden" htmlFor="title-search">Search movies and TV shows</label>
          <input id="title-search" type="search" aria-label="Search" placeholder="Search movies and TV shows..."
            autoFocus value={inputValue} onChange={event => {
              pendingSearch.current = event.target.value;
              setInputValue(event.target.value);
            }} />
          <button type="submit" aria-label="Search titles"><i className="fas fa-search" aria-hidden="true"></i></button>
        </form>
        {!keyword && <p className="search-page-hint">Enter a title to start exploring.</p>}
      </header>

      <div className="container search-content">
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Searching...</span>
            </div>
            <p className="mt-3 text-white">Searching movies and TV shows...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        {/* Search Results by Category */}
        {!loading && !error && totalResults === 0 && keyword && (
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
        {!loading && !error && results.movies.length > 0 && (
          <div className="movie-row-container mb-5">
            <h3 className="section-title mb-4">
              <i className="fas fa-film me-2"></i>
              Movies ({results.movies.length})
            </h3>
            <div
              className="search-results-grid"
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
        {!loading && !error && results.tvShows.length > 0 && (
          <div className="movie-row-container mb-5">
            <h3 className="section-title mb-4">
              <i className="fas fa-tv me-2"></i>
              TV Shows ({results.tvShows.length})
            </h3>
            <div
              className="search-results-grid"
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
    </main>
  );
};

export default Search;
