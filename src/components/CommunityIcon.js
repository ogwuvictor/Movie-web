import React from 'react';

const paths = {
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  film: 'M4 3h16v18H4V3Zm0 5h16M4 16h16M8 3v18M16 3v18',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  logout: 'M9 4H4v16h5m5-4 4-4-4-4m-5 4h11',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  check: 'm5 12 4 4L19 6',
  lock: 'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4',
};
export default function CommunityIcon({ name, filled = false, ...props }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name] || paths.film} /></svg>;
}
