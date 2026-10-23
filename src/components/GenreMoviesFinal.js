import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MovieCard from './Moviecard';

const GenreMovies = () => {
  const { genreId } = useParams();
  const [movies, setMovies] = useState([]);
  const [genreName, setGenreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (genreId) {
      // Fetch movies
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=8f666adc99ee1f6168974514ff6d951a&with_genres=${genreId}&language=en-US&sort_by=popularity.desc`)
        .then(res => res.json())
        .then(data => {
          setMovies(data.results || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error:', err);
          setError('Failed to load movies');
          setLoading(false);
        });

      // Fetch genre name
      fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=8f666adc99ee1f6168974514ff6d951a&language=en`)
        .then(res => res.json())
        .then(data => {
          const genre = data.genres.find(g => g.id.toString() === genreId.toString());
          setGenreName(genre ? genre.name : 'Genre');
        })
        .catch(err => {
          console.error('Error fetching genre:', err);
        });
    }
  }, [genreId]);

  if (loading) {
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

  if (error) {
    return (
      <div className="container catalog-page py-5">
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
        </div>
      </div>
    </div>
  );
};

export default GenreMovies;
