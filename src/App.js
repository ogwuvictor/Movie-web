import { useState } from 'react';

import './App.css';
import Home from './components/Home';
import Navbar from './components/Navbar'
// import Hero from './components/Hero'
import About from './components/About'
import {
  Routes,
  Route,
  Link,
} from 'react-router-dom'
import Search from './components/search';
import MovieDetails from './components/Moviedetails';
import MovieTrailers from './components/Trailers';


function App() {
  const [searchText, setSearchText] = useState('')
  const [searchResult, setSearchResult] = useState ([])

  return (
   <div>
  <Navbar searchText={searchText} setSearchText={setSearchText}/>
  <Routes>
<Route path='/' Component={Home} />
<Route path='/about' Component={About} />
<Route path='/search' element={<Search keyword={searchText} />} />
<Route path='/moviedetails/:id' Component={MovieDetails} /> 
<Route path='/movietrailers/:id' Component={MovieTrailers} />
{/* <Route path="/movietrailers/:movie_id" component={MovieTrailers} /> */}
  </Routes>
   
   </div>
  );
}



export default App;
