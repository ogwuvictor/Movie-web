import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom'
import GenreDropdownPortal from './GenreDropdownPortal';
import TVGenreDropdown from './TVGenreDropdown';
import './NavbarSearch.css';

function Navbar(){
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 575.98px)').matches);
  const drawerRef = useRef(null);
  const toggleRef = useRef(null);
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
    setIsNavOpen(false);
  }, [location.pathname]);
  
 const toggleNav = () => {
   setIsNavOpen(!isNavOpen);
 }
 
    const navigationLinks = <ul className="navbar-nav me-auto mb-2 mb-lg-0">
      <li className="nav-item"><Link className="nav-link active" aria-current="page" to="/" onClick={() => setIsNavOpen(false)}>Home</Link></li>
      <li className="nav-item"><Link className="nav-link" to="/about" onClick={() => setIsNavOpen(false)}>About</Link></li>
      <li className="nav-item"><Link className="nav-link" to="/profile" onClick={() => setIsNavOpen(false)}>Profile</Link></li>
      <TVGenreDropdown />
      <GenreDropdownPortal />
    </ul>;

    return(
      <div>
         <nav className={`navbar navbar-expand-lg bg-body-tertiary ${location.pathname === '/search' ? 'navbar-on-search' : ''}`}>
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
      {location.pathname !== '/search' && <Link className="navbar-search-launcher" to="/search" aria-label="Search movies and TV shows">
        <span>Search movies, TV shows...</span>
        <i className="fas fa-search" aria-hidden="true"></i>
      </Link>}
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
