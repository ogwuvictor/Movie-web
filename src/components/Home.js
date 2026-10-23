import React from 'react'
import Hero from './Hero';
import Trending from './Trending';
import NowPlaying from './nowplaying';
import PopularMovie from './popularmovie';
import TopRated from './Toprated';
import UpComing from './Upcoming';
import Anime from './Anime';
import AnimeTV from './AnimeTV';
import PopularTVShows from './PopularTVShows';
import AiringToday from './AiringToday';
import OnTheAir from './OnTheAir';
import TopRatedTVShows from './TopRatedTVShows';
import GenreSelector from './GenreSelector';
import TurkishDrama from './TurkishDrama';
import AdventureMovies from './AdventureMovies';
import TeenRomance from './TeenRomance';
import HorrorMovies from './HorrorMovies';
import ActionMovies from './ActionMovies';
import CDrama from './CDrama';
import KDrama from './KDrama';
import SADrama from './SADrama';
import NollywoodMovies from './NollywoodMovies';
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
                <Trending />
                
                {/* 2. Now Playing */}
                <div className="section-header">
                    <h3 className="section-title">Now Playing</h3>
                </div>
                <NowPlaying />
                
                {/* 3. Popular Movies */}
                <div className="section-header">
                    <h3 className="section-title">Popular Movies</h3>
                </div>
                <PopularMovie />
                
                {/* 4. Top Rated Movies */}
                <div className="section-header">
                    <h3 className="section-title">Top Rated Movies</h3>
                </div>
                <TopRated />
                
                {/* 5. Upcoming */}
                <div className="section-header">
                    <h3 className="section-title">Upcoming</h3>
                </div>
                <UpComing />
                
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
                <Anime />
                
                {/* 7. Anime TV Series */}
                <div className="section-header">
                    <h3 className="section-title">Anime TV Series</h3>
                </div>
                <AnimeTV />
                
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
                <PopularTVShows />
                
                {/* 9. Airing Today */}
                <div className="section-header">
                    <h3 className="section-title">Airing Today</h3>
                </div>
                <AiringToday />
                
                {/* 10. On The Air */}
                <div className="section-header">
                    <h3 className="section-title">On The Air</h3>
                </div>
                <OnTheAir />
                
                {/* 11. Top Rated TV Shows */}
                <div className="section-header">
                    <h3 className="section-title">Top Rated TV Shows</h3>
                </div>
                <TopRatedTVShows />
                
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
                <TurkishDrama />
                
                {/* 13. Adventure Movies */}
                <div className="section-header">
                    <h3 className="section-title">Adventure Movies</h3>
                </div>
                <AdventureMovies />
                
                {/* 14. Teen Romance */}
                <div className="section-header">
                    <h3 className="section-title">💓 Teen Romance 💓</h3>
                </div>
                <TeenRomance />
                
                {/* 15. Horror Movies */}
                <div className="section-header">
                    <h3 className="section-title">Horror Movies</h3>
                </div>
                <HorrorMovies />
                
                {/* 16. Action Movies */}
                <div className="section-header">
                    <h3 className="section-title">Action Movies</h3>
                </div>
                <ActionMovies />
                
                {/* 17. C-Drama */}
                <div className="section-header">
                    <h3 className="section-title">C-Drama</h3>
                </div>
                <CDrama />
                
                {/* 18. K-Drama */}
                <div className="section-header">
                    <h3 className="section-title">K-Drama</h3>
                </div>
                <KDrama />
                
                {/* 19. SA Drama */}
                <div className="section-header">
                    <h3 className="section-title">SA Drama</h3>
                </div>
                <SADrama />
                
                {/* 20. Nollywood Movies */}
                <div className="section-header">
                    <h3 className="section-title">Nollywood Movies</h3>
                </div>
                <NollywoodMovies />
            </div>
        </div>
     );
}
 
export default Home;
