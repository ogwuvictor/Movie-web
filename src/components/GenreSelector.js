import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const GenreSelector = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const apiUrl = 'https://api.themoviedb.org/3/genre/movie/list?language=en&api_key=8f666adc99ee1f6168974514ff6d951a';
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setGenres(data.genres || []);
      } catch (error) {
        console.error('Error fetching genres:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.genre-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  if (loading) {
    return (
      <div className="genre-selector">
        <button className="btn btn-outline-light" disabled>
          <i className="fas fa-film me-2"></i>
          Loading Genres...
        </button>
      </div>
    );
  }

  return (
    <div className="genre-selector position-relative">
      <button 
        className="btn btn-outline-light dropdown-toggle"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
      >
        <i className="fas fa-film me-2"></i>
        Genres
        <i className="fas fa-chevron-down ms-2"></i>
      </button>
      
      {isOpen && (
        <div className="genre-dropdown-menu">
          {genres.map((genre) => (
            <Link 
              key={genre.id}
              className="genre-dropdown-item" 
              to={`/genre/${genre.id}`}
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-play-circle me-2"></i>
              {genre.name}
            </Link>
          ))}
          
          {genres.length === 0 && (
            <span className="genre-dropdown-item disabled">
              <i className="fas fa-exclamation-circle me-2"></i>
              No genres available
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default GenreSelector;
