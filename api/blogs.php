<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($action) {

    // ── LIST BLOGS ────────────────────────────────────────
    case 'list':
        $limit  = (int)($_GET['limit'] ?? 20);
        $cat    = $_GET['category'] ?? null;
        $where  = "WHERE b.is_published = 1";
        $params = [];
        if ($cat) { $where .= " AND b.category = ?"; $params[] = $cat; }

        $blogs = DB::fetchAll("
            SELECT b.*, u.name as author_name
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            $where
            ORDER BY b.created_at DESC
            LIMIT $limit
        ", $params);

        json_response(['success' => true, 'blogs' => $blogs]);
        break;

    // ── GET SINGLE BLOG ───────────────────────────────────
    case 'get':
        if (!$id) json_response(['success' => false, 'message' => 'Blog ID required.'], 400);
        $blog = DB::fetchOne("
            SELECT b.*, u.name as author_name FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE b.id = ? AND b.is_published = 1
        ", [$id]);
        if (!$blog) json_response(['success' => false, 'message' => 'Blog not found.'], 404);
        json_response(['success' => true, 'blog' => $blog]);
        break;

    // ── ADD BLOG (admin) ──────────────────────────────────
    case 'add':
        require_admin();
        $data     = get_input();
        $title    = trim($data['title'] ?? '');
        $content  = $data['content'] ?? '';
        $excerpt  = $data['excerpt'] ?? substr(strip_tags($content), 0, 200);
        $image    = $data['image'] ?? '';
        $category = $data['category'] ?? 'General';
        $readTime = (int)($data['read_time'] ?? 5);
        $authorId = $_SESSION['user_id'] ?: null;
        $publish  = (bool)($data['is_published'] ?? true) ? 1 : 0;

        if (!$title || !$content)
            json_response(['success' => false, 'message' => 'Title and content required.']);

        DB::query("INSERT INTO blogs (title, content, excerpt, image, category, read_time, author_id, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [$title, $content, $excerpt, $image, $category, $readTime, $authorId, $publish]);
        json_response(['success' => true, 'message' => 'Blog post created.', 'id' => DB::lastInsertId()]);
        break;

    // ── UPDATE BLOG (admin) ───────────────────────────────
    case 'update':
        require_admin();
        if (!$id) json_response(['success' => false, 'message' => 'Blog ID required.'], 400);
        $data    = get_input();
        $fields  = [];
        $params  = [];
        $allowed = ['title', 'content', 'excerpt', 'image', 'category', 'read_time', 'is_published'];
        foreach ($allowed as $f) {
            if (isset($data[$f])) { $fields[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (empty($fields)) json_response(['success' => false, 'message' => 'Nothing to update.']);
        $params[] = $id;
        DB::query("UPDATE blogs SET " . implode(', ', $fields) . " WHERE id = ?", $params);
        json_response(['success' => true, 'message' => 'Blog updated.']);
        break;

    // ── DELETE BLOG (admin) ───────────────────────────────
    case 'delete':
        require_admin();
        if (!$id) json_response(['success' => false, 'message' => 'Blog ID required.'], 400);
        DB::query("DELETE FROM blogs WHERE id = ?", [$id]);
        json_response(['success' => true, 'message' => 'Blog deleted.']);
        break;

    // ── ALL (admin including unpublished) ─────────────────
    case 'all':
        require_admin();
        $blogs = DB::fetchAll("SELECT b.*, u.name as author_name FROM blogs b LEFT JOIN users u ON b.author_id = u.id ORDER BY b.created_at DESC");
        json_response(['success' => true, 'blogs' => $blogs]);
        break;

    default:
        json_response(['success' => false, 'message' => 'Invalid action.'], 404);
}
?>
