<?php
// Test script to debug login issues

require_once 'config.php';

echo "<h2>Database Connection Test</h2>";

try {
    echo "✓ Connected to database successfully<br>";
    echo "Database: " . DB_NAME . "<br>";
    
    // Check if admin user exists
    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE username = ?");
    $stmt->execute(['admin']);
    $user = $stmt->fetch();
    
    if ($user) {
        echo "<br><h3>Admin User Found:</h3>";
        echo "ID: " . $user['id'] . "<br>";
        echo "Username: " . $user['username'] . "<br>";
        echo "Email: " . $user['email'] . "<br>";
        echo "Password Hash: " . $user['password'] . "<br>";
        
        // Test password verification
        echo "<br><h3>Password Verification Test:</h3>";
        $testPassword = 'admin123';
        if (password_verify($testPassword, $user['password'])) {
            echo "✓ Password 'admin123' matches the hash<br>";
        } else {
            echo "✗ Password 'admin123' does NOT match the hash<br>";
        }
        
        // Test with a new hash
        echo "<br><h3>Creating New Hash:</h3>";
        $newHash = password_hash('admin123', PASSWORD_DEFAULT);
        echo "New hash: " . $newHash . "<br>";
        
        if (password_verify('admin123', $newHash)) {
            echo "✓ New hash works<br>";
        }
        
        // Update the password with a fresh hash
        echo "<br><h3>Updating Password:</h3>";
        $stmt = $pdo->prepare("UPDATE admin_users SET password = ? WHERE username = ?");
        $stmt->execute([$newHash, 'admin']);
        echo "✓ Password updated in database<br>";
        echo "<strong>Try logging in again with: admin / admin123</strong>";
        
    } else {
        echo "<br>✗ No admin user found in database<br>";
        echo "Creating admin user...<br>";
        $newHash = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)");
        $stmt->execute(['admin', $newHash, 'admin@cinehub.com']);
        echo "✓ Admin user created<br>";
        echo "<strong>Try logging in with: admin / admin123</strong>";
    }
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage();
}
?>
