<?php
require_once __DIR__ . '/../config.php';
securityRequireAdmin(true);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') securityJson(['error' => 'Method not allowed.'], 405);
securityRate('password:' . $_SESSION['admin_id'], 10, 900);
$input = securityReadJson();
$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';
if (!is_string($currentPassword) || !is_string($newPassword) || strlen($currentPassword) > 1024 || !preg_match('/^.{12,72}$/usD', $newPassword) || strlen($newPassword) > 72 || str_contains($newPassword, "\0")) sendErrorResponse('Use at least 12 characters and at most 72 UTF-8 bytes.', 422);
try {
    $stmt = $pdo->prepare('SELECT password FROM admin_users WHERE id = ?');
    $stmt->execute([$_SESSION['admin_id']]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($currentPassword, $user['password'])) sendErrorResponse('Current password is incorrect', 403);
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('UPDATE admin_users SET password = ? WHERE id = ?');
    $stmt->execute([$hash, $_SESSION['admin_id']]);
    session_regenerate_id(true);
    $_SESSION['password_version'] = hash('sha256', $hash);
    sendSuccessResponse(null, 'Password changed successfully');
} catch (PDOException $e) { error_log('Password update database failure'); sendErrorResponse('Password update unavailable.', 503); }
