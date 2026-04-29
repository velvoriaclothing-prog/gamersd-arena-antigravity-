<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($action) {

    // ── CREATE ORDER ──────────────────────────────────────
    case 'create':
        $userId = require_auth();
        $data   = get_input();
        $items  = $data['items'] ?? [];
        $total  = (float)($data['total'] ?? 0);

        if (empty($items)) json_response(['success' => false, 'message' => 'Cart is empty.']);
        if ($total <= 0)   json_response(['success' => false, 'message' => 'Invalid total amount.']);

        $ref = 'GA-' . strtoupper(substr(md5(uniqid()), 0, 8));
        DB::query("INSERT INTO orders (user_id, items, total_amount, order_ref) VALUES (?, ?, ?, ?)",
            [$userId, json_encode($items), $total, $ref]);
        $orderId = DB::lastInsertId();

        json_response(['success' => true, 'order' => ['id' => $orderId, 'ref' => $ref, 'total' => $total, 'status' => 'pending']]);
        break;

    // ── MARK AS PAID (user clicks "I Paid") ──────────────
    case 'claim_payment':
        $userId = require_auth();
        if (!$id) json_response(['success' => false, 'message' => 'Order ID required.'], 400);

        $order = DB::fetchOne("SELECT * FROM orders WHERE id = ? AND user_id = ?", [$id, $userId]);
        if (!$order) json_response(['success' => false, 'message' => 'Order not found.'], 404);
        if ($order['status'] !== 'pending')
            json_response(['success' => false, 'message' => 'Order already processed.']);

        DB::query("UPDATE orders SET status = 'payment_claimed', updated_at = NOW() WHERE id = ?", [$id]);
        json_response([
            'success' => true,
            'message' => 'Payment marked! You will be redirected to Telegram.',
            'telegram' => TELEGRAM_LINK,
            'order_ref' => $order['order_ref'],
        ]);
        break;

    // ── MY ORDERS (user) ──────────────────────────────────
    case 'my_orders':
        $userId = require_auth();
        $orders = DB::fetchAll("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [$userId]);
        json_response(['success' => true, 'orders' => $orders]);
        break;

    // ── ALL ORDERS (admin) ────────────────────────────────
    case 'all':
        require_admin();
        $status = $_GET['status'] ?? null;
        $where  = $status ? "WHERE o.status = '$status'" : "";
        $orders = DB::fetchAll("
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            $where
            ORDER BY o.created_at DESC
        ");
        json_response(['success' => true, 'orders' => $orders]);
        break;

    // ── UPDATE ORDER STATUS (admin) ───────────────────────
    case 'update_status':
        require_admin();
        if (!$id) json_response(['success' => false, 'message' => 'Order ID required.'], 400);
        $data   = get_input();
        $status = $data['status'] ?? '';
        $valid  = ['pending', 'payment_claimed', 'confirmed', 'cancelled'];
        if (!in_array($status, $valid))
            json_response(['success' => false, 'message' => 'Invalid status.']);

        DB::query("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", [$status, $id]);
        json_response(['success' => true, 'message' => "Order status updated to: $status"]);
        break;

    // ── STATS (admin dashboard) ───────────────────────────
    case 'stats':
        require_admin();
        $stats = [
            'total_orders'    => DB::fetchOne("SELECT COUNT(*) as c FROM orders")['c'],
            'pending_orders'  => DB::fetchOne("SELECT COUNT(*) as c FROM orders WHERE status = 'payment_claimed'")['c'],
            'confirmed_orders'=> DB::fetchOne("SELECT COUNT(*) as c FROM orders WHERE status = 'confirmed'")['c'],
            'total_revenue'   => DB::fetchOne("SELECT COALESCE(SUM(total_amount),0) as s FROM orders WHERE status = 'confirmed'")['s'],
            'total_users'     => DB::fetchOne("SELECT COUNT(*) as c FROM users WHERE role = 'user'")['c'],
            'total_games'     => DB::fetchOne("SELECT COUNT(*) as c FROM games WHERE is_active = 1")['c'],
            'free_games'      => DB::fetchOne("SELECT COUNT(*) as c FROM games WHERE type = 'free' AND is_active = 1")['c'],
            'premium_games'   => DB::fetchOne("SELECT COUNT(*) as c FROM games WHERE type = 'premium' AND is_active = 1")['c'],
            'unclaimed_creds' => DB::fetchOne("SELECT COUNT(*) as c FROM credentials WHERE is_claimed = 0")['c'],
        ];
        json_response(['success' => true, 'stats' => $stats]);
        break;

    default:
        json_response(['success' => false, 'message' => 'Invalid action.'], 404);
}
?>
