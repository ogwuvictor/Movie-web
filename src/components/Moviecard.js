import React from 'react';
import { Link } from 'react-router-dom';
import './Moviecard.css';

const MovieCard = ({ movie, mediaType = 'movie' }) => {
    const title = movie.title || movie.name || 'Untitled';
    const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
    return (
        <Link className="catalog-card" to={mediaType === 'tv' ? '/tv/' + movie.id : '/moviedetails/' + movie.id}>
            <div className="catalog-card-artwork">
                {movie.poster_path ? (
                    <img src={'https://image.tmdb.org/t/p/w342' + movie.poster_path} alt="" loading="lazy"
                        onError={event => { event.currentTarget.hidden = true; }} />
                ) : null}
                <span className="catalog-poster-fallback" aria-hidden="true">No poster available</span>
            </div>
            <div className="catalog-card-info">
                <h3 title={title}>{title}</h3>
                {year && <span>{year}</span>}
            </div>
        </Link>
    );
};
export default MovieCard;
