<?php
/**
 * Performance & Optimization API
 * 
 * RESTful API for tracking performance metrics and managing optimization features.
 * Endpoints:
 * - POST /api/performance.php - Track performance metric
 * - GET /api/performance.php?type=api_metrics - Get API performance data
 * - GET /api/performance.php?type=system_metrics - Get system metrics
 * - GET /api/performance.php?type=feature_flags - Get feature flags
 * - PUT /api/performance.php?type=feature_flags - Update feature flag
 * - GET /api/performance.php?type=cache_metrics - Get cache metrics
 * - POST /api/performance.php?type=cache_metrics - Update cache metric
 */

require_once '../config.php';

securityCors('GET, POST, PUT, OPTIONS');

$method = $_SERVER['REQUEST_METHOD'];
$type = isset($_GET['type']) ? $_GET['type'] : null;
if ($method === 'GET') securityRequireAdmin();
if ($method === 'PUT' || ($method === 'POST' && $type !== 'api_metric')) securityRequireAdmin(true);
if ($method === 'POST' && $type === 'api_metric') securityRate('performance:' . ($_SERVER['REMOTE_ADDR'] ?? ''), 120, 60);

// POST - Track performance metric or cache metric
if ($method === 'POST') {
    try {
        $input = securityReadJson();
        securityValidateTelemetry($input);
        
        if (!$type) {
            sendErrorResponse('type parameter is required');
        }
        
        if ($type === 'api_metric') {
            $stmt = $pdo->prepare("
                INSERT INTO performance_api_metrics 
                (endpoint, method, response_time_ms, status_code, cache_hit, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['endpoint'],
                $input['method'],
                $input['response_time_ms'],
                $input['status_code'],
                $input['cache_hit'] ?? false,
                $input['error_message'] ?? null
            ]);
            sendSuccessResponse(null, 'API metric tracked');
        }
        elseif ($type === 'system_metric') {
            $stmt = $pdo->prepare("
                INSERT INTO performance_system_metrics 
                (metric_type, metric_value, metric_unit, server_name)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['metric_type'],
                $input['metric_value'],
                $input['metric_unit'] ?? null,
                $input['server_name'] ?? gethostname()
            ]);
            sendSuccessResponse(null, 'System metric tracked');
        }
        elseif ($type === 'cache_metric') {
            $stmt = $pdo->prepare("
                INSERT INTO optimization_cache_metrics 
                (cache_key, cache_type, hit_count, miss_count, size_bytes, ttl_seconds)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                hit_count = hit_count + VALUES(hit_count),
                miss_count = miss_count + VALUES(miss_count),
                size_bytes = VALUES(size_bytes),
                ttl_seconds = VALUES(ttl_seconds),
                updated_at = NOW()
            ");
            $stmt->execute([
                $input['cache_key'],
                $input['cache_type'],
                $input['hit_count'] ?? 0,
                $input['miss_count'] ?? 0,
                $input['size_bytes'] ?? null,
                $input['ttl_seconds'] ?? null
            ]);
            sendSuccessResponse(null, 'Cache metric updated');
        }
        elseif ($type === 'ab_test') {
            $stmt = $pdo->prepare("
                INSERT INTO optimization_ab_tests 
                (test_name, variant, metric_name, metric_value, sample_size)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['test_name'],
                $input['variant'],
                $input['metric_name'],
                $input['metric_value'],
                $input['sample_size'] ?? 1
            ]);
            sendSuccessResponse(null, 'A/B test result recorded');
        }
        else {
            sendErrorResponse('Invalid type');
        }
    } catch (PDOException $e) {
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// PUT - Update feature flag
elseif ($method === 'PUT') {
    try {
        if ($type === 'feature_flags') {
            $input = securityReadJson();
        securityValidateTelemetry($input);
            
            if (!isset($input['feature_name'])) {
                sendErrorResponse('feature_name is required');
            }
            
            $fields = [];
            $values = [];
            
            if (isset($input['is_enabled'])) {
                $fields[] = 'is_enabled = ?';
                $values[] = $input['is_enabled'];
            }
            if (isset($input['description'])) {
                $fields[] = 'description = ?';
                $values[] = $input['description'];
            }
            if (isset($input['rollout_percentage'])) {
                $fields[] = 'rollout_percentage = ?';
                $values[] = $input['rollout_percentage'];
            }
            
            if (empty($fields)) {
                sendErrorResponse('No fields to update');
            }
            
            $values[] = $input['feature_name'];
            
            $sql = "UPDATE optimization_feature_flags SET " . implode(', ', $fields) . " WHERE feature_name = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            
            sendSuccessResponse(null, 'Feature flag updated');
        }
        else {
            sendErrorResponse('Invalid type for PUT request');
        }
    } catch (PDOException $e) {
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// GET - Retrieve performance/optimization data
elseif ($method === 'GET') {
    try {
        if (!$type) {
            sendErrorResponse('type parameter is required');
        }
        
        switch ($type) {
            case 'api_metrics':
                $data = getApiMetrics($pdo);
                sendSuccessResponse($data);
                break;
                
            case 'system_metrics':
                $data = getSystemMetrics($pdo);
                sendSuccessResponse($data);
                break;
                
            case 'feature_flags':
                $data = getFeatureFlags($pdo);
                sendSuccessResponse($data);
                break;
                
            case 'cache_metrics':
                $data = getCacheMetrics($pdo);
                sendSuccessResponse($data);
                break;
                
            case 'ab_tests':
                $data = getAbTests($pdo);
                sendSuccessResponse($data);
                break;
                
            case 'dashboard':
                $data = [
                    'api_metrics' => getApiMetrics($pdo),
                    'system_metrics' => getSystemMetrics($pdo),
                    'cache_metrics' => getCacheMetrics($pdo),
                    'feature_flags' => getFeatureFlags($pdo)
                ];
                sendSuccessResponse($data);
                break;
                
            default:
                sendErrorResponse('Invalid type');
        }
    } catch (PDOException $e) {
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// Helper functions
function getApiMetrics($pdo) {
    $recent = $pdo->query("
        SELECT endpoint, method, AVG(response_time_ms) as avg_response, 
               COUNT(*) as requests, 
               SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
               AVG(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100 as cache_hit_rate
        FROM performance_api_metrics 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY endpoint, method
        ORDER BY avg_response DESC
        LIMIT 20
    ")->fetchAll();
    
    return $recent;
}

function getSystemMetrics($pdo) {
    $recent = $pdo->query("
        SELECT metric_type, metric_value, metric_unit, server_name, created_at
        FROM performance_system_metrics
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY created_at DESC
        LIMIT 50
    ")->fetchAll();
    
    return $recent;
}

function getFeatureFlags($pdo) {
    $flags = $pdo->query("SELECT * FROM optimization_feature_flags ORDER BY feature_name")->fetchAll();
    return $flags;
}

function getCacheMetrics($pdo) {
    $metrics = $pdo->query("
        SELECT cache_key, cache_type, hit_count, miss_count, 
               (hit_count / (hit_count + miss_count) * 100) as hit_rate,
               size_bytes, ttl_seconds, updated_at
        FROM optimization_cache_metrics
        ORDER BY hit_count DESC
        LIMIT 50
    ")->fetchAll();
    
    return $metrics;
}

function getAbTests($pdo) {
    $tests = $pdo->query("
        SELECT test_name, variant, metric_name, AVG(metric_value) as avg_value, 
               SUM(sample_size) as total_samples
        FROM optimization_ab_tests
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY test_name, variant, metric_name
        ORDER BY test_name, variant
    ")->fetchAll();
    
    return $tests;
}
