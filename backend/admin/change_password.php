<?php
session_start();

// Check if user is logged in
if (!isset($_SESSION['admin_logged_in'])) {
    sendErrorResponse('Not authenticated', 401);
}

require_once '../config.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';

// Validation
if (!$currentPassword || !$newPassword) {
    sendErrorResponse('Current password and new password are required');
}

if (strlen($newPassword) < 6) {
    sendErrorResponse('New password must be at least 6 characters');
}

try {
    // Get current user
    $username = $_SESSION['admin_username'];
    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        sendErrorResponse('User not found');
    }

    // Verify current password
    if (!password_verify($currentPassword, $user['password'])) {
        sendErrorResponse('Current password is incorrect');
    }

    // Hash new password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    // Update password
    $stmt = $pdo->prepare("UPDATE admin_users SET password = ? WHERE id = ?");
    $stmt->execute([$newPasswordHash, $user['id']]);

    sendSuccessResponse(null, 'Password changed successfully');

} catch (PDOException $e) {
    sendErrorResponse('Database error: ' . $e->getMessage());
}
