import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import useAutoScroll from '../hooks/useAutoScroll';

const PopularTVShows = ({title}) => {
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

    useEffect(()=> {
        const url = `https://api.themoviedb.org/3/tv/popular?api_key=8f666adc99ee1f6168974514ff6d951a`
        fetch(url)
        .then((response) => response.json())
       .then((data) => {
        setResult(data.results)
       })
       .catch(error => {
           console.error('Error fetching popular TV shows:', error)
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
                {result.map((tv) => {
                    const posterpath = tv.poster_path
                        ? `https://image.tmdb.org/t/p/w500${tv.poster_path}`
                        : 'https://placehold.co/500x750/2a2a2a/FFFFFF?text=No+Poster';

                    return (
                        <Link
                            key={tv.id}
                            to={`/tv/${tv.id}`}
                            className="movie-row-card"
                        >
                            <img
                                src={posterpath}
                                alt={tv.name}
                                className="movie-row-poster"
                            />
                            <div className="movie-row-overlay">
                                <h6 className="movie-row-title">{tv.name}</h6>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
     );
}
 
export default PopularTVShows;
