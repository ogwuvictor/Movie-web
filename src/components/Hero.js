import React from 'react'

const Hero = ({title}) => {
    return (
        <div className="hero-section">
            <div className="container">
                <h1 className="hero-title">
                    {title === 'Home' ? 'Discover Amazing Movies' : title}
                </h1>
                <p className="lead text-white mb-4">
                    Explore the latest blockbusters, timeless classics, and hidden gems
                </p>
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3">
                    <button className="btn btn-primary btn-sm-md">
                        Browse Movies
                    </button>
                    <button className="btn btn-outline-light btn-sm-md">
                        Watch Trailers
                    </button>
                </div>
            </div>
        </div>
     );
}
 
export default Hero;

