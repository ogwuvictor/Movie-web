import React, { useEffect, useState } from 'react'
import Hero from './Hero';
import MovieCard from './Moviecard';

const Search = ({keyword}) => {
const value = `You are searching for ${keyword}`
const keywordUrl = 
`https://api.themoviedb.org/3/search/movie?api_key=8f666adc99ee1f6168974514ff6d951a&query=${keyword}`
var [keywordResults, setKeywordResults] = useState([])

useEffect(()=>{
    fetch(keywordUrl)
    .then(response=>response.json())
    .then(data=>{
       keywordResults =data.results
       setKeywordResults(keywordResults)
    })
})

const htmlResults = keywordResults.map((obj, i)=>{
    return  <MovieCard movie={obj} key={i} />
})
    return ( 
        <div>
            <Hero title={value}/> 
            {htmlResults}
               
        </div>
     );
}
 
export default Search;