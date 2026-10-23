import { safeExternalUrl } from './safeExternalUrl';
const configured = process.env.REACT_APP_API_BASE_URL;
// Production uses the site's API reverse proxy unless an HTTPS API is configured.
export const API_BASE_URL = (configured && safeExternalUrl(configured) ? configured : process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api').replace(/\/$/, '');
