<?php
require_once __DIR__ . '/../config.php';
securitySession();
if (!empty($_SESSION['admin_logged_in'])) { securityRequireAdmin(false, true); header('Location: index.php'); exit; }
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    securityCheckCsrf($_POST['csrf_token'] ?? '');
    $username = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
    securityRate('login-ip:' . ($_SERVER['REMOTE_ADDR'] ?? ''), 30, 900);
    securityRate('login-account:' . strtolower(substr($username, 0, 100)), 10, 900);
    $error = 'Invalid username or password';
    if ($username !== '' && strlen($username) <= 50 && strlen($password) <= 1024) {
        try {
            $stmt = $pdo->prepare('SELECT * FROM admin_users WHERE username = ?');
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            $valid = password_verify($password, $user['password'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
            if ($user && $valid) {
                session_regenerate_id(true);
                $_SESSION = ['admin_logged_in' => true, 'admin_username' => $user['username'], 'admin_id' => $user['id'],
                    'authenticated_at' => time(), 'last_activity' => time(), 'password_version' => hash('sha256', $user['password'])];
                securityCsrf();
                $stmt = $pdo->prepare('UPDATE admin_users SET last_login = NOW() WHERE id = ?');
                $stmt->execute([$user['id']]);
                header('Location: index.php'); exit;
            }
        } catch (PDOException $e) { error_log('Admin login database failure'); $error = 'Login unavailable. Try again later.'; }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineHub Admin - Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            color: #333;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-card {
            background-color: #fff;
            border-radius: 8px;
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .login-logo {
            color: #007bff;
            font-size: 2rem;
            text-align: center;
            margin-bottom: 1.5rem;
        }
        .form-control {
            background-color: #fff;
            border-color: #ced4da;
            color: #333;
        }
        .form-control:focus {
            background-color: #fff;
            border-color: #80bdff;
            color: #333;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
        }
        .btn-primary {
            background-color: #007bff;
            border-color: #007bff;
            width: 100%;
        }
        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #0056b3;
        }
        .alert {
            background-color: #fff;
            border-color: #dee2e6;
            color: #333;
        }
        .alert-danger {
            background-color: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="login-logo">
            <i class="fas fa-film"></i>
        </div>
        <h2 class="text-center mb-4">CineHub Admin</h2>
        
        <?php if ($error): ?>
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i><?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>
        
        <form method="POST">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(securityCsrf(), ENT_QUOTES, 'UTF-8') ?>">
            <div class="mb-3">
                <label for="username" class="form-label">Username</label>
                <input type="text" class="form-control" id="username" name="username" required autofocus>
            </div>
            <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-sign-in-alt me-2"></i>Login
            </button>
        </form>
        
        <div class="text-center mt-3 text-muted">
            <small>Use your CineHub administrator credentials.</small>
        </div>
    </div>
</body>
</html>
