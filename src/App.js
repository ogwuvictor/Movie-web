import { useState } from 'react';

import './App.css';
import Home from './components/Home';
import Navbar from './components/Navbar'
// import Hero from './components/Hero'
import About from './components/About'
import GenreMovies from './components/GenreMoviesFinal';
import TVShows from './components/TVShows';
import TVShowDetails from './components/TVShowDetails';
import TVShowTrailers from './components/TVShowTrailers';
import {
  Routes,
  Route,
  Link,
} from 'react-router-dom'
import Search from './components/search';
import MovieDetails from './components/Moviedetails';
import MovieTrailers from './components/Trailers';
import ProviderRedirect from './components/ProviderRedirect';
import './Mobile.css';


function App() {
  const [searchText, setSearchText] = useState('')
  const [searchResult, setSearchResult] = useState ([])

  return (
   <div>
  <Navbar searchText={searchText} setSearchText={setSearchText}/>
  <Routes>
<Route path='/' Component={Home} />
<Route path='/about' Component={About} />
<Route path='/genre/:genreId' Component={GenreMovies} />
<Route path='/tv/genre/:genreId' Component={TVShows} />
<Route path='/tv/:id' Component={TVShowDetails} />
<Route path='/tvtrailers/:id' Component={TVShowTrailers} />
<Route path='/search' element={<Search keyword={searchText} />} />
<Route path='/moviedetails/:id' Component={MovieDetails} /> 
<Route path='/movietrailers/:id' Component={MovieTrailers} />
{/* Provider Redirect Routes */}
<Route path='/out/:provider' Component={ProviderRedirect} />
{/* <Route path="/movietrailers/:movie_id" component={MovieTrailers} /> */}
  </Routes>
   
   </div>
  );
}



export default App;
