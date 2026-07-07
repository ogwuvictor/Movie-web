import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import GenreDropdownPortal from './GenreDropdownPortal';
import TVGenreDropdown from './TVGenreDropdown';
import { useDebounce } from '../hooks/useDebounce';

function Navbar({searchText, setSearchText}){
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [inputValue, setInputValue] = useState(searchText || '');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Requirement #8: Add debounce to search input (500ms delay)
  const debouncedSearch = useDebounce(inputValue, 500);
  
  // Update parent state when debounced value changes
  useEffect(() => {
    setSearchText(debouncedSearch);
    
    // Navigate to search page if there's a search term AND we're not already on the search page
    if (debouncedSearch && debouncedSearch.trim() !== '' && location.pathname !== '/search') {
      navigate('/search');
    }
  }, [debouncedSearch, setSearchText, navigate, location.pathname]);

  // Clear search input when navigating away from search page
  useEffect(() => {
    if (location.pathname !== '/search') {
      setInputValue('');
      setSearchText('');
    }
  }, [location.pathname, setSearchText]);

  const updateText = (e) => {
    const value = e.target.value;
    setInputValue(value);
  };

 const toggleNav = () => {
   setIsNavOpen(!isNavOpen);
 }
 
 const handleSearchSubmit = (e) => {
   e.preventDefault();
   if (inputValue.trim()) {
     navigate('/search');
   }
 }
 
    return(
      <div>
         <nav className="navbar navbar-expand-lg bg-body-tertiary">
  <div className="container-fluid">
    <Link className="navbar-brand" to={"/"}>CineHub</Link>
    <button 
      className="navbar-toggler" 
      type="button" 
      onClick={toggleNav}
      aria-controls="navbarSupportedContent" 
      aria-expanded={isNavOpen} 
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>
    <div className={`collapse navbar-collapse ${isNavOpen ? 'show' : ''}`} id="navbarSupportedContent">
      <ul className="navbar-nav me-auto mb-2 mb-lg-0">
        <li className="nav-item">
          <Link className="nav-link active" aria-current="page" to={'/'} onClick={() => setIsNavOpen(false)}>Home</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to={'/about'} onClick={() => setIsNavOpen(false)}>About</Link>
        </li>
        <TVGenreDropdown />
        <GenreDropdownPortal />
        {/* <li className="nav-item dropdown">
          <a className="nav-link dropdown-toggle" href="gotosomewhere" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            Movie List
          </a>
          <ul className="dropdown-menu">
            <li><a className="dropdown-item" href="gotosomewhere">Action</a></li>
            <li><a className="dropdown-item" href="gotosomewhere">Another action</a></li>
            <li><hr className="dropdown-divider" /></li>
            <li><a className="dropdown-item" href="gotosomewhere">Something else here</a></li>
          </ul>
        </li> */}
        {/* <li className="nav-item">
          <a href="gotosomewhere" aria-disabled="true">Disabled</a>
        </li> */}
      </ul>
      <form className="d-flex" role="search" onSubmit={handleSearchSubmit}>
        <input 
          className="form-control me-2" 
          type="search" 
          placeholder="Search movies, TV shows, people..." 
          aria-label="Search"
          onChange={updateText}
          value={inputValue}
        />
        <button className="btn btn-outline-dark" type="submit">
          <i className="fas fa-search"></i>
        </button>
      </form>
    </div>
  </div>
</nav>
      </div>
    )
  } 
  export default Navbar;