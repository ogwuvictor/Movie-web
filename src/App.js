import { lazy, Suspense, useEffect, useRef } from 'react';
import { trackPageView } from './utils/analyticsService';

import './App.css';
import Navbar from './components/Navbar'
import About from './components/About'
import {
  useLocation,
  Routes,
  Route,
} from 'react-router-dom'
import ProviderRedirect from './components/ProviderRedirect';
import './Mobile.css';
import useRouteScrollRestoration from './hooks/useRouteScrollRestoration';
import useVisitorActivity from './hooks/useVisitorActivity';

const Home = lazy(() => import('./components/Home'));
const Account = lazy(() => import('./components/Account'));
const Signup = lazy(() => import('./components/VisitorLogin').then(m => ({ default: m.Signup })));
const GenreMovies = lazy(() => import('./components/GenreMoviesFinal'));
const TVShows = lazy(() => import('./components/TVShows'));
const TVShowDetails = lazy(() => import('./components/TVShowDetails'));
const TVShowTrailers = lazy(() => import('./components/TVShowTrailers'));
const Search = lazy(() => import('./components/search'));
const MovieDetails = lazy(() => import('./components/Moviedetails'));
const MovieTrailers = lazy(() => import('./components/Trailers'));

const PageFallback = () => (
  <div className="container py-5 text-center">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function App() {
  useRouteScrollRestoration();
  useVisitorActivity();
  const location = useLocation();
  const recordedNavigation = useRef(null);
  useEffect(() => {
    if (recordedNavigation.current === location.key) return;
    recordedNavigation.current = location.key;
    const path = location.pathname;
    const detail = path.match(/^\/(moviedetails|tv|movietrailers|tvtrailers)\/(\d+)$/);
    const page_type = detail ? detail[1].includes('trailer') ? 'trailer' : detail[1] === 'tv' ? 'tv' : 'movie'
      : path === '/search' ? 'search' : path === '/about' ? 'about' : path.startsWith('/tv/') ? 'tv' : path.startsWith('/genre/') ? 'genre' : path === '/' ? 'home' : null;
    if (page_type) trackPageView({ page_type, content_id: detail ? Number(detail[2]) : null, content_type: detail ? detail[1].startsWith('tv') ? 'tv' : 'movie' : null });
  }, [location.key, location.pathname]);

  return (
   <div>
  <Navbar/>
  <Suspense fallback={<PageFallback />}>
  <Routes>
<Route path='/' Component={Home} />
<Route path='/about' Component={About} />
<Route path='/account' Component={Account} />
<Route path='/profile' Component={Account} />
<Route path='/signup' Component={Signup} />
<Route path='/genre/:genreId' Component={GenreMovies} />
<Route path='/tv/genre/:genreId' Component={TVShows} />
<Route path='/tv/:id' Component={TVShowDetails} />
<Route path='/tvtrailers/:id' Component={TVShowTrailers} />
<Route path='/search' element={<Search />} />
<Route path='/moviedetails/:id' Component={MovieDetails} /> 
<Route path='/movietrailers/:id' Component={MovieTrailers} />
{/* Provider Redirect Routes */}
<Route path='/out/:provider' Component={ProviderRedirect} />
  </Routes>
  </Suspense>
   </div>
  );
}



export default App;
