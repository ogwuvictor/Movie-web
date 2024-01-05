// import React, { useEffect, useState } from 'react'
// import { useParams } from 'react-router-dom';



// const MovieDetails = ({}) => {
//     const {id} = useParams()
//     const MovieDetailUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=8f666adc99ee1f6168974514ff6d951a`;
    
//     var [MovieDetails,setMovieDetails ] = useState({})
//     const posterpath = `https://image.tmdb.org/t/p/w500${MovieDetails.poster_path}`
//     const backDrop = `https://image.tmdb.org/t/p/original/${MovieDetails.backdrop_path}`

   
//     useEffect(()=>{
//         fetch(MovieDetailUrl)
//         .then(response=>response.json())
//         .then(data=>{
//             MovieDetails = data
//             setMovieDetails(MovieDetails)
          
//         })
//     })
//     return ( 
//         <div>
            
// <div
//   cla="bg-image"
//   style=
//    {{ backgroundImage: `url(${backDrop})`,
//     height: '100vh',
//         objectFit:'cover',

//         backgroundPosition: 'left calc((50w - 170px) - 340px) top',
//     backgroundSize: 'cover',
//     backdroundRepeat: 'no-repeat',
// }}
  
// ></div>

//             <div class="card mb-3" style={{maxwidth: "540px;"}}>
//   <div class="row g-0">
//     <div class="col-md-4">
//       <img src={posterpath} class="img-fluid rounded-start" alt="..."/>
//     </div>
//     <div class="col-md-8">
//       <div class="card-body">
//         <h5 class="card-title">{MovieDetails.title}</h5>
//         <p class="card-text">{MovieDetails.overview}</p>
//         <p class="card-text"><small class="text-body-secondary">Last updated 3 mins ago</small></p>
//       </div>
//     </div>
//   </div>
// </div>
//         </div>
//      );
// }
 
// export default MovieDetails;













import React, { useEffect, useState } from 'react';
import { json, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import MovieTrailers from './Trailers';

const MovieDetails = () => {
  const { id } = useParams();
  const movieDetailUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=8f666adc99ee1f6168974514ff6d951a`;
 
  const [movieDetails, setMovieDetails] = useState({});
  const [posterPath, setPosterPath] = useState('');
  const [backDrop, setBackDrop] = useState('');


  useEffect(() => {
    fetch(movieDetailUrl)
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        setMovieDetails(data);
        setPosterPath(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
        setBackDrop(`https://image.tmdb.org/t/p/original/${data.backdrop_path}`);
       

      });
  }, [movieDetailUrl]);

  const backdropStyle = {
    backgroundImage: `url(${backDrop})`,
    height: '100vh',
    backgroundSize: 'cover',
    opacity: 100, // Reduce opacity main(0.7)
    position: 'relative', // Position elements on top of the backdrop
   
    
  };

  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
     width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row', // Arrange poster and description horizontally
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  };

  const posterStyle = {
    flex: 1, // Make the poster occupy half of the overlay
    height:'100%',
    display: 'flex',
  };

  const descriptionStyle = {
     width: '50%', // You can adjust the width as needed
    color: 'white', // Text color for readability
     flex: 1, // Make the description occupy half of the overlay
    
  };

  return (
    <div >
      <div className="bg-image" style={backdropStyle} >
        <div className="overlay" style={overlayStyle}>
          <div style={posterStyle}>
            <img src={posterPath} className="img-fluid rounded-start" alt="Movie Poster" />
          </div>
          <div style={descriptionStyle}>
            <h5 className="card-title text-white">{movieDetails.title}</h5>
            <p className="card-text text-white">{movieDetails.overview}</p>

            {/* <MovieTrailers  id={id} /> */}
            <Link to={`/movietrailers/${id}`}>Go to Movie Trailers</Link>

            {/* <p> <Link to={`/movietrailers/${movie_id}`} className="btn btn-primary" style={{ display: 'block', textAlign: 'justify',  width: '90px' }}>
   
   Trailer</Link></p> */}
          </div>
        </div>
      </div>
     
    </div>
  );
};

export default MovieDetails;
