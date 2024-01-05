import React, { useEffect, useState } from 'react'
import MovieCard from './Moviecard';
import Hero from './Hero';

const UpComing = ({title}) => {
    var [result, setResult] = useState([])
    useEffect(()=> {
        const url = `https://api.themoviedb.org/3/movie/upcoming?api_key=8f666adc99ee1f6168974514ff6d951a`
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
          <Hero title="Up Coming"  />
             {htmlResults}
        </div>
     );
}
 
export default UpComing;