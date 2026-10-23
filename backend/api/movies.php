<?php
/**
 * Public Domain Movies API
 * 
 * RESTful API for managing public domain movies.
 * Endpoints:
 * - GET /api/movies.php - Get all movies
 * - GET /api/movies.php?id={id} - Get movie by ID
 * - GET /api/movies.php?tmdb_id={tmdb_id} - Get movie by TMDB ID
 * - POST /api/movies.php - Add new movie
 * - PUT /api/movies.php?id={id} - Update movie
 * - DELETE /api/movies.php?id={id} - Delete movie
 */

require_once '../config.php';

securityCors('GET, POST, PUT, DELETE, OPTIONS');

// Get request method
$method = $_SERVER['REQUEST_METHOD'];
if (in_array($method, ['POST', 'PUT', 'DELETE'], true)) securityRequireAdmin(true);

foreach (['id', 'tmdb_id'] as $key) if (isset($_GET[$key]) && (!is_string($_GET[$key]) || !preg_match('/^[1-9][0-9]{0,9}$/D', $_GET[$key]) || (int)$_GET[$key] > 2147483647)) sendErrorResponse('Invalid ID', 422);
// Get query parameters
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$tmdb_id = isset($_GET['tmdb_id']) ? (int)$_GET['tmdb_id'] : null;

// GET - Fetch movies
if ($method === 'GET') {
    try {
        if ($id) {
            // Get movie by ID
            $stmt = $pdo->prepare("SELECT * FROM public_domain_movies WHERE id = ?");
            $stmt->execute([$id]);
            $movie = $stmt->fetch();
            
            if (!$movie) {
                sendErrorResponse('Movie not found', 404);
            }
            
            sendSuccessResponse($movie);
        } elseif ($tmdb_id) {
            // Get movie by TMDB ID
            $stmt = $pdo->prepare("SELECT * FROM public_domain_movies WHERE tmdb_id = ?");
            $stmt->execute([$tmdb_id]);
            $movie = $stmt->fetch();
            
            if (!$movie) {
                sendSuccessResponse(null, 'No public domain movie found for this TMDB ID');
            }
            
            sendSuccessResponse($movie);
        } else {
            // Get all movies
            $stmt = $pdo->query("SELECT * FROM public_domain_movies ORDER BY year DESC, title ASC");
            $movies = $stmt->fetchAll();
            sendSuccessResponse($movies);
        }
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') sendErrorResponse('A movie with this TMDB ID already exists.', 409);
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// POST - Add new movie
elseif ($method === 'POST') {
    try {
        // Get JSON input
        $input = securityReadJson();
        securityValidateMovie($input);
        
        // Validate required fields
        if (!isset($input['tmdb_id']) || !isset($input['title']) || !isset($input['download_url'])) {
            sendErrorResponse('tmdb_id, title, and download_url are required');
        }
        
        // Check if TMDB ID already exists
        $stmt = $pdo->prepare("SELECT id FROM public_domain_movies WHERE tmdb_id = ?");
        $stmt->execute([$input['tmdb_id']]);
        if ($stmt->fetch()) {
            sendErrorResponse('Movie with this TMDB ID already exists');
        }
        
        // Insert movie
        $stmt = $pdo->prepare("
            INSERT INTO public_domain_movies (tmdb_id, title, download_url, source, year)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['tmdb_id'],
            $input['title'],
            $input['download_url'],
            $input['source'] ?? 'Unknown',
            $input['year'] ?? null
        ]);
        
        sendSuccessResponse(['id' => $pdo->lastInsertId()], 'Movie added successfully');
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') sendErrorResponse('A movie with this TMDB ID already exists.', 409);
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// PUT - Update movie
elseif ($method === 'PUT') {
    try {
        if (!$id) {
            sendErrorResponse('Movie ID is required for update');
        }
        
        // Get JSON input
        $input = securityReadJson();
        securityValidateMovie($input);
        
        // Build update query dynamically
        $fields = [];
        $values = [];
        if (isset($input['tmdb_id'])) {
            $fields[] = 'tmdb_id = ?';
            $values[] = $input['tmdb_id'];
        }
        
        if (isset($input['title'])) {
            $fields[] = 'title = ?';
            $values[] = $input['title'];
        }
        if (isset($input['download_url'])) {
            $fields[] = 'download_url = ?';
            $values[] = $input['download_url'];
        }
        if (isset($input['source'])) {
            $fields[] = 'source = ?';
            $values[] = $input['source'];
        }
        if (isset($input['year'])) {
            $fields[] = 'year = ?';
            $values[] = $input['year'];
        }
        
        if (empty($fields)) {
            sendErrorResponse('No fields to update');
        }
        
        // Add ID to values
        $values[] = $id;
        
        // Update movie
        $sql = "UPDATE public_domain_movies SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        if ($stmt->rowCount() === 0) {
            $existing = $pdo->prepare('SELECT id FROM public_domain_movies WHERE id = ?');
            $existing->execute([$id]);
            if (!$existing->fetch()) sendErrorResponse('Movie not found', 404);
            sendSuccessResponse(null, 'No changes needed');
        }
        
        sendSuccessResponse(null, 'Movie updated successfully');
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') sendErrorResponse('A movie with this TMDB ID already exists.', 409);
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// DELETE - Delete movie
elseif ($method === 'DELETE') {
    try {
        if (!$id) {
            sendErrorResponse('Movie ID is required for deletion');
        }
        
        $stmt = $pdo->prepare("DELETE FROM public_domain_movies WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            sendErrorResponse('Movie not found', 404);
        }
        
        sendSuccessResponse(null, 'Movie deleted successfully');
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') sendErrorResponse('A movie with this TMDB ID already exists.', 409);
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// Invalid method
else {
    sendErrorResponse('Method not allowed', 405);
}
