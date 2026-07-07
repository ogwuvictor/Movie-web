import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAllMovieVideos } from '../utils/movieTrailerService';

/**
 * MovieTrailers Component
 * 
 * Displays only the official trailer for a movie.
 * Features proper loading states, error handling, and responsive design.
 * 
 * @returns {JSX.Element} Enhanced trailer component
 */
const MovieTrailers = () => {
  // Extract id from URL parameters using React Router (matches App.js route)
  const { id } = useParams();
  const [movieDetails, setMovieDetails] = useState({});
  const [officialTrailer, setOfficialTrailer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Fetch videos when component mounts or movie ID changes
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch movie details with timeout
        const movieDetailUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=8f666adc99ee1f6168974514ff6d951a`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const detailsResponse = await fetch(movieDetailUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        const detailsData = await detailsResponse.json();
        setMovieDetails(detailsData);
        
        // Fetch all videos using the service
        const videosData = await fetchAllMovieVideos(id);
        
        if (videosData && videosData.results && videosData.results.length > 0) {
          const allVideos = videosData.results;
          
          // Find official trailer (type: "Trailer" AND official: true)
          const trailer = allVideos.find(video => 
            video.type === 'Trailer' && 
            video.official === true &&
            video.site === 'YouTube'
          );
          
          setOfficialTrailer(trailer || null);
        } else {
          setOfficialTrailer(null);
        }
      } catch (err) {
        const errorMessage = err.name === 'AbortError' 
          ? 'Request timeout - please check your internet connection' 
          : (err.message || 'Failed to load trailer');
        setError(errorMessage);
        console.error('❌ Trailer loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [id]);

  // Loading state with spinner
  if (loading) {
    return (
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <div className="section-header">
              <h2 className="section-title">Movie Trailer</h2>
            </div>
            
            <div className="loading-spinner">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading trailer...</span>
              </div>
              <p className="mt-2 text-white">Fetching movie trailer...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with user-friendly message
  if (error) {
    return (
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <div className="section-header">
              <h2 className="section-title">Movie Trailer</h2>
            </div>
            
            <div className="alert alert-warning" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
            <Link to={`/moviedetails/${id}`} className="btn btn-primary mt-3">
              Back to Movie Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          <Link to={`/moviedetails/${id}`} className="btn btn-outline-light mb-4">
            <i className="fas fa-arrow-left me-2"></i>
            Back to {movieDetails.title}
          </Link>

          <h2 className="section-title mb-4">{movieDetails.title} - Official Trailer</h2>

          {officialTrailer ? (
            <div className="trailer-container">
              <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '900px', margin: '0 auto', background: '#1a1a1a', borderRadius: '12px' }}>
                {/* Loading placeholder */}
                {!iframeLoaded && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1a1a1a',
                    borderRadius: '12px'
                  }}>
                    <div className="spinner-border text-white" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Loading video...</span>
                    </div>
                    <p className="mt-3 text-white">Loading trailer video...</p>
                  </div>
                )}
                <iframe
                  src={`https://www.youtube.com/embed/${officialTrailer.key}`}
                  title={officialTrailer.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    opacity: iframeLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onLoad={() => setIframeLoaded(true)}
                  loading="lazy"
                />
              </div>
              <p className="text-secondary mt-3 text-center">
                <i className="fas fa-calendar me-2"></i>
                Published: {new Date(officialTrailer.published_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-video fa-3x text-secondary mb-3"></i>
              <h4 className="text-white">No Official Trailer Available</h4>
              <p className="text-secondary">No official trailer found for this movie.</p>
              <Link to={`/moviedetails/${id}`} className="btn btn-primary mt-3">
                Back to Movie Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieTrailers;
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