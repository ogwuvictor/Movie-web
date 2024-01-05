import React from 'react';

const MovieFrame = ({ videoId }) => {
  // You can customize the width and height of the iframe as needed
  const iframeWidth ="100%"
  const iframeHeight = 515;


  return (
    <div>
    <iframe
      width={iframeWidth}
      height={iframeHeight}
    //   src={`https://www.youtube.com/watch?v=${videoId}`} 
    src={`https://www.youtube.com/embed/${videoId}`}
      title="Embedded Movie Trailer"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
    ></iframe>
    <div>
       
      
    </div>
    </div>
  );
};

export default MovieFrame;
