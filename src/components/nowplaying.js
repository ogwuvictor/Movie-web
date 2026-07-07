import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import useAutoScroll from '../hooks/useAutoScroll';

/**
 * NowPlaying Component
 *
 * Fetches and displays movies currently playing in theaters.
 * Renders movies in a horizontal scrolling row layout with auto-scroll.
 *
 * @param {object} props - Component props
 * @param {string} props.title - Component title (currently unused)
 * @returns {JSX.Element} Now playing movies horizontal scroll component
 */
const NowPlaying = ({title}) => {
    const [result, setResult] = useState([])
    const {
        scrollContainerRef,
        handleUserScroll,
        handleMouseEnter,
        handleMouseLeave,
        handleTouchStart,
        handleTouchEnd
    } = useAutoScroll({
        scrollInterval: 4000,
        scrollAmount: 200,
        enabled: true
    });

    // Fetch now playing movies when component mounts
    useEffect(()=> {
        const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=8f666adc99ee1f6168974514ff6d951a`
        fetch(url)
        .then((response) => response.json())
       .then((data) => {
        setResult(data.results)
       })
       .catch(error => {
           console.error('Error fetching now playing movies:', error)
       });
    }, []);

    return (
        <div className="movie-row-container mb-5">
            <div
                className="movie-row"
                ref={scrollContainerRef}
                onScroll={handleUserScroll}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {result.map((movie) => {
                    const posterpath = movie.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : 'https://placehold.co/500x750/2a2a2a/FFFFFF?text=No+Poster';

                    return (
                        <Link
                            key={movie.id}
                            to={`/moviedetails/${movie.id}`}
                            className="movie-row-card"
                        >
                            <img
                                src={posterpath}
                                alt={movie.title}
                                className="movie-row-poster"
                            />
                            <div className="movie-row-overlay">
                                <h6 className="movie-row-title">{movie.title}</h6>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
     );
}
 
export default NowPlaying;