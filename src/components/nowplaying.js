import React, { useEffect, useState } from 'react'
import MovieCard from './Moviecard';
import Hero from './Hero';

const NowPlaying = ({title}) => {
    var [result, setResult] = useState([])
    useEffect(()=> {
        const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=8f666adc99ee1f6168974514ff6d951a`
        fetch(url)
        .then((response) => response.json())
       .then((data) => {
        result=data.results
        setResult(result)
       } );
    });
   const htmlResults = result.map((obj,i)=>{
        return <MovieCard movie={obj} key={i} />
   })


    return ( 
        <div> 
            <Hero title="Now_playing" />   
            {htmlResults}
        </div>
     );
}
 
export default NowPlaying;