import React from 'react'
import Hero from './Hero';

/**
 * About page component
 * 
 * This component renders the About page, which includes a hero section, 
 * a mission statement, key features, statistics, and a call-to-action.
 * 
 * @param {object} props - Component props
 * @param {string} props.title - Page title
 * @returns {JSX.Element} About page component
 */
const About = ({title}) => {
    return ( 
        <div>
            {/* Hero section with custom title */}
            <Hero title="About CineHub"/>
            
            <div className="container py-4 py-md-5">
                {/* ======================================
                    MISSION SECTION - Introduction to CineHub
                    =========================================== */}
                <div className="row mb-5">
                    <div className="col-12">
                        <div className="text-center mb-5">
                            <h2 className="text-white mb-4">Discover Your Next Favorite Movie</h2>
                            <p className="lead text-white mx-auto px-3" style={{maxWidth: '800px'}}>
                                CineHub is your ultimate destination for discovering, exploring, and enjoying the world of cinema.
                                We bring you the latest and greatest from the silver screen, all in one beautifully designed platform.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ===========================================
                    FEATURES GRID - Key platform features
                    =========================================== */}
                <div className="row mb-5">
                    {/* Feature 1: Extensive Library */}
                    <div className="col-12 col-md-4 mb-4">
                        <div className="feature-card text-center">
                            <div className="feature-icon mb-3">
                                <i className="fas fa-film fa-3x"></i>
                            </div>
                            <h4 className="feature-title text-white mb-3">Extensive Library</h4>
                            <p className="text-secondary">
                                Access thousands of movies from every genre, era, and country.
                                From blockbusters to hidden gems, we've got it all.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2: Curated Collections */}
                    <div className="col-12 col-md-4 mb-4">
                        <div className="feature-card text-center">
                            <div className="feature-icon mb-3">
                                <i className="fas fa-star fa-3x"></i>
                            </div>
                            <h4 className="feature-title text-white mb-3">Curated Collections</h4>
                            <p className="text-secondary">
                                Discover hand-picked selections including trending films,
                                critically acclaimed masterpieces, and audience favorites.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3: Watch Trailers */}
                    <div className="col-12 col-md-4 mb-4">
                        <div className="feature-card text-center">
                            <div className="feature-icon mb-3">
                                <i className="fas fa-play-circle fa-3x"></i>
                            </div>
                            <h4 className="feature-title text-white mb-3">Watch Trailers</h4>
                            <p className="text-secondary">
                                Get a sneak peek with high-quality trailers and behind-the-scenes
                                content before making your movie selection.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ===========================================
                    STATS SECTION - Key statistics
                    =========================================== */}
                <div className="row mb-5">
                    <div className="col-12">
                        <div className="stats-section text-center">
                            <div className="row">
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-danger">10K+</h3>
                                        <p className="stat-label text-white">Movies</p>
                                    </div>
                                </div>
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-warning">500+</h3>
                                        <p className="stat-label text-white">Genres</p>
                                    </div>
                                </div>
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-info">50K+</h3>
                                        <p className="stat-label text-white">Reviews</p>
                                    </div>
                                </div>
                                <div className="col-6 col-md-3 mb-4 mb-md-0">
                                    <div className="stat-item">
                                        <h3 className="stat-number text-success">1M+</h3>
                                        <p className="stat-label text-white">Users</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Content */}
                <div className="row mb-5">
                    <div className="col-12 col-lg-6 mb-4 mb-lg-0">
                        <div className="about-content">
                            <h3 className="text-white mb-3">Our Mission</h3>
                            <p className="text-secondary mb-3">
                                At CineHub, we believe that great cinema has the power to inspire, entertain,
                                and bring people together. Our mission is to make movie discovery effortless and
                                enjoyable for film enthusiasts everywhere.
                            </p>
                            <p className="text-secondary">
                                Whether you're a casual moviegoer or a dedicated cinephile, our platform
                                provides the tools and insights you need to explore the vast world of cinema
                                and find your next favorite film.
                            </p>
                        </div>
                    </div>
                    <div className="col-12 col-lg-6">
                        <div className="about-content">
                            <h3 className="text-white mb-3">Why Choose CineHub?</h3>
                            <ul className="text-secondary">
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Real-time updates with latest releases</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Personalized recommendations</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>High-quality trailers and clips</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Detailed movie information and ratings</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Beautiful, intuitive user interface</li>
                                <li className="mb-2"><i className="fas fa-check text-success me-2"></i>Available on all your devices</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="row">
                    <div className="col-12">
                        <div className="cta-section text-center">
                            <h3 className="text-white mb-4">Ready to Explore?</h3>
                            <p className="text-white mb-4">
                                Join thousands of movie lovers who have already discovered their next favorite film on CineHub.
                            </p>
                            <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                                <button className="btn btn-primary btn-lg">
                                    <i className="fas fa-play me-2"></i> Start Exploring
                                </button>
                                <button className="btn btn-outline-light btn-lg">
                                    <i className="fas fa-info-circle me-2"></i> Learn More
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
     );
}
 
export default About;