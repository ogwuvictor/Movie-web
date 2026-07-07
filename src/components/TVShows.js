import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from './Moviecard';

const TVShows = () => {
  const { genreId } = useParams();
  const [tvShows, setTVShows] = useState([]);
  const [genreName, setGenreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (genreId) {
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=8f666adc99ee1f6168974514ff6d951a&with_genres=${genreId}&language=en-US&sort_by=popularity.desc`)
        .then(res => res.json())
        .then(data => {
          setTVShows(data.results || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error:', err);
          setError('Failed to load TV shows');
          setLoading(false);
        });

      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=8f666adc99ee1f6168974514ff6d951a&language=en`)
        .then(res => res.json())
        .then(data => {
          const genre = data.genres.find(g => g.id.toString() === genreId.toString());
          setGenreName(genre ? genre.name : 'TV Genre');
        })
        .catch(err => {
          console.error('Error fetching TV genre:', err);
        });
    }
  }, [genreId]);

  if (loading) {
    return (
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <div className="section-header text-center">
              <h2 className="section-title">Loading...</h2>
              <div className="spinner-border text-primary mt-3" role="status">
                <span className="visually-hidden">Loading TV shows...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <div className="section-header text-center">
              <h2 className="section-title">Error</h2>
              <p className="text-danger">{error}</p>
              <Link to="/" className="btn btn-primary mt-3">Go Back Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
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
            <div className="row">
              {tvShows.map((show) => (
                <div key={show.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                  <div className="movie-card">
                    <img 
                      src={show.poster_path ? `https://image.tmdb.org/t/p/w780${show.poster_path}` : 'https://placehold.co/780x1170/2a2a2a/FFFFFF?text=No+Poster'} 
                      alt={show.name} 
                      loading="lazy"
                    />
                    <div className="movie-card-body">
                      <h5 className="movie-card-title">{show.name}</h5>
                      <p className="movie-card-text">
                        {show.overview ? show.overview.substring(0, 100) + '...' : 'No description available'}
                      </p>
                      <Link to={`/tv/${show.id}`} className="btn btn-primary btn-sm">
                        View Details
                      </Link>
                    </div>
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
        </div>
      </div>
    </div>
  );
};

export default TVShows;
