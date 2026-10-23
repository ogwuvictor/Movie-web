# CineHub Backend - Movie Streaming Platform

Security configuration, hosting requirements and remaining risks are documented in [SECURITY.md](../SECURITY.md). Use the router-based startup command below; do not expose a bare PHP development server.

## Local dashboard and streaming catalog

From the project root in PowerShell, run `./scripts/start-backend.ps1`, then open **http://127.0.0.1:8000/admin/** and use your existing admin credentials. This starts a loopback-only PHP development server with a writable temporary session directory. The configured MySQL database must already be running.

The **Streaming Availability** dashboard link opens `/admin/streaming.php`. You can add, edit, refresh, or remove a TMDB movie's manual provider confirmations, choose available/unavailable, and set expiry. Available records require an explicit confirmation checkbox; the editor does not automatically verify remote video playback.

Records update the shared `public/streaming-availability.json` file and are served live by `GET /api/streaming-availability.php`. POST and DELETE require an authenticated admin session and a CSRF token. The web-server account needs write permission to that catalog's directory and `backend/data` for the write lock. No schema migration is required for this editor.

**The Watch Now visibility restriction was undone.** This catalog editor does not hide Watch Now or filter its server list. The React availability reader is available for future use and defaults to the backend API; `REACT_APP_BACKEND_URL` or `REACT_APP_STREAM_AVAILABILITY_URL` can override its location without exposing private credentials.

To verify the editor locally, run `php scripts/verify-admin-catalog.php` from the project root. It creates a temporary QA admin and synthetic catalog record, tests real login/editing plus authorization and CSRF, then removes the test data. It does not change your existing admin account.

## Overview

PHP-based backend with MySQL database for managing public domain movies, analytics, and optimization features. Includes comprehensive admin panel and RESTful API.

## Features

### Core Functionality
- Public domain movies database
- Admin authentication system
- CRUD operations for movies
- Public domain status checking API

### Analytics & Insights
- Page view tracking with device/geographic data
- Video playback metrics (buffering, errors, completion)
- Provider click tracking
- Search query analytics
- User engagement tracking (likes, shares, etc.)
- Real-time analytics dashboard

### Performance Monitoring
- API response time tracking
- System resource monitoring (CPU, memory, disk, network)
- Cache performance metrics
- Error logging with stack traces

### Optimization Tools
- Feature flag management
- A/B testing framework
- Cache metrics tracking
- Real-time feature toggling

## Admin Panel

The admin panel provides a comprehensive web interface for managing the platform.

### Sections

- **Movies Tab**: Add, edit, delete public domain movies
  - View all movies with TMDB ID, title, year, source, download URL
  - Add new movies via modal form
  - Edit existing movies
  - Delete movies with confirmation
  - Direct links to TMDB and download URLs

- **Analytics Tab**: Real-time analytics dashboard
  - Total page views (all-time and today)
  - Total provider clicks
  - Total search queries
  - Total user engagement actions
  - Top content by views
  - Page views by page type
  - Provider clicks by provider
  - Geographic distribution

- **Performance Tab**: System performance monitoring
  - API response times (last hour)
  - Request counts and error rates
  - Cache hit rates
  - Cache metrics by key and type

- **Optimization Tab**: Feature flag management
  - Enable/disable features
  - Set rollout percentages
  - View feature descriptions
  - Real-time toggle functionality

### Default Feature Flags

- **dark_mode**: Enabled (100%) - Dark mode theme
- **new_ui_design**: Disabled (0%) - New UI design variant
- **enhanced_search**: Enabled (50%) - Enhanced search with filters
- **lazy_loading**: Enabled (100%) - Lazy load images for performance

## Integration with React Frontend

### 1. Install Analytics Service

The analytics service is located at `src/utils/analyticsService.js`. Import it in your components:

```javascript
import { 
  trackPageView, 
  trackProviderClick, 
  trackSearch, 
  trackEngagement,
  trackPlayback 
} from '../utils/analyticsService';
```

### 2. Track Page Views

In your page components (Home, MovieDetails, TVShowDetails, etc.):

```javascript
useEffect(() => {
  trackPageView({
    page_type: 'movie', // or 'home', 'tv', 'search', 'trailer'
    content_id: id,
    content_type: 'movie'
  });
}, [id]);
```

### 3. Track Provider Clicks

When users click provider links:

```javascript
const handleProviderClick = (provider, url) => {
  trackProviderClick({
    content_id: movieDetails.id,
    content_type: 'movie',
    content_title: movieDetails.title,
    provider: provider,
    provider_url: url
  });
  
  window.open(url, '_blank');
};
```

### 4. Track Search

When users perform searches:

```javascript
const handleSearch = async (query) => {
  const results = await searchMovies(query);
  
  trackSearch({
    search_query: query,
    results_count: results.length
  });
  
  setResults(results);
};
```

### 5. Track Engagement

Track user interactions:

```javascript
const handleLike = () => {
  trackEngagement({
    content_id: movieDetails.id,
    content_type: 'movie',
    action_type: 'like'
  });
};
```

### 6. Track Video Playback

For trailer/video playback:

```javascript
const handlePlaybackEnd = (duration, buffered, errors) => {
  trackPlayback({
    content_id: movieDetails.id,
    content_type: 'movie',
    content_title: movieDetails.title,
    playback_duration: duration,
    buffer_count: buffered,
    playback_errors: errors,
    completion_percentage: 100
  });
};
```

### 7. Track API Performance

Wrap your API calls:

```javascript
const startTime = performance.now();
const response = await fetch(url);
const endTime = performance.now();

trackApiPerformance({
  endpoint: '/api/movies/123',
  method: 'GET',
  response_time_ms: endTime - startTime,
  status_code: response.status,
  cache_hit: fromCache
});
```

## Security Recommendations

### 1. Change Default Password

```sql
UPDATE admin_users 
SET password = '$2y$10$NEW_HASHED_PASSWORD' 
WHERE username = 'admin';
```

Generate new password hash:
```php
<?php
echo password_hash('your_new_password', PASSWORD_DEFAULT);
?>
```

### 2. Enable HTTPS

Use SSL/TLS for all connections in production.

### 3. Add IP Whitelist

Restrict admin panel access to specific IPs.

### 4. Use Environment Variables

Store credentials in environment variables instead of config.php.

```php
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
```

### 5. Implement Rate Limiting

Add rate limiting to API endpoints to prevent abuse.

## Maintenance

### Backup Database

```bash
mysqldump -u root -p cinehub_db > backup.sql
```

### Restore Database

```bash
mysql -u root -p cinehub_db < backup.sql
```

### Update Admin Password

```php
<?php
require_once 'config.php';
$newPassword = password_hash('new_password', PASSWORD_DEFAULT);
$stmt = $pdo->prepare("UPDATE admin_users SET password = ? WHERE username = 'admin'");
$stmt->execute([$newPassword]);
echo "Password updated successfully";
?>
```

### Clear Old Analytics Data

```sql
-- Delete analytics older than 90 days
DELETE FROM analytics_page_views WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM analytics_playback WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM analytics_provider_clicks WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM analytics_search WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM analytics_engagement WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## Troubleshooting

### Database Connection Failed

- Check MySQL/MariaDB is running
- Verify credentials in config.php
- Ensure database exists: `CREATE DATABASE cinehub_db;`

### API Returns 404

- Check PHP server is running
- Verify URL is correct
- Check file permissions

### Admin Panel Not Loading

- Clear browser cache
- Check session is working
- Verify PHP session configuration

### CORS Errors

- Ensure CORS headers are set in API files
- Check if React app is on different port/domain

## Performance Optimization

### 1. Add Database Indexes

Already included in schema:
- INDEX on tmdb_id
- INDEX on year
- INDEX on created_at
- INDEX on content_id
- INDEX on page_type
- INDEX on country_code

### 2. Enable Query Caching

In config.php:
```php
$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
```

### 3. Use CDN for Static Assets

Already using CDN for Bootstrap and Font Awesome.

## Future Enhancements

- [ ] Add user roles and permissions
- [ ] Implement audit logging
- [ ] Add bulk import/export (CSV)
- [ ] Add movie image upload
- [ ] Implement rate limiting
- [ ] Add API authentication (JWT)
- [ ] Create public API documentation
- [ ] Add automated backups
- [ ] Implement caching (Redis)
- [ ] Add search functionality
- [ ] Real-time analytics with WebSockets
- [ ] Email notifications for errors
- [ ] Geographic heatmaps
- [ ] User session tracking
- [ ] Conversion funnel analysis

## Database Schema

The database includes comprehensive tables for:

### Core Tables
- **public_domain_movies** - Public domain movie database
- **admin_users** - Admin user management

### Analytics Tables
- **analytics_page_views** - Track all page visits with device/geographic data
- **analytics_playback** - Video playback metrics (buffering, errors, completion)
- **analytics_provider_clicks** - Track outbound provider link clicks
- **analytics_search** - Search query tracking
- **analytics_engagement** - User engagement actions (likes, shares, etc.)

### Performance Tables
- **performance_api_metrics** - API response times and error tracking
- **performance_system_metrics** - System resource monitoring (CPU, memory, disk, network)

### Optimization Tables
- **optimization_ab_tests** - A/B test results
- **optimization_feature_flags** - Feature flag management
- **optimization_cache_metrics** - Cache performance tracking

### Error Logging
- **error_logs** - Centralized error logging with stack traces

## API Endpoints

### Public Domain Movies

**Check if Movie is Public Domain**
- `GET /api/check.php?tmdb_id={tmdb_id}`

**CRUD Operations**
- `GET /api/movies.php` - Get all movies
- `GET /api/movies.php?id={id}` - Get movie by ID
- `GET /api/movies.php?tmdb_id={tmdb_id}` - Get movie by TMDB ID
- `POST /api/movies.php` - Add new movie
- `PUT /api/movies.php?id={id}` - Update movie
- `DELETE /api/movies.php?id={id}` - Delete movie

### Analytics Tracking

**Track Analytics Event**
- `POST /api/analytics.php` - Track page views, playback, clicks, search, engagement

**Get Analytics Data**
- `GET /api/analytics.php?dashboard=true` - Get all analytics summary
- `GET /api/analytics.php?type=page_views` - Get page view stats
- `GET /api/analytics.php?type=provider_clicks` - Get provider click stats
- `GET /api/analytics.php?type=search` - Get search stats
- `GET /api/analytics.php?type=engagement` - Get engagement stats

### Performance & Optimization

**Track Performance**
- `POST /api/performance.php?type=api_metric` - Track API response time
- `POST /api/performance.php?type=system_metric` - Track system metrics
- `POST /api/performance.php?type=cache_metric` - Track cache performance
- `POST /api/performance.php?type=ab_test` - Record A/B test results

**Get Performance Data**
- `GET /api/performance.php?type=api_metrics` - Get API performance stats
- `GET /api/performance.php?type=system_metrics` - Get system metrics
- `GET /api/performance.php?type=feature_flags` - Get feature flags
- `GET /api/performance.php?type=cache_metrics` - Get cache metrics
- `GET /api/performance.php?type=dashboard` - Get all performance data

**Update Feature Flag**
- `PUT /api/performance.php?type=feature_flags` - Enable/disable feature

## Support

For issues or questions:
1. Check this README
2. Review error logs
3. Test API endpoints directly
4. Verify database connection

## Directory Structure

```
backend/
├── config.php              # Database configuration
├── database.sql            # Complete database schema with analytics
├── .htaccess               # Apache configuration
├── index.php               # Redirect to admin panel
├── api/
│   ├── movies.php          # CRUD API for movies
│   ├── check.php           # Check if movie is public domain
│   ├── analytics.php       # Analytics tracking API
│   └── performance.php      # Performance & optimization API
└── admin/
    ├── index.php           # Admin panel with dashboards
    ├── login.php           # Login page
    └── logout.php          # Logout page
```

## Setup Instructions

### 1. Install Requirements

- PHP 7.4 or higher
- MySQL or MariaDB
- Web server (Apache, Nginx, or PHP built-in server)

### 2. Create Database

```bash
# Option 1: Using MySQL command line
mysql -u root -p < database.sql

# Option 2: Using phpMyAdmin
# Import the database.sql file
```

### 3. Configure Database

Set server environment variables (do not commit credentials):

```text
CINEHUB_DB_HOST=localhost
CINEHUB_DB_NAME=cinehub_db
CINEHUB_DB_USER=your_dedicated_database_user
CINEHUB_DB_PASS=<set securely in the server environment>
```

### 4. Start PHP Server

```bash
# From the backend directory
powershell -File ../scripts/start-backend.ps1
```

Or configure your web server to point to the backend directory.

### 5. Access Admin Panel

- URL: `http://localhost:8000/admin/`
- Use your existing administrator credentials. This security update does not reset them.

**⚠️ IMPORTANT: Change the default password in production!**

### 6. Update React API URL

The shared `src/utils/apiConfig.js` uses `/api` in production and the loopback backend in development. Set `REACT_APP_API_BASE_URL` to an HTTPS API origin/path only when using a separate backend. Do not put private credentials in frontend environment variables.
