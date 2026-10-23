<?php
// PHP development server only. Never serve configuration, SQL, library or data files.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$allowed = ['/', '/index.php', '/admin', '/admin/', '/admin/index.php', '/admin/login.php', '/admin/logout.php', '/admin/change_password.php', '/admin/streaming.php', '/admin/streaming.js', '/api/movies.php', '/api/check.php', '/api/analytics.php', '/api/performance.php', '/api/streaming-availability.php'];
if (!in_array($path, $allowed, true) || preg_match('/[\x00-\x1f\\\\]/', $path)) { http_response_code(404); header('X-Content-Type-Options: nosniff'); exit; }
header('X-Content-Type-Options: nosniff');
return false;
