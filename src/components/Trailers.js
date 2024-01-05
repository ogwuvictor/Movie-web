import React, { useEffect, useState } from 'react';
import MovieFrame from './Movieframe';

const MovieTrailers = ({ id }) => {
  const url = 
   `https://api.themoviedb.org/3/movie/${id}/videos?api_key=8f666adc99ee1f6168974514ff6d951a`;
  const [result, setResult] = useState({});
  const [videoKey, setVideoKey] = useState('');

 useEffect(() => {
 fetch(url)
.then((response) => response.json())
.then((data) => {
  setResult(data);
  if (data.results.length >0) {
    setVideoKey(data.results[0].key);
    console.log('videoId:', data.results[0].key)
  }
})
.catch((error) => {
  console.error('Error fetching video data:', error);
});
}, [url]);

  return (
    <div>
      
      {videoKey && <MovieFrame videoId={videoKey} />}
     <div>
      <MovieFrame />
      </div>
    </div>
  );
};

export default MovieTrailers;




// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';

// const MovieTrailers = ({ apiKey }) => {
//   var { movie_id } = useParams();
//   const [trailers, setTrailers] = useState([]);

//   useEffect(() => {
//     const url = `https://api.themoviedb.org/3/movie/${movie_id}/videos?api_key=8f666adc99ee1f6168974514ff6d951a`;

//     fetch(url)
//       .then((response) => response.json())
//       .then((data) => {
//         const trailerResults = data.results;
//         setTrailers(trailerResults);

//       })
//       .catch((error) => {
//         console.error('Error fetching movie trailers:', error);
//       });
//   }, [apiKey, movie_id]);
  

//   return (
//     <div>
//       {trailers && trailers.length > 0 ? (
//         trailers.map((trailer) => (
//           <div key={trailer.key}>
//             <h2>{trailer.name}</h2>
//             <iframe
//               width="560"
//               height="315"
//               src={`https://www.youtube.com/embed/${trailer.key}`}
//               title={trailer.name}
//               allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
//             ></iframe>
//           </div>
//         ))
//       ) : (
//         <p>No trailers available.</p>
        
//       )}
//     </div>
//   );
// };

// export default MovieTrailers;







// import React, { useEffect, useState } from 'react'
// import { useParams } from 'react-router-dom';


// const MovieTrailers = ({ apiKey, movieId }) => {
//     const  {movie_id}  = useParams();
//     // var [result, setResult] = useState([])
//      const [trailers, setTrailers] = useState([]);
//     // const movieTrailerUrl = `https://api.themoviedb.org/3/movie/${movie_id}/videos?api_key=8f666adc99ee1f6168974514ff6d951a`

   

//     useEffect(()=> {
//         const url = `https://api.themoviedb.org/3/movie/${movie_id}/videos?api_key=8f666adc99ee1f6168974514ff6d951a`
//         fetch(url)
//         .then((response) => response.json())
//         .then((data) => {
//             // result=data.results
//             // setResult(result)
//             const trailerResults = data.videos.results;
//             setTrailers(trailerResults);

//         //    trailers.forEach((trailer) => {
//         //     console.log('Trailer Key:', movieTrailers.key);
//         //     console.log('Trailer Name:', movieTrailers.name);
//         //     console.log('Trailer Site:', movieTrailers.site);
//         // });
//         })
//         .catch((error) => {
//             console.error('Error fetching movie details:', error)
//         }, [apiKey, movieId] );
//     })

   
    

//     return ( 
//         <div>
//            {trailers.map((trailer) => (
//         <div key={trailer.key}>
//           <h2>{trailer.name}</h2>
//           <iframe
//             width="560"
//             height="315"
//             src={`https://www.youtube.com/embed/${trailer.key}`}
//             title={trailer.name}
//             allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
//           ></iframe>
//         </div>
//       ))}
//         </div>
//      );
// }
 
// export default MovieTrailers;