<?php
/**
 * Analytics API
 * 
 * RESTful API for tracking analytics metrics.
 * Endpoints:
 * - POST /api/analytics.php - Track analytics event
 * - GET /api/analytics.php?type={type} - Get analytics data
 * - GET /api/analytics.php?dashboard=true - Get dashboard data
 */

require_once '../config.php';

securityCors('GET, POST, OPTIONS');

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') securityRequireAdmin();
if ($method === 'POST') securityRate('analytics:' . ($_SERVER['REMOTE_ADDR'] ?? ''), 120, 60);

// POST - Track analytics event
if ($method === 'POST') {
    try {
        $input = securityReadJson();
        securityValidateTelemetry($input);
        
        if (!isset($input['event_type'])) {
            sendErrorResponse('event_type is required');
        }
        
        $eventType = $input['event_type'];
        $sessionId = $input['session_id'] ?? session_id();
        
        switch ($eventType) {
            case 'page_view':
                $stmt = $pdo->prepare("
                    INSERT INTO analytics_page_views 
                    (session_id, page_type, content_id, content_type, referrer, user_agent, ip_address, country_code, city, device_type, browser, os, screen_resolution)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $sessionId,
                    $input['page_type'] ?? 'home',
                    $input['content_id'] ?? null,
                    $input['content_type'] ?? null,
                    $input['referrer'] ?? null,
                    $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
                    $_SERVER['REMOTE_ADDR'] ?? null,
                    $input['country_code'] ?? null,
                    $input['city'] ?? null,
                    $input['device_type'] ?? null,
                    $input['browser'] ?? null,
                    $input['os'] ?? null,
                    $input['screen_resolution'] ?? null
                ]);
                break;
                
            case 'playback':
                $stmt = $pdo->prepare("
                    INSERT INTO analytics_playback 
                    (session_id, content_id, content_type, content_title, playback_duration, buffer_count, buffer_duration, playback_errors, error_types, quality_played, video_start_time, video_end_time, completion_percentage, user_agent, ip_address, device_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $sessionId,
                    $input['content_id'],
                    $input['content_type'],
                    $input['content_title'] ?? null,
                    $input['playback_duration'] ?? 0,
                    $input['buffer_count'] ?? 0,
                    $input['buffer_duration'] ?? 0,
                    $input['playback_errors'] ?? 0,
                    isset($input['error_types']) ? json_encode($input['error_types']) : null,
                    $input['quality_played'] ?? null,
                    $input['video_start_time'] ?? null,
                    $input['video_end_time'] ?? null,
                    $input['completion_percentage'] ?? 0,
                    $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
                    $_SERVER['REMOTE_ADDR'] ?? null,
                    $input['device_type'] ?? null
                ]);
                break;
                
            case 'provider_click':
                $stmt = $pdo->prepare("
                    INSERT INTO analytics_provider_clicks 
                    (session_id, content_id, content_type, content_title, provider, provider_url, user_agent, ip_address, country_code, referrer)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $sessionId,
                    $input['content_id'],
                    $input['content_type'],
                    $input['content_title'] ?? null,
                    $input['provider'],
                    $input['provider_url'] ?? null,
                    $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
                    $_SERVER['REMOTE_ADDR'] ?? null,
                    $input['country_code'] ?? null,
                    $input['referrer'] ?? null
                ]);
                break;
                
            case 'search':
                $stmt = $pdo->prepare("
                    INSERT INTO analytics_search 
                    (session_id, search_query, results_count, clicked_result_id, clicked_result_type, user_agent, ip_address)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $sessionId,
                    $input['search_query'],
                    $input['results_count'] ?? 0,
                    $input['clicked_result_id'] ?? null,
                    $input['clicked_result_type'] ?? null,
                    $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
                    $_SERVER['REMOTE_ADDR'] ?? null
                ]);
                break;
                
            case 'engagement':
                $stmt = $pdo->prepare("
                    INSERT INTO analytics_engagement 
                    (session_id, content_id, content_type, action_type, action_value, user_agent, ip_address)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $sessionId,
                    $input['content_id'],
                    $input['content_type'],
                    $input['action_type'],
                    $input['action_value'] ?? null,
                    $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
                    $_SERVER['REMOTE_ADDR'] ?? null
                ]);
                break;
                
            default:
                sendErrorResponse('Invalid event_type');
        }
        
        sendSuccessResponse(null, 'Analytics event tracked successfully');
    } catch (PDOException $e) {
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// GET - Retrieve analytics data
elseif ($method === 'GET') {
    try {
        $type = isset($_GET['type']) ? $_GET['type'] : null;
        $dashboard = isset($_GET['dashboard']) ? filter_var($_GET['dashboard'], FILTER_VALIDATE_BOOLEAN) : false;
        
        if ($dashboard) {
            // Get dashboard summary data
            $data = [
                'page_views' => getPageViewStats($pdo),
                'provider_clicks' => getProviderClickStats($pdo),
                'search_queries' => getSearchStats($pdo),
                'engagement' => getEngagementStats($pdo),
                'top_content' => getTopContent($pdo),
                'geographic' => getGeographicStats($pdo)
            ];
            sendSuccessResponse($data);
        } elseif ($type) {
            // Get specific type of analytics
            switch ($type) {
                case 'page_views':
                    $data = getPageViewStats($pdo);
                    sendSuccessResponse($data);
                    break;
                case 'provider_clicks':
                    $data = getProviderClickStats($pdo);
                    sendSuccessResponse($data);
                    break;
                case 'search':
                    $data = getSearchStats($pdo);
                    sendSuccessResponse($data);
                    break;
                case 'engagement':
                    $data = getEngagementStats($pdo);
                    sendSuccessResponse($data);
                    break;
                default:
                    sendErrorResponse('Invalid analytics type');
            }
        } else {
            sendErrorResponse('Specify type or set dashboard=true');
        }
    } catch (PDOException $e) {
        error_log('API database failure: ' . $e->getMessage());
        sendErrorResponse('Database operation unavailable.', 503);
    }
}

// Helper functions for analytics stats
function getPageViewStats($pdo) {
    $total = $pdo->query("SELECT COUNT(*) as count FROM analytics_page_views")->fetch();
    $byPageType = $pdo->query("SELECT page_type, COUNT(*) as count FROM analytics_page_views GROUP BY page_type")->fetchAll();
    $today = $pdo->query("SELECT COUNT(*) as count FROM analytics_page_views WHERE DATE(created_at) = CURDATE()")->fetch();
    
    return [
        'total' => $total['count'],
        'today' => $today['count'],
        'by_page_type' => $byPageType
    ];
}

function getProviderClickStats($pdo) {
    $total = $pdo->query("SELECT COUNT(*) as count FROM analytics_provider_clicks")->fetch();
    $byProvider = $pdo->query("SELECT provider, COUNT(*) as count FROM analytics_provider_clicks GROUP BY provider")->fetchAll();
    
    return [
        'total' => $total['count'],
        'by_provider' => $byProvider
    ];
}

function getSearchStats($pdo) {
    $total = $pdo->query("SELECT COUNT(*) as count FROM analytics_search")->fetch();
    $topQueries = $pdo->query("SELECT search_query, COUNT(*) as count FROM analytics_search GROUP BY search_query ORDER BY count DESC LIMIT 10")->fetchAll();
    
    return [
        'total' => $total['count'],
        'top_queries' => $topQueries
    ];
}

function getEngagementStats($pdo) {
    $total = $pdo->query("SELECT COUNT(*) as count FROM analytics_engagement")->fetch();
    $byAction = $pdo->query("SELECT action_type, COUNT(*) as count FROM analytics_engagement GROUP BY action_type")->fetchAll();
    
    return [
        'total' => $total['count'],
        'by_action' => $byAction
    ];
}

function getTopContent($pdo) {
    $stmt = $pdo->query("
        SELECT content_id, content_type, COUNT(*) as views 
        FROM analytics_page_views 
        WHERE content_id IS NOT NULL 
        GROUP BY content_id, content_type 
        ORDER BY views DESC 
        LIMIT 10
    ");
    return $stmt->fetchAll();
}

function getGeographicStats($pdo) {
    $stmt = $pdo->query("
        SELECT country_code, COUNT(*) as count 
        FROM analytics_page_views 
        WHERE country_code IS NOT NULL 
        GROUP BY country_code 
        ORDER BY count DESC 
        LIMIT 10
    ");
    return $stmt->fetchAll();
}
