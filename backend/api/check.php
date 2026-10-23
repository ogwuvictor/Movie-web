<?php
/**
 * Check if Movie is Public Domain
 * 
 * API endpoint for React frontend to check if a movie is public domain.
 * Usage: GET /api/check.php?tmdb_id={tmdb_id}
 * 
 * Returns:
 * {
 *   success: true,
 *   is_public_domain: boolean,
 *   data: { movie details } or null
 * }
 */

require_once '../config.php';

securityCors('GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') sendErrorResponse('Method not allowed', 405);
foreach (['id', 'tmdb_id'] as $key) if (isset($_GET[$key]) && (!is_string($_GET[$key]) || !preg_match('/^[1-9][0-9]{0,9}$/D', $_GET[$key]) || (int)$_GET[$key] > 2147483647)) sendErrorResponse('Invalid ID', 422);
// Get TMDB ID from query parameter
$tmdb_id = isset($_GET['tmdb_id']) ? (int)$_GET['tmdb_id'] : null;

if (!$tmdb_id) {
    sendErrorResponse('TMDB ID is required');
}

try {
    // Check if movie exists in public domain database
    $stmt = $pdo->prepare("SELECT * FROM public_domain_movies WHERE tmdb_id = ?");
    $stmt->execute([$tmdb_id]);
    $movie = $stmt->fetch();
    
    if ($movie) {
        sendJsonResponse([
            'success' => true,
            'is_public_domain' => true,
            'data' => $movie
        ]);
    } else {
        sendJsonResponse([
            'success' => true,
            'is_public_domain' => false,
            'data' => null
        ]);
    }
} catch (PDOException $e) {
    error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
}
