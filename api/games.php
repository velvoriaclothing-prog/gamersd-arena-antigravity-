<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($action) {

    // ── LIST GAMES ────────────────────────────────────────
    case 'list':
        $type   = $_GET['type'] ?? null;
        $active = " WHERE g.is_active = 1";
        $params = [];
        if ($type) { $active .= " AND g.type = ?"; $params[] = $type; }

        $games = DB::fetchAll("
            SELECT g.*,
                   (SELECT COUNT(*) FROM credentials c WHERE c.game_id = g.id AND c.is_claimed = 0) as available_credentials
            FROM games g
            $active
            ORDER BY g.created_at DESC
        ", $params);

        json_response(['success' => true, 'games' => $games]);
        break;

    // ── GET SINGLE GAME ───────────────────────────────────
    case 'get':
        if (!$id) json_response(['success' => false, 'message' => 'Game ID required.'], 400);
        $game = DB::fetchOne("SELECT * FROM games WHERE id = ?", [$id]);
        if (!$game) json_response(['success' => false, 'message' => 'Game not found.'], 404);
        json_response(['success' => true, 'game' => $game]);
        break;

    // ── ADD GAME (admin) ──────────────────────────────────
    case 'add':
        require_admin();
        $data = get_input();
        $name  = trim($data['name'] ?? '');
        $type  = $data['type'] ?? 'free';
        $price = (float)($data['price'] ?? 0);
        $desc  = $data['description'] ?? '';
        $image = $data['image'] ?? '';
        $genre = $data['genre'] ?? '';
        $platform = $data['platform'] ?? 'PC';
        $reveal_time = $data['reveal_time'] ?? null;

        if (!$name || !in_array($type, ['free', 'premium']))
            json_response(['success' => false, 'message' => 'Name and valid type required.']);

        DB::query("INSERT INTO games (name, description, price, image, type, genre, platform, reveal_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [$name, $desc, $price, $image, $type, $genre, $platform, $reveal_time]);
        $newId = DB::lastInsertId();
        json_response(['success' => true, 'message' => 'Game added.', 'id' => $newId]);
        break;

    // ── UPDATE GAME (admin) ───────────────────────────────
    case 'update':
        require_admin();
        if (!$id) json_response(['success' => false, 'message' => 'Game ID required.'], 400);
        $data = get_input();
        $fields = [];
        $params = [];
        $allowed = ['name', 'description', 'price', 'image', 'type', 'genre', 'platform', 'is_active', 'reveal_time'];
        foreach ($allowed as $f) {
            if (isset($data[$f])) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) json_response(['success' => false, 'message' => 'Nothing to update.']);
        $params[] = $id;
        DB::query("UPDATE games SET " . implode(', ', $fields) . " WHERE id = ?", $params);
        json_response(['success' => true, 'message' => 'Game updated.']);
        break;

    // ── DELETE GAME (admin) ───────────────────────────────
    case 'delete':
        require_admin();
        if (!$id) json_response(['success' => false, 'message' => 'Game ID required.'], 400);
        DB::query("DELETE FROM games WHERE id = ?", [$id]);
        json_response(['success' => true, 'message' => 'Game deleted.']);
        break;

    // ── GET FREE CREDENTIAL (reveals one per user per game) ─
    case 'reveal':
        $userId = require_auth();
        if (!$id) json_response(['success' => false, 'message' => 'Game ID required.'], 400);

        // Check if user already claimed for this game
        $already = DB::fetchOne("SELECT * FROM credentials WHERE game_id = ? AND claimed_by = ?", [$id, $userId]);
        if ($already) {
            json_response(['success' => true, 'credential' => ['username' => $already['username'], 'password' => $already['password']]]);
        }

        // Find available credential
        $cred = DB::fetchOne("SELECT * FROM credentials WHERE game_id = ? AND is_claimed = 0 LIMIT 1", [$id]);
        if (!$cred) json_response(['success' => false, 'message' => 'No credentials available right now. Check back later!'], 404);

        // Claim it
        DB::query("UPDATE credentials SET is_claimed = 1, claimed_by = ?, claimed_at = NOW() WHERE id = ?", [$userId, $cred['id']]);
        json_response(['success' => true, 'credential' => ['username' => $cred['username'], 'password' => $cred['password']]]);
        break;

    // ── ADD CREDENTIAL (admin) ────────────────────────────
    case 'add_credential':
        require_admin();
        $data = get_input();
        $gameId = (int)($data['game_id'] ?? 0);
        $username = trim($data['username'] ?? '');
        $password = trim($data['password'] ?? '');

        if (!$gameId || !$username || !$password)
            json_response(['success' => false, 'message' => 'game_id, username, password required.']);

        DB::query("INSERT INTO credentials (game_id, username, password) VALUES (?, ?, ?)", [$gameId, $username, $password]);
        json_response(['success' => true, 'message' => 'Credential added.']);
        break;

    // ── LIST CREDENTIALS (admin) ──────────────────────────
    case 'list_credentials':
        require_admin();
        $gameId = $id;
        $where  = $gameId ? "WHERE c.game_id = $gameId" : "";
        $creds  = DB::fetchAll("
            SELECT c.*, g.name as game_name, u.email as claimed_by_email
            FROM credentials c
            LEFT JOIN games g ON c.game_id = g.id
            LEFT JOIN users u ON c.claimed_by = u.id
            $where
            ORDER BY c.id DESC
        ");
        json_response(['success' => true, 'credentials' => $creds]);
        break;

    // ── DELETE CREDENTIAL (admin) ─────────────────────────
    case 'delete_credential':
        require_admin();
        if (!$id) json_response(['success' => false, 'message' => 'Credential ID required.'], 400);
        DB::query("DELETE FROM credentials WHERE id = ?", [$id]);
        json_response(['success' => true, 'message' => 'Credential deleted.']);
        break;

    default:
        json_response(['success' => false, 'message' => 'Invalid action.'], 404);
}
?>
