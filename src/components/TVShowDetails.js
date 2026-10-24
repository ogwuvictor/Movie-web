import React, { useCallback, useEffect, useRef, useState } from 'react';
import { trackProviderClick } from '../utils/analyticsService';
import { useParams, Link } from 'react-router-dom';
import { processProviders, generateRedirectUrl } from '../utils/providerLinkService';
import StreamingModal from './StreamingModal';

const TVShowDetails = () => {
  const { id } = useParams();
  const seriesIdRef = useRef(id);
  seriesIdRef.current = id;
  const [tvDetails, setTVDetails] = useState({});
  const [posterPath, setPosterPath] = useState('');
  const [backDrop, setBackDrop] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setWatchProviders] = useState(null);
  const [processedProviders, setProcessedProviders] = useState([]);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [, setSimilarTVShows] = useState([]);
  const [recommendedTVShows, setRecommendedTVShows] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [episodes, setEpisodes] = useState({});
  const episodesRef = useRef(episodes);
  episodesRef.current = episodes;
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const playbackEpisode = selectedEpisode || episodes[expandedSeason]?.[0];
  const openEpisode = (seasonNumber, episode) => {
    // Use the parent series ID, never the episode's own TMDB ID.
    if (!episodes[seasonNumber]?.some(item => item.id === episode.id)) return;
    setSelectedEpisode({ season_number: seasonNumber, episode_number: episode.episode_number });
    setShowStreamingModal(true);
  };

  // Fetch episodes for a specific season
  const fetchSeasonEpisodes = useCallback(async (seasonNumber, force = false) => {
    if (!force && episodesRef.current[seasonNumber]) {
      // Already fetched, just expand
      setExpandedSeason(seasonNumber);
      return;
    }

    try {
      const seasonUrl = `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?api_key=8f666adc99ee1f6168974514ff6d951a`;
      const response = await fetch(seasonUrl);
      
      if (response.ok) {
        const seasonData = await response.json();
        if (seriesIdRef.current !== id) return;
        setEpisodes(prev => ({
          ...prev,
          [seasonNumber]: seasonData.episodes || []
        }));
        setExpandedSeason(seasonNumber);
      }
    } catch (error) {
      console.error('Error fetching season episodes:', error);
    }
  }, [id]);

  // Toggle season expansion
  const toggleSeason = (seasonNumber) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
    } else {
      setSelectedEpisode(null);
      fetchSeasonEpisodes(seasonNumber);
    }
  };

  useEffect(() => {
    setShowProvidersModal(false);
    setShowStreamingModal(false);
    setSelectedEpisode(null);
    setEpisodes({});
    setExpandedSeason(null);
    setProcessedProviders([]);
    const fetchTVDetails = async () => {
      setLoading(true);
      
      try {
        const tvDetailUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=8f666adc99ee1f6168974514ff6d951a&language=en-US`;
        const response = await fetch(tvDetailUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch TV show details: ${response.status}`);
        }
        
        const data = await response.json();
        if (seriesIdRef.current !== id) return;
        setTVDetails(data);
        setSeasons(data.seasons || []);
        
        // Auto-expand first season if available
        if (data.seasons && data.seasons.length > 0) {
          const firstSeasonNumber = data.seasons[0].season_number;
          fetchSeasonEpisodes(firstSeasonNumber, true);
        }
        setPosterPath(data.poster_path 
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : 'https://placehold.co/780x1170/2a2a2a/FFFFFF?text=No+Poster+Available'
        );
        setBackDrop(data.backdrop_path 
          ? `https://image.tmdb.org/t/p/original/${data.backdrop_path}`
          : ''
        );

        // Fetch watch providers for TV
        const watchProvidersUrl = `https://api.themoviedb.org/3/tv/${id}/watch/providers?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const providersResponse = await fetch(watchProvidersUrl);
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          setWatchProviders(providersData.results);
          
          // Process providers to get supported ones with custom URLs
          const processed = processProviders(providersData.results, data.name);
          setProcessedProviders(processed);
        }

        // Fetch similar TV shows
        const similarTVShowsUrl = `https://api.themoviedb.org/3/tv/${id}/similar?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const similarTVResponse = await fetch(similarTVShowsUrl);
        if (similarTVResponse.ok) {
          const similarTVData = await similarTVResponse.json();
          setSimilarTVShows(similarTVData.results?.slice(0, 10) || []);
        }

        // Fetch recommended TV shows
        const recommendedTVShowsUrl = `https://api.themoviedb.org/3/tv/${id}/recommendations?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const recommendedTVResponse = await fetch(recommendedTVShowsUrl);
        if (recommendedTVResponse.ok) {
          const recommendedTVData = await recommendedTVResponse.json();
          setRecommendedTVShows(recommendedTVData.results?.slice(0, 10) || []);
        }
      } catch (error) {
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTVDetails();
    }
  }, [id, fetchSeasonEpisodes]);

  if (loading) {
    return (
      <div className="movie-details-container">
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading TV show details...</span>
          </div>
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
              <img src={posterPath} className="movie-poster" alt={tvDetails.name} />
            </div>
            <div className="col-md-9">
              <div className="movie-info">
                <h1 className="movie-title">{tvDetails.name}</h1>
                <div className="netflix-meta mb-4">
                  <span className="netflix-match">98% Match</span>
                  <span className="netflix-year">{tvDetails.first_air_date?.split('-')[0]}</span>
                  <span className="netflix-rating">
                    <i className="fas fa-star"></i> {tvDetails.vote_average?.toFixed(1)}
                  </span>
                  <span className="netflix-seasons">
                    {tvDetails.number_of_seasons} Season{tvDetails.number_of_seasons !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="netflix-actions mb-4">
                  <Link to={`/tvtrailers/${id}`} className="netflix-play-btn">
                    <i className="fas fa-play"></i> Play Trailer
                  </Link>
                  <button type="button" className="netflix-play-btn" disabled={!playbackEpisode}
                    onClick={() => setShowStreamingModal(true)}>
                    <i className="fas fa-play"></i> Watch Now
                  </button>
                  {processedProviders.length > 0 ? (
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
                  )}
                </div>

                <p className="movie-overview">{tvDetails.overview}</p>
                
                {tvDetails.genres && (
                  <div className="netflix-genres mb-4">
                    {tvDetails.genres.map((genre) => (
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

      {/* Seasons & Episodes Section */}
      {seasons.length > 0 && (
        <div className="netflix-seasons-section">
          <div className="container py-5">
            <h3 className="netflix-section-title mb-4">Seasons & Episodes</h3>
            <div className="netflix-seasons-list">
              {seasons.map((season) => (
                  <div key={season.id} className="netflix-season-item">
                    <button 
                      className="netflix-season-header"
                      onClick={() => toggleSeason(season.season_number)}
                    >
                      <div className="netflix-season-info">
                        <span className="netflix-season-number">
                          {season.name}
                        </span>
                        <span className="netflix-episode-count">
                          {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
                        </span>
                        <span className="netflix-season-date">
                          {season.air_date ? new Date(season.air_date).getFullYear() : 'N/A'}
                        </span>
                      </div>
                    </button>
                    
                    {expandedSeason === season.season_number && episodes[season.season_number] && (
                      <div className="netflix-episodes-list">
                        {episodes[season.season_number].map((episode) => (
                          <div key={episode.id} className="netflix-episode-item"
                            role="button" tabIndex={0}
                            onClick={() => openEpisode(season.season_number, episode)}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openEpisode(season.season_number, episode);
                              }
                            }}>
                            <div className="netflix-episode-number">
                              {episode.episode_number}
                            </div>
                            <div className="netflix-episode-info">
                              <h6 className="netflix-episode-title">
                                {episode.name}
                              </h6>
                              <p className="netflix-episode-overview">
                                {episode.overview || 'No overview available.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* More Like This Section */}
      {recommendedTVShows.length > 0 && (
        <div className="netflix-more-like-this">
          <div className="container py-5">
            <h3 className="netflix-section-title mb-4">More Like This</h3>
            <div className="netflix-row">
              {recommendedTVShows.map((show) => {
                const posterpath = show.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                  : 'https://placehold.co/500x750/2a2a2a/FFFFFF?text=No+Poster';
                
                return (
                  <Link 
                    key={show.id} 
                    to={`/tv/${show.id}`}
                    className="netflix-card"
                  >
                    <img 
                      src={posterpath} 
                      alt={show.name}
                      className="netflix-card-poster"
                    />
                    <div className="netflix-card-overlay">
                      <h6 className="netflix-card-title">{show.name}</h6>
                      <div className="netflix-card-meta">
                        <span className="netflix-card-match">95% Match</span>
                        <span className="netflix-card-rating">
                          <i className="fas fa-star"></i> {show.vote_average?.toFixed(1)}
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
                  Watch "{tvDetails.name}"
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
                      const redirectUrl = generateRedirectUrl(provider.key, tvDetails.name, id, 'tv');
                      return (
                        <a
                          key={provider.key}
                          href={redirectUrl}
                          onClick={() => trackProviderClick({ content_id: Number(id), content_type: 'tv', content_title: tvDetails.name, provider: provider.key, provider_url: provider.url })}
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
      {showStreamingModal && playbackEpisode && <StreamingModal
        selection={{ tmdbId: id, mediaType: 'tv',
          season: playbackEpisode.season_number ?? expandedSeason,
          episode: playbackEpisode.episode_number }}
        title={tvDetails.name} onClose={() => setShowStreamingModal(false)} />}
    </div>
  );
};

export default TVShowDetails;
