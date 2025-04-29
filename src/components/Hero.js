import React from 'react'


const Hero = ({title}) => {
    return ( 
        <div>
              <header className='bg-dark text-white p-5'>
            <h1>{title}</h1>
            </header>
        </div>
     );
}
 
export default Hero;

