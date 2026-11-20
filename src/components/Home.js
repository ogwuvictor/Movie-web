import React from 'react'
import Hero from './Hero';
import MediaRow from './MediaRow';
import GenreSelector from './GenreSelector';
import './Home.css';

/**
 * Home Component
 * 
 * Main landing page component that renders the hero section and all movie/TV categories.
 * Displays different collections in a clean, organized layout.
 * 
 * @param {object} props - Component props
 * @param {string} props.title - Page title (currently unused)
 * @returns {JSX.Element} Home page component
 */
const Home = ({title}) => {
    return ( 
        <div className="home-page">
            {/* Hero section with main call-to-action */}
            <Hero title="Home"/>
            
            <div className="container home-content">
                {/* Swipeable genre buttons */}
                <div className="section-header mb-4">
                    <h2 className="section-title">Browse by Genre</h2>
                    <p className="text-secondary">Choose your favorite movie genre to discover new films</p>
                </div>
                <GenreSelector />
                
    

                {/* 1. Trending */}
                <div className="section-header">
                    <h3 className="section-title">Trending 🔥</h3>
                </div>
                <MediaRow endpoint="trending/movie/day" label="trending movies" />
                
                {/* 2. Now Playing */}
                <div className="section-header">
                    <h3 className="section-title">Now Playing</h3>
                </div>
                <MediaRow endpoint="movie/now_playing" label="now playing movies" />
                
                {/* 3. Popular Movies */}
                <div className="section-header">
                    <h3 className="section-title">Popular Movies</h3>
                </div>
                <MediaRow endpoint="movie/popular" label="popular movies" />
                
                {/* 4. Top Rated Movies */}
                <div className="section-header">
                    <h3 className="section-title">Top Rated Movies</h3>
                </div>
                <MediaRow endpoint="movie/top_rated" label="top rated movies" />
                
                {/* 5. Upcoming */}
                <div className="section-header">
                    <h3 className="section-title">Upcoming</h3>
                </div>
                <MediaRow endpoint="movie/upcoming" label="upcoming movies" />
                
                {/* ===========================================
                    🎨 ANIME SECTION
                    =========================================== */}
                <div className="section-header mb-4 mt-5">
                    <h2 className="section-title">🎨 Anime</h2>
                </div>

                {/* 6. Anime */}
                <div className="section-header">
                    <h3 className="section-title">Popular Anime</h3>
                </div>
                <MediaRow endpoint="discover/movie" query="with_genres=16&with_original_language=ja&sort_by=popularity.desc" label="anime movies" />
                
                {/* 7. Anime TV Series */}
                <div className="section-header">
                    <h3 className="section-title">Anime TV Series</h3>
                </div>
                <MediaRow endpoint="discover/tv" query="with_genres=16&with_original_language=ja&sort_by=popularity.desc" mediaType="tv" label="anime TV series" />
                
                {/* ===========================================
                    📺 TV SHOWS SECTION
                    =========================================== */}
                <div className="section-header mb-4 mt-5">
                    <h2 className="section-title">📺 TV Shows</h2>
                </div>

                {/* 8. Popular TV Shows */}
                <div className="section-header">
                    <h3 className="section-title">Popular TV Shows</h3>
                </div>
                <MediaRow endpoint="tv/popular" mediaType="tv" label="popular TV shows" />
                
                {/* 9. Airing Today */}
                <div className="section-header">
                    <h3 className="section-title">Airing Today</h3>
                </div>
                <MediaRow endpoint="tv/airing_today" mediaType="tv" label="TV shows airing today" />
                
                {/* 10. On The Air */}
                <div className="section-header">
                    <h3 className="section-title">On The Air</h3>
                </div>
                <MediaRow endpoint="tv/on_the_air" mediaType="tv" label="TV shows on the air" />
                
                {/* 11. Top Rated TV Shows */}
                <div className="section-header">
                    <h3 className="section-title">Top Rated TV Shows</h3>
                </div>
                <MediaRow endpoint="tv/top_rated" mediaType="tv" label="top rated TV shows" />
                
                {/* ===========================================
                    🎬 GENRE & REGIONAL SECTION
                    =========================================== */}
                <div className="section-header mb-4 mt-5">
                    <h2 className="section-title">🎬 Genre & Regional</h2>
                </div>

                {/* 12. Turkish Drama */}
                <div className="section-header">
                    <h3 className="section-title">Turkish Drama</h3>
                </div>
                <MediaRow endpoint="discover/tv" query="with_original_language=tr&sort_by=popularity.desc" mediaType="tv" label="Turkish dramas" />
                
                {/* 13. Adventure Movies */}
                <div className="section-header">
                    <h3 className="section-title">Adventure Movies</h3>
                </div>
                <MediaRow endpoint="discover/movie" query="with_genres=12&sort_by=popularity.desc" label="adventure movies" />
                
                {/* 14. Teen Romance */}
                <div className="section-header">
                    <h3 className="section-title">💓 Teen Romance 💓</h3>
                </div>
                <MediaRow endpoint="discover/movie" query="with_genres=10749&sort_by=popularity.desc" label="teen romance movies" />
                
                {/* 15. Horror Movies */}
                <div className="section-header">
                    <h3 className="section-title">Horror Movies</h3>
                </div>
                <MediaRow endpoint="discover/movie" query="with_genres=27&sort_by=popularity.desc" label="horror movies" />
                
                {/* 16. Action Movies */}
                <div className="section-header">
                    <h3 className="section-title">Action Movies</h3>
                </div>
                <MediaRow endpoint="discover/movie" query="with_genres=28&sort_by=popularity.desc" label="action movies" />
                
                {/* 17. C-Drama */}
                <div className="section-header">
                    <h3 className="section-title">C-Drama</h3>
                </div>
                <MediaRow endpoint="discover/tv" query="with_original_language=zh&sort_by=popularity.desc" mediaType="tv" label="C-Dramas" />
                
                {/* 18. K-Drama */}
                <div className="section-header">
                    <h3 className="section-title">K-Drama</h3>
                </div>
                <MediaRow endpoint="discover/tv" query="with_original_language=ko&sort_by=popularity.desc" mediaType="tv" label="K-Dramas" />
                
                {/* 19. SA Drama */}
                <div className="section-header">
                    <h3 className="section-title">SA Drama</h3>
                </div>
                <MediaRow endpoint="discover/tv" query="with_origin_country=ZA&sort_by=popularity.desc" mediaType="tv" label="SA Dramas" />
                
                {/* 20. Nollywood Movies */}
                <div className="section-header">
                    <h3 className="section-title">Nollywood Movies</h3>
                </div>
                <MediaRow endpoint="discover/movie" query="with_origin_country=NG&sort_by=popularity.desc" label="Nollywood movies" />
            </div>
        </div>
     );
}
 
export default Home;
