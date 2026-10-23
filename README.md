# CineHub - Movie & TV Streaming Platform

For the prepared Cloudflare Worker + D1 deployment path, read [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md). Account/database/Access configuration and live acceptance tests are still required before launch. Uploading the React build alone does not deploy the admin backend.

A modern React-based web application for discovering movies and TV shows with comprehensive streaming information, trailers, and provider links.

## Overview

CineHub is a full-stack movie discovery platform featuring:
- **Frontend**: React 18 with React Router for SPA navigation
- **Backend**: PHP/MySQL API for analytics and public domain movie management
- **Data Source**: TMDB (The Movie Database) API for movie/TV metadata
- **Features**: Movie details, trailers, watch providers, genre browsing, and search

## Features

### Movie Discovery
- **Trending Movies**: Discover what's popular right now
- **Now Playing**: Movies currently in theaters
- **Popular Movies**: All-time favorites
- **Top Rated**: Critically acclaimed films
- **Upcoming**: Coming soon to theaters

### TV Shows
- **Popular TV Shows**: Trending television series
- **Airing Today**: Shows airing today
- **On The Air**: Currently airing series
- **Top Rated TV**: Highest-rated TV shows

### Genre & Regional Content
- **Anime**: Popular anime movies and TV series
- **Dramas**: Turkish, Korean (K-Drama), Chinese (C-Drama), South African (SA-Drama)
- **Genres**: Action, Adventure, Horror, Teen Romance
- **Regional**: Nollywood movies and more

### Movie Details
- Comprehensive movie information (plot, cast, crew, ratings)
- High-quality poster and backdrop images
- Similar movie recommendations
- Watch provider information with streaming links
- YouTube trailer integration
- Public domain movie detection and download links

### Search & Navigation
- Full-text search across movies and TV shows
- Genre-based browsing with dropdown selector
- Responsive navigation with search functionality
- Provider redirect system for streaming services

## Tech Stack

### Frontend
- **React 18.2.0**: UI framework
- **React Router DOM 6.16.0**: Client-side routing
- **React YouTube 10.1.0**: YouTube trailer integration
- **React Text Truncate 0.19.0**: Text truncation for UI
- **Create React App 5.0.1**: Build tooling

### Backend
- **PHP 7.4+**: Server-side logic
- **MySQL/MariaDB**: Database for analytics and public domain movies
- **RESTful API**: JSON-based API endpoints

### External APIs
- **TMDB API**: Movie and TV show metadata
- **YouTube API**: Trailer video embedding

## Project Structure

```
movie-web/
├── backend/                 # PHP backend with MySQL
│   ├── admin/              # Admin panel for analytics
│   ├── api/                # REST API endpoints
│   ├── config.php          # Database configuration
│   ├── database.sql        # Database schema
│   └── README.md           # Backend documentation
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── Home.js         # Main landing page
│   │   ├── Moviedetails.js # Movie details page
│   │   ├── TVShowDetails.js # TV show details
│   │   ├── Trailers.js     # Movie trailers
│   │   ├── TVShowTrailers.js # TV show trailers
│   │   ├── search.js      # Search functionality
│   │   ├── Navbar.js      # Navigation bar
│   │   └── [Genre components] # Various genre-specific components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── App.js              # Main app component with routing
│   └── index.js            # App entry point
├── package.json            # Frontend dependencies
└── README.md              # This file
```

## Installation

### Prerequisites
- Node.js 14+ and npm
- PHP 7.4+ (for backend)
- MySQL/MariaDB (for backend)

### Frontend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd movie-web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Backend Setup (Optional)

The backend provides analytics and public domain movie management. See [backend/README.md](backend/README.md) for detailed setup instructions.

1. Create the database:
```bash
mysql -u root -p < backend/database.sql
```

2. Configure database connection in `backend/config.php`

3. Start PHP server:
```bash
cd backend
php -S localhost:8000
```

4. Access admin panel at [http://localhost:8000/admin/](http://localhost:8000/admin/)
   - Default credentials: admin / admin123

## Available Scripts

### `npm start`
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it.

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.

### `npm run eject`
**One-way operation.** Ejects from Create React App for custom configuration.

## Key Components

### Home Page (`src/components/Home.js`)
Main landing page displaying:
- Hero section
- Genre selector dropdown
- Multiple movie/TV categories (Trending, Popular, Top Rated, etc.)
- Regional content sections (Anime, Dramas, Nollywood)

### Movie Details (`src/components/Moviedetails.js`)
Detailed movie information including:
- Movie metadata from TMDB
- Watch providers with streaming links
- Similar and recommended movies
- Public domain detection
- Trailer integration

### TV Show Details (`src/components/TVShowDetails.js`)
TV show information with:
- Series metadata and seasons
- Episode information
- Watch providers
- Similar shows

### Search (`src/components/search.js`)
Search functionality for:
- Movies and TV shows
- Real-time search results
- Genre filtering

## API Integration

### TMDB API
The application uses the TMDB API for:
- Movie and TV show metadata
- Poster and backdrop images
- Genre information
- Similar/recommendation data

### Backend API
Optional PHP backend provides:
- Analytics tracking (page views, provider clicks, search)
- Public domain movie database
- Admin panel for management
- Performance monitoring

## Environment Variables

No environment variables are required for basic functionality. The TMDB API key is currently hardcoded in components. For production:

1. Create a `.env` file in the root directory
2. Add your TMDB API key:
```
REACT_APP_TMDB_API_KEY=your_api_key_here
```
3. Update components to use `process.env.REACT_APP_TMDB_API_KEY`

## Deployment

### Frontend Deployment

1. Build the production bundle:
```bash
npm run build
```

2. Deploy the `build` folder to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

### Backend Deployment

Deploy the `backend` folder to:
- PHP hosting (cPanel, shared hosting)
- VPS with PHP/MySQL
- Cloud platforms (AWS, DigitalOcean, etc.)

See [backend/README.md](backend/README.md) for backend deployment details.

## Features in Detail

### Watch Provider Integration
- Displays streaming availability across multiple platforms
- Provider redirect system for seamless navigation
- Support for Netflix, Amazon Prime, Disney+, Hulu, and more

### Trailer System
- YouTube trailer integration using react-youtube
- Movie trailers page with multiple trailer options
- TV show trailers for series

### Genre-Based Browsing
- Dynamic genre selector dropdown
- Genre-specific movie collections
- Support for all major genres

### Regional Content
- Specialized sections for international content
- Turkish, Korean, Chinese, South African dramas
- Nollywood (Nigerian) movies
- Anime movies and TV series

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV show data is provided by TMDB.

## Support

For issues related to:
- **Frontend**: Check React documentation and component code
- **Backend**: See [backend/README.md](backend/README.md)
- **TMDB API**: Visit [https://developers.themoviedb.org/](https://developers.themoviedb.org/)

## Future Enhancements

- [ ] User authentication and favorites
- [ ] Watchlist functionality
- [ ] Reviews and ratings
- [ ] Advanced filtering options
- [ ] Dark/Light theme toggle
- [ ] Progressive Web App (PWA) support
- [ ] Offline capability
- [ ] Multi-language support
