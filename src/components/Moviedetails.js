import { safeExternalUrl } from '../utils/safeExternalUrl';
import { API_BASE_URL } from '../utils/apiConfig';
import { trackProviderClick } from '../utils/analyticsService';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { processProviders, generateRedirectUrl } from '../utils/providerLinkService';
import StreamingModal from './StreamingModal';
import { validateSelection } from '../streaming/streamingServers';

const MovieDetails = () => {
  const { id } = useParams();
  
  const [movieDetails, setMovieDetails] = useState({});
  const [posterPath, setPosterPath] = useState('');
  const [backDrop, setBackDrop] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedFor, setLoadedFor] = useState(null);
  const [error, setError] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [processedProviders, setProcessedProviders] = useState([]);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [publicDomainData, setPublicDomainData] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setShowProvidersModal(false);
    setShowStreamingModal(false);
    setPublicDomainData(null);
    setProcessedProviders([]);
    const fetchMovieDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        validateSelection({ tmdbId: id, mediaType: 'movie' });
        const movieDetailUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const response = await fetch(movieDetailUrl, { signal: controller.signal });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch movie details: ${response.status}`);
        }
        
        const data = await response.json();
        if (!active) return;
        if (Number(data.id) !== Number(id)) throw new Error('Movie information does not match the selected movie. Please reload and try again.');
        setMovieDetails(data);
        setPosterPath(data.poster_path 
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : 'https://placehold.co/780x1170/2a2a2a/FFFFFF?text=No+Poster+Available'
        );
        setBackDrop(data.backdrop_path 
          ? `https://image.tmdb.org/t/p/original/${data.backdrop_path}`
          : ''
        );

        // Check if movie is public domain via PHP API
        try {
          const checkResponse = await fetch(`${API_BASE_URL}/check.php?tmdb_id=${id}`, { signal: controller.signal });
          const checkData = await checkResponse.json();
          if (!active) return;
          
          if (checkData.success && checkData.is_public_domain && safeExternalUrl(checkData.data?.download_url)) {
            setPublicDomainData(checkData.data);
          }
        } catch (error) {
          if (!active || error.name === 'AbortError') return;
          console.log('Public domain check failed (backend may not be running):', error);
        }

        // Fetch watch providers
        const watchProvidersUrl = `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const providersResponse = await fetch(watchProvidersUrl, { signal: controller.signal });
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          if (!active) return;
          setWatchProviders(providersData.results);
          
          // Process providers to get supported ones with custom URLs
          const processed = processProviders(providersData.results, data.title);
          setProcessedProviders(processed);
        }

        // Fetch similar movies
        const similarMoviesUrl = `https://api.themoviedb.org/3/movie/${id}/similar?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const similarResponse = await fetch(similarMoviesUrl, { signal: controller.signal });
        if (similarResponse.ok) {
          const similarData = await similarResponse.json();
          if (!active) return;
          setSimilarMovies(similarData.results?.slice(0, 10) || []);
        }

        // Fetch recommended movies
        const recommendedMoviesUrl = `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const recommendedResponse = await fetch(recommendedMoviesUrl, { signal: controller.signal });
        if (recommendedResponse.ok) {
          const recommendedData = await recommendedResponse.json();
          if (!active) return;
          setRecommendedMovies(recommendedData.results?.slice(0, 10) || []);
        }
      } catch (err) {
        if (active && err.name !== 'AbortError') setError(err.message);
      } finally {
        if (active) { setLoadedFor(id); setLoading(false); }
      }
    };

    if (id) {
      fetchMovieDetails();
    }
    return () => { active = false; controller.abort(); };
  }, [id]);

  // Show loading spinner while fetching data
  if (loading || loadedFor !== id) {
    return (
      <div className="movie-details-container">
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading movie details...</span>
          </div>
          <p className="mt-3 text-white">Loading movie details...</p>
        </div>
      </div>
    );
  }

  // Show error message if fetch failed
  if (error) {
    return (
      <div className="movie-details-container">
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </div>
          <Link to="/" className="btn btn-primary mt-3">
            <i className="fas fa-arrow-left me-2"></i>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show message if no movie data
  if (!movieDetails || !movieDetails.id) {
    return (
      <div className="movie-details-container">
        <div className="container py-5 text-center">
          <i className="fas fa-film fa-3x text-secondary mb-3"></i>
          <h3 className="text-white">Movie not found</h3>
          <p className="text-secondary">The movie you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary mt-3">
            <i className="fas fa-arrow-left me-2"></i>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="movie-details-container">
      <div className="movie-backdrop" style={{ backgroundImage: `url(${backDrop})` }}></div>
      <div className="movie-details-content">
        <div className="container py-5">
          <div className="row align-items-start">
            <div className="col-md-3">
              <img 
                src={posterPath} 
                className="movie-poster" 
                alt={movieDetails.title || 'Movie Poster'} 
              />
            </div>
            <div className="col-md-9">
              <div className="movie-info">
                <h1 className="movie-title">
                  {movieDetails.title || 'Untitled'}
                  {publicDomainData && (
                    <span className="badge bg-success ms-2">Public Domain</span>
                  )}
                </h1>
                <div className="netflix-meta mb-4">
                  <span className="netflix-match">98% Match</span>
                  <span className="netflix-year">
                    {movieDetails.release_date ? movieDetails.release_date.split('-')[0] : 'N/A'}
                  </span>
                  <span className="netflix-rating">
                    <i className="fas fa-star"></i> {movieDetails.vote_average?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="netflix-duration">
                    {movieDetails.runtime ? `${Math.floor(movieDetails.runtime / 60)}h ${movieDetails.runtime % 60}m` : 'N/A'}
                  </span>
                </div>
                
                <div className="netflix-actions movie-actions mb-4">
                  <Link to={`/movietrailers/${id}`} className="netflix-play-btn">
                    <i className="fas fa-play"></i> Play Trailer
                  </Link>
                  <button type="button" className="netflix-play-btn" onClick={() => setShowStreamingModal(true)}>
                    <i className="fas fa-play"></i> Watch Now
                  </button>
                  
                  {publicDomainData ? (
                    // Public Domain: Show Download Button
                    <a
                      href={publicDomainData.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="netflix-info-btn"
                      style={{ textDecoration: 'none', backgroundColor: 'rgba(22, 163, 74, 0.8)' }}
                    >
                      <i className="fas fa-download"></i> Download
                    </a>
                  ) : (
                    // Not Public Domain: Show Provider Links
                    processedProviders.length > 0 ? (
                      <button 
                        className="netflix-info-btn"
                        onClick={() => setShowProvidersModal(true)}
                      >
                        <i className="fas fa-info-circle"></i> Where to Watch
                      </button>
                    ) : (
                      <button 
                        className="netflix-info-btn"
                        disabled
                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        <i className="fas fa-info-circle"></i> Not available in your region
                      </button>
                    )
                  )}
                </div>

                <p className="movie-overview">{movieDetails.overview || 'No overview available.'}</p>
                
                {movieDetails.genres && movieDetails.genres.length > 0 && (
                  <div className="netflix-genres mb-4">
                    {movieDetails.genres.map((genre) => (
                      <span key={genre.id} className="netflix-genre-tag">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <Link to="/" className="btn btn-outline-light">
                    <i className="fas fa-arrow-left me-2"></i> Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* More Like This Section */}
      {recommendedMovies.length > 0 && (
        <div className="netflix-more-like-this">
          <div className="container py-5">
            <h3 className="netflix-section-title mb-4">More Like This</h3>
            <div className="netflix-row">
              {recommendedMovies.map((movie) => {
                const posterpath = movie.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : 'https://placehold.co/500x750/2a2a2a/FFFFFF?text=No+Poster';
                
                return (
                  <Link 
                    key={movie.id} 
                    to={`/moviedetails/${movie.id}`}
                    className="netflix-card"
                  >
                    <img 
                      src={posterpath} 
                      alt={movie.title}
                      className="netflix-card-poster"
                    />
                    <div className="netflix-card-overlay">
                      <h6 className="netflix-card-title">{movie.title}</h6>
                      <div className="netflix-card-meta">
                        <span className="netflix-card-match">95% Match</span>
                        <span className="netflix-card-rating">
                          <i className="fas fa-star"></i> {movie.vote_average?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Watch Providers Modal */}
      {showProvidersModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowProvidersModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">
                  <i className="fas fa-tv me-2"></i>
                  Watch "{movieDetails.title}"
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowProvidersModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {processedProviders.length > 0 ? (
                  <div className="d-grid gap-3">
                    {processedProviders.map((provider) => {
                      const redirectUrl = generateRedirectUrl(provider.key, movieDetails.title, id);
                      return (
                        <a
                          key={provider.key}
                          href={redirectUrl}
                          onClick={() => trackProviderClick({ content_id: Number(id), content_type: 'movie', content_title: movieDetails.title, provider: provider.key, provider_url: provider.url })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-light text-start d-flex align-items-center"
                        >
                          {provider.logoPath && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`}
                              alt={provider.displayName}
                              style={{ width: '32px', height: '32px', marginRight: '12px' }}
                            />
                          )}
                          <span>{provider.buttonLabel}</span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted">
                    Not currently available on supported streaming platforms
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showStreamingModal && <StreamingModal
        key={`movie:${id}`}
        selection={{ tmdbId: movieDetails.id, mediaType: 'movie' }} title={movieDetails.title}
        runtimeMinutes={movieDetails.runtime}
        onClose={() => setShowStreamingModal(false)} />}
    </div>
  );
};

export default MovieDetails;
