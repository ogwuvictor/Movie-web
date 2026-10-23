import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './GenreSelector.css';

const GenreSelector = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const drag = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchGenres = async () => {
      try {
        const apiUrl = 'https://api.themoviedb.org/3/genre/movie/list?language=en&api_key=8f666adc99ee1f6168974514ff6d951a';
        const response = await fetch(apiUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!controller.signal.aborted) setGenres(data.genres || []);
      } catch (error) {
        if (error.name !== 'AbortError') console.error('Error fetching genres:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchGenres();
    return () => controller.abort();
  }, []);

  const startDrag = event => {
    drag.current = null;
    // Touch scrolling stays native so vertical page gestures still work.
    if (event.pointerType === 'touch' || event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX,
      scroll: event.currentTarget.scrollLeft, moved: false };
  };
  const moveDrag = event => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId || event.buttons !== 1) return;
    const delta = event.clientX - current.x;
    if (!current.moved && Math.abs(delta) < 6) return;
    current.moved = true;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.scrollLeft = current.scroll - delta;
  };
  const endDrag = event => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.current) drag.current.id = null;
  };

  if (loading) return <p className="text-secondary" role="status">Loading genres...</p>;
  if (!genres.length) return <p className="text-secondary" role="status">No genres available</p>;

  return <nav className="genre-strip" aria-label="Movie genres">
    <div className="genre-chips" onPointerDown={startDrag} onPointerMove={moveDrag}
      onPointerUp={endDrag} onPointerCancel={endDrag} onDragStart={event => event.preventDefault()}
      onClickCapture={event => {
        if (event.detail > 0 && drag.current?.moved) {
          event.preventDefault();
          event.stopPropagation();
          drag.current = null;
        }
      }}>
      {genres.map(genre => <Link key={genre.id} className="genre-chip" to={`/genre/${genre.id}`} draggable="false">
        {genre.name}
      </Link>)}
    </div>
  </nav>;
};

export default GenreSelector;
