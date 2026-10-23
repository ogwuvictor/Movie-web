import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom'
import GenreDropdownPortal from './GenreDropdownPortal';
import TVGenreDropdown from './TVGenreDropdown';
import { useDebounce } from '../hooks/useDebounce';

function Navbar({searchText, setSearchText}){
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [inputValue, setInputValue] = useState(searchText || '');
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 575.98px)').matches);
  const drawerRef = useRef(null);
  const toggleRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const phones = window.matchMedia('(max-width: 575.98px)');
    const onResize = event => { setIsPhone(event.matches); setIsNavOpen(false); };
    phones.addEventListener('change', onResize);
    return () => phones.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    if (!isPhone || !isNavOpen) return;
    const root = document.getElementById('root');
    const previousInert = root?.inert;
    const previousOverflow = document.body.style.overflow;
    const trigger = toggleRef.current;
    document.body.style.overflow = 'hidden';
    if (root) root.inert = true;
    drawerRef.current?.querySelector('button')?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setIsNavOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = [...drawerRef.current.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (root) root.inert = previousInert;
      trigger?.focus();
    };
  }, [isPhone, isNavOpen]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 575.98px)').matches) setIsNavOpen(false);
  }, [location.pathname]);
  
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
 
    const navigationLinks = <ul className="navbar-nav me-auto mb-2 mb-lg-0">
      <li className="nav-item"><Link className="nav-link active" aria-current="page" to="/" onClick={() => setIsNavOpen(false)}>Home</Link></li>
      <li className="nav-item"><Link className="nav-link" to="/about" onClick={() => setIsNavOpen(false)}>About</Link></li>
      <TVGenreDropdown />
      <GenreDropdownPortal />
    </ul>;

    return(
      <div>
         <nav className="navbar navbar-expand-lg bg-body-tertiary">
  <div className="container-fluid">
    <Link className="navbar-brand" to={"/"}>CineHub</Link>
    <button 
      className="navbar-toggler" 
      ref={toggleRef}
      type="button" 
      onClick={toggleNav}
      aria-controls={isPhone ? 'mobileNavigation' : 'navbarSupportedContent'}
      aria-expanded={isNavOpen} 
      aria-label="Toggle navigation"
      aria-haspopup={isPhone ? 'dialog' : undefined}
    >
      <span className="navbar-toggler-icon"></span>
    </button>
    <div className={`collapse navbar-collapse ${isNavOpen ? 'show' : ''}`} id="navbarSupportedContent">
      {!isPhone && navigationLinks}
      <form className="d-flex" role="search" onSubmit={handleSearchSubmit}>
        <input 
          className="form-control me-2" 
          type="search" 
          placeholder="Search movies, TV shows, people..." 
          aria-label="Search"
          onChange={updateText}
          value={inputValue}
        />
        <button className="btn btn-outline-dark" type="submit" aria-label="Search titles">
          <i className="fas fa-search"></i>
        </button>
      </form>
    </div>
  </div>
</nav>
        {isPhone && isNavOpen && createPortal(
          <div className="mobile-nav-overlay" onClick={event => {
            if (event.target === event.currentTarget) setIsNavOpen(false);
          }}>
            <aside className="mobile-nav-drawer" id="mobileNavigation" ref={drawerRef}
              role="dialog" aria-modal="true" aria-label="Navigation">
              <div className="mobile-nav-header">
                <span className="navbar-brand">CineHub</span>
                <button className="mobile-nav-close" type="button" aria-label="Close navigation" onClick={() => setIsNavOpen(false)}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <nav aria-label="Main navigation" onClick={event => {
                const link = event.target.closest('a[href]');
                if (link?.getAttribute('href')?.startsWith('/')) setIsNavOpen(false);
              }}>{navigationLinks}</nav>
            </aside>
          </div>, document.body)}
      </div>
    )
  } 
  export default Navbar;
