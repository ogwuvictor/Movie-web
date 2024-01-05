import React from 'react'
//import MovieDetails from './Moviedetails';
import { Link } from 'react-router-dom';

const MovieCard = ({movie}) => {
    const posterpath = `https://image.tmdb.org/t/p/w500${movie.poster_path}`

    // Function to truncate text to a specific number of lines with an ellipsis
    const truncateText = (text, maxLines) => {
        const lines = text.split('\n'); // Split text into lines
        if (lines.length <= maxLines) {
          return text;
        }
        return lines.slice(0, maxLines).join('\n') + '...'; // Truncate and add ellipsis
      };
    



    return ( 
        <div className='col-md-3 my-5' style={{display:'inline-block'}}>
            <div className="card" >
  <img src={posterpath} className="card-img-top" alt={movie.title}/>
  <div className="card-body" style={{maxHeight:'10ev'}}>
    <h5 className="card-title">{movie.title}</h5>
    <p className="card-text" style={{maxHeight:'20vh', overflow: 'hidden'}}>
    {truncateText(movie.overview, 4)} {/* Truncate to 4 lines */}

        {movie.overview}
    </p>
    <Link to={`/moviedetails/${movie.id}`} className="btn btn-primary">
   
       
        Movie Details</Link>
  </div>
</div>
        </div>
     );
}
 
export default MovieCard;
