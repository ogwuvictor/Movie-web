<?php
require_once __DIR__ . '/../lib/streaming_availability.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function catalogResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    header('Access-Control-Allow-Origin: *');
    try {
        $catalog = readStreamingCatalog();
        $catalog['movies'] = (object)$catalog['movies'];
        catalogResponse($catalog);
    } catch (Throwable $error) {
        catalogResponse(['error' => 'The availability catalog could not be read.'], 503);
    }
}
if (!in_array($method, ['POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    catalogResponse(['error' => 'Method not allowed.'], 405);
}
session_start();
if (empty($_SESSION['admin_logged_in'])) catalogResponse(['error' => 'Admin login required.'], 401);
$token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!is_string($token) || empty($_SESSION['catalog_csrf']) || !hash_equals($_SESSION['catalog_csrf'], $token)) {
    catalogResponse(['error' => 'Invalid session token. Reload the admin page.'], 403);
}
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    catalogResponse(['error' => 'Send application/json.'], 415);
}
try {
    $raw = file_get_contents('php://input', false, null, 0, 16385);
    if (strlen($raw) > 16384) catalogResponse(['error' => 'Request too large.'], 413);
    $input = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if ($method === 'POST') {
        [$id, $record] = validateStreamingRecord($input);
        updateStreamingCatalog(function ($catalog) use ($id, $record) { $catalog['movies'][$id] = $record; return $catalog; });
        catalogResponse(['success' => true, 'message' => 'Availability record saved.']);
    }
    $id = streamingMovieId($input['tmdbId'] ?? '');
    updateStreamingCatalog(function ($catalog) use ($id) { unset($catalog['movies'][$id]); return $catalog; });
    catalogResponse(['success' => true, 'message' => 'Availability record removed.']);
} catch (JsonException $error) {
    catalogResponse(['error' => 'Invalid JSON.'], 400);
} catch (InvalidArgumentException $error) {
    catalogResponse(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('Streaming catalog update failed: ' . $error->getMessage());
    catalogResponse(['error' => 'The catalog could not be saved. Check server storage permissions.'], 500);
}
