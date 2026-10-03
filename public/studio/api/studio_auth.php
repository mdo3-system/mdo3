<?php
/**
 * public/studio/api/studio_auth.php
 * mdo3 STUDIO 専用 認証＆マジックリンク発行 API
 */

header('Content-Type: application/json; charset=utf-8');
$authPath = __DIR__ . '/../../src/auth_sso.php';
if (!file_exists($authPath)) {
    $authPath = __DIR__ . '/../../../src/auth_sso.php';
}
require_once $authPath;

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: $_POST;
$action = $_GET['action'] ?? $input['action'] ?? $_POST['action'] ?? 'check';

// 1. 認証状態チェック
if ($action === 'check') {
    $user = MDO3_Auth::getCurrentUser();
    if ($user && ($user['role'] === 'admin' || $user['status'] === 'active')) {
        echo json_encode([
            'authenticated' => true,
            'user' => [
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role']
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        'authenticated' => false,
        'message' => 'STUDIOは管理者・運用専用です。ログインしてください。'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. マジックリンク発行＆送信
if ($action === 'request_magic_link') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $email = trim($input['email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => '有効なメールアドレスを入力してください。'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {
        $pdo = MDO3_Auth::getPDO();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => false, 'error' => '登録されていないメールアドレスです。'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // マジックリンクトークン発行 (有効期間 60分)
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+60 minutes'));
        $redirectTo = 'https://mdo3.com/studio/';

        $ins = $pdo->prepare("INSERT INTO magic_links (user_id, token, redirect_to, expires_at) VALUES (?, ?, ?, ?)");
        $ins->execute([$user['id'], $token, $redirectTo, $expiresAt]);

        $magicUrl = "https://mdo3.com/api/verify_magic_link.php?token={$token}";

        // メール送信 (管理者宛て)
        $subject = "【mdo3 STUDIO】ログイン・認証用マジックリンク";
        $body = "菅原様\n\nmdo3 STUDIO (動画・SNS制作スタジオ) へのログインリクエストを受け付けました。\n\n以下のリンクをクリックしてSTUDIOへアクセスしてください：\n{$magicUrl}\n\n※このリンクは60分間有効です。\n※本メールに心当たりがない場合は破棄してください。\n\n---\nmdo3.com 運営管理システム";
        $headers = "From: mdo3 システム <noreply@mdo3.com>\r\nReply-To: info@t-smile.co.jp\r\nContent-Type: text/plain; charset=UTF-8";

        @mb_send_mail($email, $subject, $body, $headers);

        echo json_encode([
            'success' => true,
            'message' => "認証用マジックリンクを {$email} 宛てに送信しました。メールをご確認ください。",
            'debug_url' => ($user['role'] === 'admin') ? $magicUrl : null // 管理者即時検証用
        ], JSON_UNESCAPED_UNICODE);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => '認証処理中にエラーが発生しました: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// 3. 管理者クイック認証 (PIN / 秘密キー認証)
if ($action === 'quick_auth') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $passcode = trim($input['passcode'] ?? '');

    // 管理者PIN または マスターパス
    $validPins = ['2656', 'mdo3studio2026', 'tsmile'];

    if (in_array($passcode, $validPins, true)) {
        try {
            $pdo = MDO3_Auth::getPDO();
            $stmt = $pdo->prepare("SELECT * FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
            $stmt->execute();
            $adminUser = $stmt->fetch();

            if (!$adminUser) {
                // 初期管理者が未登録の場合は自動取得または新規
                $stmt2 = $pdo->query("SELECT * FROM users LIMIT 1");
                $adminUser = $stmt2->fetch();
            }

            if ($adminUser) {
                // 既存セッションを削除（単一端末制限）
                $delOld = $pdo->prepare("DELETE FROM sessions WHERE user_id = ?");
                $delOld->execute([$adminUser['id']]);

                // セッショントークン発行
                $sessionToken = bin2hex(random_bytes(64));
                $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
                $ip = $_SERVER['REMOTE_ADDR'] ?? null;
                $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

                $sessStmt = $pdo->prepare("INSERT INTO sessions (session_token, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)");
                $sessStmt->execute([$sessionToken, $adminUser['id'], $ip, $ua, $expiresAt]);

                // ドメイン共通クッキー (.mdo3.com) 発行
                setcookie(MDO3_Auth::COOKIE_NAME, $sessionToken, [
                    'expires'  => time() + (30 * 86400),
                    'path'     => '/',
                    'domain'   => MDO3_Auth::COOKIE_DOMAIN,
                    'secure'   => true,
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]);

                echo json_encode([
                    'success' => true,
                    'message' => '管理者認証に成功しました。STUDIOへようこそ！',
                    'user'    => [
                        'name'  => $adminUser['name'],
                        'email' => $adminUser['email']
                    ]
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'DB接続エラー: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    echo json_encode(['success' => false, 'error' => '認証コードが正しくありません。'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['error' => 'Invalid action'], JSON_UNESCAPED_UNICODE);
