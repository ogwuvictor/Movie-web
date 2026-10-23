<?php
// Local recovery only. Never expose password resets as a public web endpoint.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../backend/config.php';
$username = $argv[1] ?? 'admin';
$stmt = $pdo->prepare('SELECT id FROM admin_users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();
if (!$user) { fwrite(STDERR, "Admin account not found. No changes made.\n"); exit(1); }
$password = rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '=') . '!9a';
$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('UPDATE admin_users SET password = ? WHERE id = ?');
$stmt->execute([$hash, $user['id']]);
echo json_encode(['username' => $username, 'password' => $password], JSON_THROW_ON_ERROR), "\n";
