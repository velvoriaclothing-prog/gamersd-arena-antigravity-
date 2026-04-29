<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {

    // ── REGISTER ──────────────────────────────────────────
    case 'register':
        if ($method !== 'POST') json_response(['success' => false, 'message' => 'POST required'], 405);
        $data = get_input();
        $name  = trim($data['name'] ?? '');
        $email = trim(strtolower($data['email'] ?? ''));
        $pass  = $data['password'] ?? '';

        if (!$name || !$email || !$pass)
            json_response(['success' => false, 'message' => 'All fields required.']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))
            json_response(['success' => false, 'message' => 'Invalid email address.']);
        if (strlen($pass) < 6)
            json_response(['success' => false, 'message' => 'Password must be at least 6 characters.']);

        $existing = DB::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($existing)
            json_response(['success' => false, 'message' => 'Email already registered.']);

        $hash = password_hash($pass, PASSWORD_BCRYPT);
        DB::query("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)", [$email, $hash, $name]);
        $userId = DB::lastInsertId();

        $_SESSION['user_id'] = $userId;
        $_SESSION['name']    = $name;
        $_SESSION['email']   = $email;
        $_SESSION['role']    = 'user';

        json_response(['success' => true, 'message' => "Welcome, $name!", 'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'user']]);
        break;

    // ── LOGIN ─────────────────────────────────────────────
    case 'login':
        if ($method !== 'POST') json_response(['success' => false, 'message' => 'POST required'], 405);
        $data  = get_input();
        $email = trim(strtolower($data['email'] ?? ''));
        $pass  = $data['password'] ?? '';

        // Check hardcoded admin
        if ($email === ADMIN_ID && $pass === ADMIN_PASS) {
            $_SESSION['user_id'] = 0;
            $_SESSION['name']    = 'Admin';
            $_SESSION['email']   = 'admin';
            $_SESSION['role']    = 'admin';
            json_response(['success' => true, 'user' => ['id' => 0, 'name' => 'Admin', 'email' => 'admin', 'role' => 'admin']]);
        }

        if (!$email || !$pass)
            json_response(['success' => false, 'message' => 'Email and password required.']);

        $user = DB::fetchOne("SELECT * FROM users WHERE email = ?", [$email]);
        if (!$user || !password_verify($pass, $user['password_hash']))
            json_response(['success' => false, 'message' => 'Invalid email or password.']);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name']    = $user['name'];
        $_SESSION['email']   = $user['email'];
        $_SESSION['role']    = $user['role'];

        json_response(['success' => true, 'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']]]);
        break;

    // ── LOGOUT ────────────────────────────────────────────
    case 'logout':
        session_destroy();
        json_response(['success' => true, 'message' => 'Logged out.']);
        break;

    // ── ME (check session) ────────────────────────────────
    case 'me':
        if (isset($_SESSION['user_id'])) {
            json_response(['success' => true, 'user' => [
                'id'    => $_SESSION['user_id'],
                'name'  => $_SESSION['name'],
                'email' => $_SESSION['email'],
                'role'  => $_SESSION['role'],
            ]]);
        }
        json_response(['success' => false, 'message' => 'Not logged in.'], 401);
        break;

    default:
        json_response(['success' => false, 'message' => 'Invalid action.'], 404);
}
?>
