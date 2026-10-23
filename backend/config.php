<?php
/**
 * CineHub Database Configuration
 * 
 * Database connection settings for the public domain movies system.
 */

require_once __DIR__ . '/security.php';
// Local defaults are never accepted for a remotely accessed deployment.
define('DB_HOST', getenv('CINEHUB_DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('CINEHUB_DB_NAME') ?: 'cinehub_db');
define('DB_USER', getenv('CINEHUB_DB_USER') ?: 'root');
define('DB_PASS', getenv('CINEHUB_DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');
if (!securityIsLocal() && (DB_USER === 'root' || DB_PASS === '')) securityJson(['error' => 'Production database credentials must be configured.'], 503);

// Create database connection
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $pdo->exec("SET time_zone = '+00:00'");
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    securityJson(['error' => 'Database unavailable.'], 503);
}

// Helper function for JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Helper function for error responses
function sendErrorResponse($message, $statusCode = 400) {
    sendJsonResponse(['error' => $message], $statusCode);
}

// Helper function for success responses
function sendSuccessResponse($data, $message = 'Success') {
    sendJsonResponse(['success' => true, 'message' => $message, 'data' => $data, 'generatedAt' => gmdate('c'), 'timezone' => 'UTC']);
}
