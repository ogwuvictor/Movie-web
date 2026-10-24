import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const TVShowTrailers = () => {
  const { id } = useParams();
  const [tvDetails, setTVDetails] = useState({});
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    const loadTVShowTrailers = async () => {
      try {
        // Fetch TV show details with timeout
        const tvDetailUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const tvVideosUrl = `https://api.themoviedb.org/3/tv/${id}/videos?api_key=8f666adc99ee1f6168974514ff6d951a`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const [detailsResponse, videosResponse] = await Promise.all([
          fetch(tvDetailUrl, { signal: controller.signal }),
          fetch(tvVideosUrl, { signal: controller.signal })
        ]);

        clearTimeout(timeoutId);

        const detailsData = await detailsResponse.json();
        const videosData = await videosResponse.json();

        setTVDetails(detailsData);
        
        const allVideos = videosData.results || [];
        
        // Find official trailer (type: "Trailer" AND official: true)
        const trailer = allVideos.find(video => 
          video.type === 'Trailer' && 
          video.official === true &&
          video.site === 'YouTube'
        );
        
        setVideos(trailer ? [trailer] : []);
      } catch (err) {
        console.error('Error fetching TV show trailers:', err);
        setError(err.name === 'AbortError' ? 'Request timeout - please check your connection' : 'Failed to load trailers');
      } finally {
        setLoading(false);
      }
    };

    loadTVShowTrailers();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading trailer...</span>
        </div>
        <p className="mt-3 text-white">Loading trailer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <Link to={`/tv/${id}`} className="btn btn-primary mt-3">
          Back to TV Show Details
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          <Link to={`/tv/${id}`} className="btn btn-outline-light mb-4">
            <i className="fas fa-arrow-left me-2"></i>
            Back to {tvDetails.name}
          </Link>

          <h2 className="section-title mb-4">{tvDetails.name} - Official Trailer</h2>

          {videos.length > 0 ? (
            <div className="trailer-container">
              <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '900px', margin: '0 auto', background: '#1a1a1a', borderRadius: '12px' }}>
                {/* Loading placeholder */}
                {!iframeLoaded && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1a1a1a',
                    borderRadius: '12px'
                  }}>
                    <div className="spinner-border text-white" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Loading video...</span>
                    </div>
                    <p className="mt-3 text-white">Loading trailer video...</p>
                  </div>
                )}
                <iframe
                  src={`https://www.youtube.com/embed/${videos[0].key}`}
                  title={videos[0].name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    opacity: iframeLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onLoad={() => setIframeLoaded(true)}
                  loading="lazy"
                />
              </div>
              <p className="text-secondary mt-3 text-center">
                <i className="fas fa-calendar me-2"></i>
                Published: {new Date(videos[0].published_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-video fa-3x text-secondary mb-3"></i>
              <h4 className="text-white">No Official Trailer Available</h4>
              <p className="text-secondary">No official trailer found for this TV show.</p>
              <Link to={`/tv/${id}`} className="btn btn-primary mt-3">
                Back to TV Show Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TVShowTrailers;
