import React from 'react'
import Hero from './Hero';
import { Link } from 'react-router-dom';
import './About.css';

/**
 * About page component
 * 
 * This component renders the About page, which includes a hero section, 
 * a mission statement, key features, browsing steps, and a call-to-action.
 * 
 * @param {object} props - Component props
 * @param {string} props.title - Page title
 * @returns {JSX.Element} About page component
 */
const About = ({title}) => {
    return ( 
        <div className="about-page">
            {/* Hero section with custom title */}
            <Hero title="About CineHub" subtitle="Discover movies, explore TV series, and find your next watch in one place.">
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3">
                    <Link to="/" className="btn btn-primary btn-sm-md">Browse Movies</Link>
                    <a href="#how-it-works" className="btn btn-outline-light btn-sm-md">How It Works</a>
                </div>
            </Hero>
            
            <div className="container py-4 py-md-5">
                {/* ======================================
                    MISSION SECTION - Introduction to CineHub
                    =========================================== */}
                <div className="row mb-5">
                    <div className="col-12">
                        <div className="text-center mb-5 about-intro">
                            <h2 className="text-white mb-4">A Better Way to Find Your Next Watch</h2>
                            <p className="lead text-white mx-auto px-3" style={{maxWidth: '800px'}}>
                                CineHub brings movie and TV discovery together. Explore trending titles, browse genres and
                                regional collections, watch official trailers, and discover viewing options for the stories that interest you.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ===========================================
                    FEATURES GRID - Key platform features
                    =========================================== */}
                <div className="row mb-5 about-features">
                    {/* Feature 1: Movie and TV discovery */}
                    <div className="col-12 col-md-4 mb-4">
                        <div className="feature-card text-center">
                            <div className="feature-icon mb-3">
                                <i className="fas fa-film fa-3x"></i>
                            </div>
                            <h4 className="feature-title text-white mb-3">Movies &amp; TV Series</h4>
                            <p className="text-secondary">
                                Browse trending releases, popular titles, anime, and regional collections.
                                Explore TV seasons and episodes alongside your favorite films.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2: Genres and title information */}
                    <div className="col-12 col-md-4 mb-4">
                        <div className="feature-card text-center">
                            <div className="feature-icon mb-3">
                                <i className="fas fa-star fa-3x"></i>
                            </div>
                            <h4 className="feature-title text-white mb-3">Discover Your Way</h4>
                            <p className="text-secondary">
                                Search for a title or swipe through genre buttons to match your mood.
                                Read overviews, check ratings, and explore related recommendations.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3: Trailers and viewing options */}
                    <div className="col-12 col-md-4 mb-4">
                        <div className="feature-card text-center">
                            <div className="feature-icon mb-3">
                                <i className="fas fa-play-circle fa-3x"></i>
                            </div>
                            <h4 className="feature-title text-white mb-3">Preview &amp; Watch</h4>
                            <p className="text-secondary">
                                Preview official trailers when available. Use Where to Watch to find platforms,
                                or Watch Now to open the streaming player and choose a source.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="stats-section text-center mb-5 about-demo-stats" aria-labelledby="demo-stats-title">
                    <h3 id="demo-stats-title" className="text-white mb-3">Demo Statistics</h3>
                    <p className="text-secondary mb-4">
                        Illustrative sample figures only. CineHub has no users yet; these are not actual user or catalog counts.
                    </p>
                    <div className="row">
                        <div className="col-6 col-md-6">
                            <div className="stat-item">
                                <h3 className="stat-number text-danger">1M+</h3>
                                <p className="stat-label text-white">Users (sample)</p>
                            </div>
                        </div>
                        <div className="col-6 col-md-6">
                            <div className="stat-item">
                                <h3 className="stat-number text-warning">500+</h3>
                                <p className="stat-label text-white">Genres (sample)</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Four browsing steps */}
                <div className="row mb-5 about-steps" id="how-it-works">
                    <div className="col-12">
                        <div className="stats-section text-center">
                            <h3 className="text-white mb-4">How CineHub Works</h3>
                            <div className="row">
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-danger">01</h3>
                                        <p className="stat-label text-white">Browse or Search</p>
                                    </div>
                                </div>
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-warning">02</h3>
                                        <p className="stat-label text-white">Explore the Details</p>
                                    </div>
                                </div>
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-info">03</h3>
                                        <p className="stat-label text-white">Preview a Trailer</p>
                                    </div>
                                </div>
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-success">04</h3>
                                        <p className="stat-label text-white">Choose How to Watch</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Content */}
                <div className="row mb-5 about-information">
                    <div className="col-12 col-lg-6 mb-4 mb-lg-0">
                        <div className="about-content">
                            <h3 className="text-white mb-3">Our Mission</h3>
                            <p className="text-secondary mb-3">
                                Finding something to watch should feel enjoyable, not overwhelming.
                                Our goal is to help you move from an idea, a genre, or a familiar title
                                to a film or series you want to explore.
                            </p>
                            <p className="text-secondary">
                                CineHub brings together title information, trailers, related recommendations,
                                and viewing options. Movie and TV information comes from TMDB,
                                with related titles to help you keep exploring.
                            </p>
                        </div>
                    </div>
                    <div className="col-12 col-lg-6">
                        <div className="about-content">
                            <h3 className="text-white mb-3">Know Your Viewing Options</h3>
                            <ul className="text-secondary">
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Play Trailer previews an official video when one is available.</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Where to Watch lists supported platforms and opens their links.</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Watch Now opens a third-party player with a choice of streaming servers.</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Choose a TV season and episode to open that selection.</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Availability, playback quality, and subtitles depend on the source and your region.</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Some titles also include a Download link.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="row">
                    <div className="col-12">
                        <div className="cta-section text-center">
                            <h3 className="text-white mb-4">Find Your Next Watch</h3>
                            <p className="text-white mb-4">
                                Explore a trending film, try a new genre, or discover a TV series worth following.
                            </p>
                            <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                                <Link to="/" className="btn btn-primary btn-lg">
                                    <i className="fas fa-play me-2"></i> Browse Movies
                                </Link>
                                <Link to="/tv/genre/10759" className="btn btn-outline-light btn-lg">
                                    <i className="fas fa-tv me-2"></i> Explore TV Shows
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
     );
}
 
export default About;
