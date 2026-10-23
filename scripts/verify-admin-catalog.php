<?php
// CLI-only integration test. Uses a temporary QA admin, never changes an owner account.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../backend/config.php';
$username = 'catalog_qa_' . bin2hex(random_bytes(6));
$password = bin2hex(random_bytes(24));
$id = null;
$exitCode = 1;
try {
    $stmt = $pdo->prepare('INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $username . '@example.invalid']);
    $id = $pdo->lastInsertId();
    $environment = array_merge(getenv(), ['CINEHUB_ADMIN_USER' => $username, 'CINEHUB_ADMIN_PASSWORD' => $password]);
    $process = proc_open(['node', __DIR__ . '/verify-admin-catalog-browser.cjs'], [0 => STDIN, 1 => STDOUT, 2 => STDERR], $pipes, dirname(__DIR__), $environment);
    if (!is_resource($process)) throw new RuntimeException('Cannot launch browser QA.');
    $exitCode = proc_close($process);
} finally {
    if ($id !== null) {
        $stmt = $pdo->prepare('DELETE FROM admin_users WHERE id = ? AND username = ?');
        $stmt->execute([$id, $username]);
        echo "Temporary QA admin removed; existing admin accounts unchanged.\n";
    }
}
exit($exitCode);
