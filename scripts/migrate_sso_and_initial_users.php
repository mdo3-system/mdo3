<?php
/**
 * scripts/migrate_sso_and_initial_users.php
 * 
 * mdo3.com 共通SSO認証基盤 マイグレーションスクリプト
 * - users, magic_links, sessions, subscriptions テーブルの作成・拡張
 * - 初期3アカウント（eie, sato, s2712350）の登録およびマジックリンク生成
 */

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'mdo3_toolapp';
$dbUser = getenv('DB_USER') ?: 'mdo3_toolapp0001';
$dbPass = getenv('DB_PASS') ?: 'koki2656@';

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "=== DB Connection Success: {$dbName} ===\n\n";

    // 1. users テーブルの拡張（既存データを壊さずカラム追加）
    echo "[1/4] Checking and updating 'users' table...\n";
    $columns = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('status', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active' AFTER role");
        echo "  - Added 'status' column to users.\n";
    }
    if (!in_array('name', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL AFTER email");
        echo "  - Added 'name' column to users.\n";
    }
    if (!in_array('company', $columns)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN company VARCHAR(100) NULL AFTER name");
        echo "  - Added 'company' column to users.\n";
    }
    // role の ENUM を拡張 (user, staff, admin)
    $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'staff', 'admin') NOT NULL DEFAULT 'user'");
    echo "  - Ensured 'role' enum includes 'staff'.\n";

    // 2. magic_links テーブルの作成
    echo "\n[2/4] Ensuring 'magic_links' table...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS magic_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        redirect_to VARCHAR(500) NULL DEFAULT 'https://app.mdo3.com/',
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        CONSTRAINT fk_magic_links_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "  - 'magic_links' table ready.\n";

    // 3. sessions テーブルの作成 (Domain=.mdo3.com 共通認証用)
    echo "\n[3/4] Ensuring 'sessions' table...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_token VARCHAR(128) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_token (session_token),
        INDEX idx_session_expires (expires_at),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "  - 'sessions' table ready.\n";

    // 4. subscriptions テーブルの拡張（ツール別課金対応）
    echo "\n[4/4] Checking and updating 'subscriptions' table...\n";
    $subColumns = $pdo->query("SHOW COLUMNS FROM subscriptions")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('target_tool', $subColumns)) {
        $pdo->exec("ALTER TABLE subscriptions ADD COLUMN target_tool VARCHAR(50) NOT NULL DEFAULT 'all' AFTER user_id");
        echo "  - Added 'target_tool' column to subscriptions.\n";
    }
    if (!in_array('plan_tier', $subColumns)) {
        $pdo->exec("ALTER TABLE subscriptions ADD COLUMN plan_tier VARCHAR(50) NOT NULL DEFAULT 'free' AFTER price_key");
        echo "  - Added 'plan_tier' column to subscriptions.\n";
    }

    // 5. 初期3アカウントの登録 & マジックリンク生成
    echo "\n=== Registering Initial 3 Accounts & Generating Magic Links ===\n";
    $initialAccounts = [
        [
            'email' => 'eie@ymail.ne.jp',
            'name' => '管理者 (eie)',
            'role' => 'admin'
        ],
        [
            'email' => 'sato@t-smile.co.jp',
            'name' => '佐藤様 (t-smile)',
            'role' => 'admin'
        ],
        [
            'email' => 's2712350@gmail.com',
            'name' => '初期ユーザー (s2712350)',
            'role' => 'staff'
        ]
    ];

    $magicLinkResults = [];

    foreach ($initialAccounts as $acc) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$acc['email']]);
        $existing = $stmt->fetch();

        if ($existing) {
            $userId = $existing['id'];
            $updateStmt = $pdo->prepare("UPDATE users SET role = ?, status = 'active', name = COALESCE(name, ?) WHERE id = ?");
            $updateStmt->execute([$acc['role'], $acc['name'], $userId]);
            echo "Updated existing user: {$acc['email']} (ID: {$userId}, Role: {$acc['role']})\n";
        } else {
            $insertStmt = $pdo->prepare("INSERT INTO users (email, name, role, status, password_hash) VALUES (?, ?, ?, 'active', '')");
            $insertStmt->execute([$acc['email'], $acc['name'], $acc['role']]);
            $userId = $pdo->lastInsertId();
            echo "Created new user: {$acc['email']} (ID: {$userId}, Role: {$acc['role']})\n";
        }

        // サブスクリプション (無期限全アクセス権) の付与
        $subStmt = $pdo->prepare("SELECT id FROM subscriptions WHERE user_id = ?");
        $subStmt->execute([$userId]);
        $hasSub = $subStmt->fetch();

        if ($hasSub) {
            $updSub = $pdo->prepare("UPDATE subscriptions SET target_tool = 'all', plan_tier = 'permanent_staff', status = 'active', current_period_end = 2051193600 WHERE user_id = ?");
            $updSub->execute([$userId]);
        } else {
            $insSub = $pdo->prepare("INSERT INTO subscriptions (user_id, target_tool, plan_tier, status, current_period_end) VALUES (?, 'all', 'permanent_staff', 'active', 2051193600)");
            $insSub->execute([$userId]);
        }

        // マジックリンクトークンの生成 (有効期限: 30日間)
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $tokenStmt = $pdo->prepare("INSERT INTO magic_links (user_id, token, redirect_to, expires_at) VALUES (?, ?, 'https://app.mdo3.com/', ?)");
        $tokenStmt->execute([$userId, $token, $expiresAt]);

        $magicUrl = "https://app.mdo3.com/api/verify_magic_link.php?token=" . $token;
        $magicLinkResults[] = [
            'email' => $acc['email'],
            'role' => $acc['role'],
            'url' => $magicUrl,
            'expires' => $expiresAt
        ];
    }

    echo "\n========================================================\n";
    echo " MAGIC LINK GENERATION RESULTS (Valid for 30 days)\n";
    echo "========================================================\n";
    foreach ($magicLinkResults as $res) {
        echo "Email  : {$res['email']} ({$res['role']})\n";
        echo "URL    : {$res['url']}\n";
        echo "Expires: {$res['expires']}\n";
        echo "--------------------------------------------------------\n";
    }
    echo "All migrations and accounts successfully set up!\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
