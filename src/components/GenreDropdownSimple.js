import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const GenreDropdownSimple = () => {
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
      if (!event.target.closest('.genre-dropdown-simple')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <li className="nav-item">
        <span className="nav-link">
          <i className="fas fa-film me-2"></i>
          Loading...
        </span>
      </li>
    );
  }

  return (
    <li className="nav-item genre-dropdown-simple" style={{ position: 'relative' }}>
      <a 
        className="nav-link" 
        href="#" 
        onClick={(e) => { e.preventDefault(); toggleDropdown(); }}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <i className="fas fa-film me-2"></i>
        Genres
        <i className="fas fa-chevron-down ms-2"></i>
      </a>
      
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            minWidth: '200px',
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 100000,
            marginTop: '0.5rem',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {genres.map((genre) => (
            <Link 
              key={genre.id}
              to={`/genre/${genre.id}`}
              onClick={() => setIsOpen(false)}
              style={{
                display: 'block',
                padding: '0.75rem 1rem',
                color: 'white',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                transition: 'background 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e50914'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-play-circle me-2"></i>
              {genre.name}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
};

export default GenreDropdownSimple;
