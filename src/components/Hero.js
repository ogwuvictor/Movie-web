import React from 'react'
import { Link } from 'react-router-dom';

const Hero = ({title, subtitle, children}) => {
    return (
        <div className="hero-section">
            <div className="container">
                <h1 className="hero-title">
                    {title === 'Home' ? 'Discover Amazing Movies' : title}
                </h1>
                <p className="lead text-white mb-4">
                    {subtitle || 'Explore the latest blockbusters, timeless classics, and hidden gems'}
                </p>
                {children || <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3">
                    <Link to="/" className="btn btn-primary btn-sm-md">
                        Browse Movies
                    </Link>
                </div>}
            </div>
        </div>
     );
}
 
export default Hero;

