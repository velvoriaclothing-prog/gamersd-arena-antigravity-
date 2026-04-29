<?php
require_once __DIR__ . '/db.php';

// ============================================================
// GAMERS ARENA - DATABASE SETUP
// Visit: https://gamersarena.shop/api/setup.php ONCE to init DB
// ============================================================

$pdo = DB::connect();

$tables = [
// Users
"CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    avatar VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

// Games
"CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    image VARCHAR(500),
    type ENUM('free', 'premium') NOT NULL,
    genre VARCHAR(100),
    platform VARCHAR(100) DEFAULT 'PC',
    is_active BOOLEAN DEFAULT TRUE,
    reveal_time DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

// Free game credentials pool
"CREATE TABLE IF NOT EXISTS credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by INT DEFAULT NULL,
    claimed_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

// Orders
"CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    items JSON NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'payment_claimed', 'confirmed', 'cancelled') DEFAULT 'pending',
    order_ref VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

// Blog posts
"CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    image VARCHAR(500),
    category VARCHAR(100),
    read_time INT DEFAULT 5,
    author_id INT DEFAULT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

$errors = [];
foreach ($tables as $sql) {
    try {
        $pdo->exec($sql);
    } catch (PDOException $e) {
        $errors[] = $e->getMessage();
    }
}

// Create admin user
$adminEmail = 'admin@gamersarena.shop';
$existing = DB::fetchOne("SELECT id FROM users WHERE email = ?", [$adminEmail]);
if (!$existing) {
    $hash = password_hash(ADMIN_PASS, PASSWORD_BCRYPT);
    DB::query("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')",
        [$adminEmail, $hash, 'Admin']);
}

// Seed sample games if empty
$gameCount = DB::fetchOne("SELECT COUNT(*) as cnt FROM games")['cnt'];
if ($gameCount == 0) {
    $sampleGames = [
        ['Neon Samurai: Cyber Clash', 'Battle as a cyberpunk samurai in neon-lit arenas.', 0, 'free', 'Action'],
        ['Void Runner', 'Infinite runner through the space void.', 0, 'free', 'Runner'],
        ['Arcane Soul', 'Master the ancient arts of magic in this RPG.', 0, 'free', 'RPG'],
        ['Elden Ring: Shadow of Erdtree', 'Master the Land of Shadow with exclusive optimizations.', 4999.00, 'premium', 'RPG'],
        ['Starfield: Premium Edition', 'The ultimate space exploration experience.', 7499.00, 'premium', 'Adventure'],
        ['Cyberpunk 2077: Phantom Liberty', 'High-stakes espionage in the Neon Jungle.', 5999.00, 'premium', 'Action'],
    ];
    foreach ($sampleGames as $g) {
        DB::query("INSERT INTO games (name, description, price, type, genre) VALUES (?, ?, ?, ?, ?)", $g);
    }
}

// Seed sample blog if empty
$blogCount = DB::fetchOne("SELECT COUNT(*) as cnt FROM blogs")['cnt'];
if ($blogCount == 0) {
    DB::query("INSERT INTO blogs (title, content, excerpt, category, read_time, is_published) VALUES (?, ?, ?, ?, ?, ?)", [
        'The Future of AI-Generated Worlds in Modern RPGs',
        'Deep dive into how neural networks are generating infinite, highly detailed side quests and dynamic environments that respond to player psychology in real-time. This technology is revolutionizing how we experience open-world games.',
        'How neural networks are generating infinite, highly detailed side quests and dynamic environments that respond to player psychology.',
        'AI Gaming', 7, 1
    ]);
}

if (empty($errors)) {
    echo json_encode(['success' => true, 'message' => 'Database setup complete! All tables created. Admin user ready. You can now delete this file.']);
} else {
    echo json_encode(['success' => false, 'errors' => $errors]);
}
?>
