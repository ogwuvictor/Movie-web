import React from 'react'
import { Link } from 'react-router-dom';

/**
 * MovieCard Component
 * 
 * Renders an individual movie card with poster, title, overview, and link to details.
 * Uses responsive grid classes for proper layout across devices.
 * 
 * @param {object} props - Component props
 * @param {object} props.movie - Movie object containing movie data
 * @param {number} props.movie.id - Movie ID for routing
 * @param {string} props.movie.title - Movie title
 * @param {string} props.movie.overview - Movie description/overview
 * @param {string} props.movie.poster_path - Poster image path from TMDB
 * @returns {JSX.Element} Movie card component
 */
const MovieCard = ({movie}) => {
    // Construct full poster URL using TMDB base URL with high quality (w780)
    const posterpath = movie.poster_path 
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : 'https://placehold.co/780x1170/2a2a2a/FFFFFF?text=No+Poster'

    /**
     * Truncates text to a specific number of lines with ellipsis
     * Used to limit the overview text to prevent layout issues
     * 
     * @param {string} text - Text to truncate
     * @param {number} maxLines - Maximum number of lines to show
     * @returns {string} Truncated text with ellipsis if needed
     */
    const truncateText = (text, maxLines) => {
        const lines = text.split('\n'); // Split text into lines
        if (lines.length <= maxLines) {
          return text;
        }
        return lines.slice(0, maxLines).join('\n') + '...'; // Truncate and add ellipsis
      };
    
    // Render movie card with responsive grid classes
    return ( 
        // Responsive grid: 4 cols on desktop, 3 on tablet, 2 on mobile
        <div className='col-lg-3 col-md-4 col-sm-6 mb-4'>
            <div className="movie-card">
                {/* Movie poster image */}
                <img src={posterpath} alt={movie.title} />
                
                {/* Card content section */}
                <div className="movie-card-body">
                    {/* Movie title */}
                    <h5 className="movie-card-title">{movie.title}</h5>
                    
                    {/* Truncated movie overview */}
                    <p className="movie-card-text">
                        {truncateText(movie.overview, 3)} {/* Limit to 3 lines */}
                    </p>
                    
                    {/* Link to movie details page */}
                    <Link to={`/moviedetails/${movie.id}`} className="btn btn-primary">
                        View Details
                    </Link>
                </div>
            </div>
        </div>
     );
}
 
export default MovieCard;
