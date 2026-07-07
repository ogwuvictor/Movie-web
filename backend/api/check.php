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

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
    sendErrorResponse('Database error: ' . $e->getMessage());
}
