<?php
require_once __DIR__ . '/../security.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') securityJson(['error' => 'Method not allowed.'], 405);
securityCheckCsrf($_POST['csrf_token'] ?? '');
securityLogout();
header('Location: login.php');
exit;
