<?php
if (PHP_SAPI !== 'cli') {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    set_exception_handler(function ($error) {
        error_log('Unhandled backend failure: ' . $error->getMessage());
        securityJson(['error' => 'Service unavailable. Try again later.'], 503);
    });
}
function securityIsHttps() {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || getenv('CINEHUB_HTTPS') === '1';
}
function securityIsLocal() {
    if (PHP_SAPI === 'cli') return true;
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    return in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) && in_array($host, ['localhost', '127.0.0.1', '[::1]'], true);
}
function securityNonce() {
    static $nonce;
    return $nonce ?? ($nonce = base64_encode(random_bytes(24)));
}
function securityJson($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_SLASHES);
    exit;
}
function securityHeaders() {
    if (PHP_SAPI === 'cli') return;
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    header('Cache-Control: no-store');
    if (securityIsHttps()) header('Strict-Transport-Security: max-age=31536000');
    if (!securityIsLocal() && !securityIsHttps()) securityJson(['error' => 'HTTPS is required.'], 403);
    if (strpos($_SERVER['SCRIPT_NAME'] ?? '', '/admin/') !== false) {
        header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'nonce-" . securityNonce() . "'; style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline'; font-src 'self' https://cdnjs.cloudflare.com data:; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    } else header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
}
function securityCors($methods = 'GET, OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_filter(array_map('trim', explode(',', getenv('CINEHUB_ALLOWED_ORIGINS') ?: 'http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:4175')));
    $same = (securityIsHttps() ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin && !in_array($origin, $allowed, true) && $origin !== $same) securityJson(['error' => 'Origin not allowed.'], 403);
    if ($origin) { header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); }
    header('Access-Control-Allow-Methods: ' . $methods);
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}
function securitySession() {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => securityIsHttps(), 'httponly' => true, 'samesite' => 'Strict']);
    if (!session_start()) securityJson(['error' => 'Session storage unavailable.'], 503);
}
function securityLogout() {
    securitySession();
    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
    session_destroy();
}
function securityCsrf() {
    securitySession();
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}
function securityCheckCsrf($token = null) {
    securitySession();
    $token = $token ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) securityJson(['error' => 'Invalid session token. Reload the page.'], 403);
}
function securityRequireAdmin($csrf = false, $html = false) {
    global $pdo;
    securitySession();
    $valid = !empty($_SESSION['admin_logged_in']) && !empty($_SESSION['admin_id']) &&
        time() - ($_SESSION['last_activity'] ?? 0) < 1800 && time() - ($_SESSION['authenticated_at'] ?? 0) < 28800;
    if ($valid) {
        $stmt = $pdo->prepare('SELECT username, password FROM admin_users WHERE id = ?');
        $stmt->execute([$_SESSION['admin_id']]);
        $user = $stmt->fetch();
        $valid = $user && $user['username'] === ($_SESSION['admin_username'] ?? '') &&
            hash_equals(hash('sha256', $user['password']), $_SESSION['password_version'] ?? '');
    }
    if (!$valid) {
        securityLogout();
        if ($html) { header('Location: login.php'); exit; }
        securityJson(['error' => 'Admin login required.'], 401);
    }
    $_SESSION['last_activity'] = time();
    if ($csrf) securityCheckCsrf();
}
function securityReadJson() {
    if (!preg_match('/^application\/json(?:\s*;|$)/i', $_SERVER['CONTENT_TYPE'] ?? '')) securityJson(['error' => 'Send application/json.'], 415);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) securityJson(['error' => 'Request too large.'], 413);
    $raw = file_get_contents('php://input', false, null, 0, 32769);
    if (strlen($raw) > 32768) securityJson(['error' => 'Request too large.'], 413);
    try { $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException $error) { securityJson(['error' => 'Invalid JSON.'], 400); }
    if (!is_array($input) || array_is_list($input)) securityJson(['error' => 'A JSON object is required.'], 400);
    foreach ($input as $value) if (is_string($value) && strlen($value) > 4096) securityJson(['error' => 'Input is too long.'], 422);
    return $input;
}
function securityHttpUrl($value) {
    if (!is_string($value) || strlen($value) > 2048 || !filter_var($value, FILTER_VALIDATE_URL)) return false;
    $url = parse_url($value);
    return !preg_match('/[\x00-\x20]/', $value) && isset($url['scheme'], $url['host']) && !isset($url['user']) && !isset($url['pass']) &&
        ($url['scheme'] === 'https' || ($url['scheme'] === 'http' && in_array($url['host'], ['localhost', '127.0.0.1'], true)));
}
function securityRate($key, $limit, $seconds) {
    $directory = sys_get_temp_dir() . '/cinehub-security-' . substr(hash('sha256', __DIR__), 0, 16);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) securityJson(['error' => 'Security storage unavailable.'], 503);
    $handle = fopen($directory . '/limits.json', 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) securityJson(['error' => 'Security storage unavailable.'], 503);
    $now = time(); $hash = hash('sha256', $key);
    try {
        $raw = stream_get_contents($handle);
        $data = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($data)) securityJson(['error' => 'Security storage unavailable.'], 503);
        $data = array_filter($data, function ($entry) use ($now) { return is_array($entry) && ($entry['until'] ?? 0) > $now; });
        if (!isset($data[$hash]) && count($data) >= 4096) securityJson(['error' => 'Too many requests. Try again later.'], 429);
        $entry = $data[$hash] ?? ['count' => 0, 'until' => $now + $seconds];
        $entry['count']++;
        $data[$hash] = $entry;
        $encoded = json_encode($data);
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) securityJson(['error' => 'Security storage unavailable.'], 503);
        if ($entry['count'] > $limit) { header('Retry-After: ' . max(1, $entry['until'] - $now)); securityJson(['error' => 'Too many attempts. Try again later.'], 429); }
    } finally { flock($handle, LOCK_UN); fclose($handle); }
}
function securityValidateMovie($input) {
    foreach (['title' => 255, 'source' => 100] as $key => $max) if (isset($input[$key]) && (!is_string($input[$key]) || trim($input[$key]) === '' || strlen($input[$key]) > $max)) securityJson(['error' => 'Invalid ' . $key], 422);
    if (isset($input['tmdb_id']) && (!filter_var($input['tmdb_id'], FILTER_VALIDATE_INT) || $input['tmdb_id'] < 1 || $input['tmdb_id'] > 2147483647)) securityJson(['error' => 'Invalid TMDB ID'], 422);
    if (isset($input['year']) && (!filter_var($input['year'], FILTER_VALIDATE_INT) || $input['year'] < 1888 || $input['year'] > (int)date('Y') + 10)) securityJson(['error' => 'Invalid year'], 422);
    if (isset($input['download_url']) && !securityHttpUrl($input['download_url'])) securityJson(['error' => 'Use a valid HTTPS download URL.'], 422);
}
function securityValidateTelemetry($input) {
    foreach ($input as $key => $value) {
        if ($key === 'error_types') { if (!is_array($value) || count($value) > 20 || strlen(json_encode($value)) > 2048) securityJson(['error' => 'Invalid error types'], 422); continue; }
        if (!is_scalar($value) && $value !== null) securityJson(['error' => 'Invalid field: ' . $key], 422);
        if (is_string($value) && strlen($value) > (in_array($key, ['referrer', 'provider_url', 'user_agent', 'error_message', 'description'], true) ? 2048 : 255)) securityJson(['error' => 'Field too long: ' . $key], 422);
    }
    foreach (['content_id', 'sample_size', 'hit_count', 'miss_count', 'size_bytes', 'ttl_seconds', 'buffer_count', 'playback_errors', 'results_count'] as $key) if (isset($input[$key]) && (!is_numeric($input[$key]) || $input[$key] < 0 || $input[$key] > 2147483647 || floor((float)$input[$key]) != $input[$key])) securityJson(['error' => 'Invalid ' . $key], 422);
    foreach (['response_time_ms', 'metric_value', 'playback_duration', 'buffer_duration', 'completion_percentage', 'rollout_percentage'] as $key) if (isset($input[$key]) && (!is_numeric($input[$key]) || !is_finite((float)$input[$key]) || $input[$key] < 0 || $input[$key] > 1000000000)) securityJson(['error' => 'Invalid ' . $key], 422);
    foreach (['rollout_percentage', 'completion_percentage'] as $key) if (isset($input[$key]) && $input[$key] > 100) securityJson(['error' => 'Invalid percentage'], 422);
    if (isset($input['content_type']) && !in_array($input['content_type'], ['movie', 'tv'], true)) securityJson(['error' => 'Invalid content type'], 422);
    if (isset($input['status_code']) && (!is_int($input['status_code']) || $input['status_code'] < 100 || $input['status_code'] > 599)) securityJson(['error' => 'Invalid status code'], 422);
    if (isset($input['cache_hit']) && !is_bool($input['cache_hit'])) securityJson(['error' => 'Invalid cache flag'], 422);
    if (isset($input['method']) && !in_array($input['method'], ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true)) securityJson(['error' => 'Invalid HTTP method'], 422);
    if (isset($input['is_enabled']) && !is_bool($input['is_enabled'])) securityJson(['error' => 'is_enabled must be boolean'], 422);
    if (isset($input['feature_name']) && !preg_match('/^[a-zA-Z0-9_-]{1,64}$/D', $input['feature_name'])) securityJson(['error' => 'Invalid feature name'], 422);
}
securityHeaders();
