<?php
require_once __DIR__ . '/db.php';

// Check if running from CLI
if (php_sapi_name() !== 'cli' && !isset($_SESSION['user_id'])) {
    die("Unauthorized");
}

$rawDataPath = __DIR__ . '/../scratch/raw_data.txt';
if (!file_exists($rawDataPath)) {
    die("Raw data file not found.");
}

$content = file_get_contents($rawDataPath);
$sections = explode('--------------------------------------------------', $content);

$gamesData = []; // Unique game titles
$accountsData = []; // All accounts

foreach ($sections as $section) {
    if (empty(trim($section))) continue;

    // Extract Game, Username, Password
    // Format:
    // Account N
    //
    // GAME :
    // [Title]
    //
    // USERNAME :
    // [User]
    //
    // PASSWORD :
    // [Pass]
    
    if (preg_match('/GAME\s*:\s*(.*?)\s*USERNAME\s*:\s*(.*?)\s*PASSWORD\s*:\s*(.*)/s', $section, $matches)) {
        $gameTitle = trim($matches[1]);
        $username = trim($matches[2]);
        $password = trim($matches[3]);

        if (empty($gameTitle)) continue;

        if (!isset($gamesData[$gameTitle])) {
            $gamesData[$gameTitle] = true;
        }

        $accountsData[] = [
            'game' => $gameTitle,
            'user' => $username,
            'pass' => $password
        ];
    }
}

echo "Found " . count($gamesData) . " unique games and " . count($accountsData) . " accounts.\n";

try {
    $pdo = DB::connect();
    $pdo->beginTransaction();

    // 1. Wipe existing data
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $pdo->exec("TRUNCATE TABLE credentials");
    $pdo->exec("TRUNCATE TABLE games");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "Tables truncated.\n";

    // 2. Insert Games
    $stmtGame = $pdo->prepare("INSERT INTO games (name, description, type, image, genre) VALUES (?, ?, 'free', ?, ?)");
    $gameIds = [];
    
    foreach (array_keys($gamesData) as $title) {
        $desc = "Premium access for " . $title;
        $img = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80"; // Default gaming image
        $genre = "Multiplayer";
        
        $stmtGame->execute([$title, $desc, $img, $genre]);
        $gameIds[$title] = $pdo->lastInsertId();
    }

    echo "Inserted " . count($gameIds) . " games.\n";

    // 3. Insert Credentials
    $stmtCred = $pdo->prepare("INSERT INTO credentials (game_id, username, password) VALUES (?, ?, ?)");
    foreach ($accountsData as $acc) {
        $gameId = $gameIds[$acc['game']];
        $stmtCred->execute([$gameId, $acc['user'], $acc['pass']]);
    }

    echo "Inserted " . count($accountsData) . " credentials.\n";

    $pdo->commit();
    echo "Import successful!\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
