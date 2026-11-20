import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import useAutoScroll from '../hooks/useAutoScroll';
import { tmdbUrl, tmdbPoster, tmdbTitle, tmdbDetailPath } from '../utils/tmdbConfig';

const SKELETON_COUNT = 8;

/**
 * MediaRow Component
 *
 * Generic horizontal scrolling row that fetches titles from a TMDB endpoint
 * and renders poster cards with auto-scroll. Replaces the former per-genre
 * components which were identical except for endpoint and media type.
 * Shows shimmer skeleton cards while the first page of results loads.
 *
 * @param {string} endpoint - TMDB API path, e.g. 'movie/popular' or 'discover/tv'
 * @param {string} [query] - Extra query params (without api_key), e.g. 'with_genres=28&sort_by=popularity.desc'
 * @param {'movie'|'tv'} [mediaType] - Determines detail link and title field
 * @param {string} [label] - Label used in error logging
 */
const MediaRow = ({ endpoint, query = '', mediaType = 'movie', label = 'items' }) => {
    const [result, setResult] = useState([])
    const [loading, setLoading] = useState(true)
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

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetch(tmdbUrl(endpoint, query))
            .then((response) => response.json())
            .then((data) => {
                if (active) setResult(data.results || [])
            })
            .catch(error => {
                console.error(`Error fetching ${label}:`, error)
            })
            .finally(() => {
                if (active) setLoading(false)
            });
        return () => { active = false; };
    }, [endpoint, query, label]);

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
                {loading && result.length === 0 ? (
                    Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                        <div key={`skeleton-${index}`} className="movie-row-card skeleton-card" aria-hidden="true">
                            <div className="movie-row-poster skeleton-shimmer" />
                        </div>
                    ))
                ) : (
                    result.map((item) => {
                        const title = tmdbTitle(item);
                        return (
                            <Link
                                key={item.id}
                                to={tmdbDetailPath(mediaType, item.id)}
                                className="movie-row-card"
                            >
                                <img
                                    src={tmdbPoster(item.poster_path)}
                                    alt={title}
                                    className="movie-row-poster"
                                    loading="lazy"
                                />
                                <div className="movie-row-overlay">
                                    <h6 className="movie-row-title">{title}</h6>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
            {loading && result.length === 0 && (
                <span className="visually-hidden" role="status">Loading {label}...</span>
            )}
        </div>
    );
}

export default MediaRow;
