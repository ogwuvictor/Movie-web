import React from 'react';

/**
 * MovieFrame Component
 * 
 * Renders a responsive YouTube video iframe for movie trailers.
 * Uses Bootstrap's ratio classes for proper 16:9 aspect ratio.
 * 
 * @param {object} props - Component props
 * @param {string} props.videoId - YouTube video ID to embed
 * @returns {JSX.Element} YouTube iframe component
 */
const MovieFrame = ({ videoId }) => {
  // Render responsive YouTube iframe with proper attributes
  return (
    <div className="ratio ratio-16x9">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}  // YouTube embed URL
        title="Embedded Movie Trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"  // Required for YouTube embeds
        allowFullScreen  // Allow fullscreen viewing
        frameBorder="0"  // Remove border for cleaner look
      ></iframe>
    </div>
  );
};

export default MovieFrame;



