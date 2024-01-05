import React from 'react'
import Hero from './Hero';
import PopularMovie from './popularmovie';
import NowPlaying from './nowplaying';
import TopRated from './Toprated';
import UpComing from './Upcoming';

const Home = ({title}) => {
    return ( 
        <div >
            <Hero title="Home"/>
            <h1>PopularMovies</h1>
            <PopularMovie />
            {/* <h1 style={{ paddingTop: '20px' }}>Now_Playing</h1> */}
            <NowPlaying />
            {/* <h1 style={{ paddingTop: '20px' }}>Top Rated</h1> */}
            <TopRated />
            {/* <h1 style={{ paddingTop: '20px' }}>Up Coming</h1> */}
            <UpComing />
        </div>

     );
}
 
export default Home;