<?php
/**
 * src/auth_sso.php
 * 
 * mdo3.com 共通SSO (Single Sign-On) 認証共通ライブラリ
 * - ドメイン共通クッキー (Domain=.mdo3.com) によるセッション管理
 * - 全サブドメイン (app.mdo3.com, az.mdo3.com, map.mdo3.com, etc.) 対応
 */

class MDO3_Auth {
    private static $pdo = null;
    const COOKIE_NAME = 'mdo3_session_token';
    const COOKIE_DOMAIN = '.mdo3.com';

    public static function getPDO() {
        if (self::$pdo === null) {
            $host = getenv('DB_HOST') ?: 'localhost';
            $name = getenv('DB_NAME') ?: 'mdo3_toolapp';
            $user = getenv('DB_USER') ?: 'mdo3_toolapp0001';
            $pass = getenv('DB_PASS') ?: 'koki2656@';

            self::$pdo = new PDO("mysql:host={$host};dbname={$name};charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        }
        return self::$pdo;
    }

    /**
     * マジックリンクトークンを検証し、ドメイン共通セッションを発行
     */
    public static function verifyMagicLink($token) {
        $pdo = self::getPDO();
        $now = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("SELECT m.*, u.email, u.name, u.role, u.status 
                               FROM magic_links m 
                               JOIN users u ON m.user_id = u.id 
                               WHERE m.token = ? AND m.expires_at > ? AND m.used_at IS NULL");
        $stmt->execute([$token, $now]);
        $record = $stmt->fetch();

        if (!$record) {
            return ['success' => false, 'error' => '無効または有効期限切れのログインリンクです。'];
        }

        if ($record['status'] !== 'active') {
            return ['success' => false, 'error' => 'アカウントが無効化されています。管理者にお問い合わせください。'];
        }

        // トークンを使用済みに更新
        $upd = $pdo->prepare("UPDATE magic_links SET used_at = ? WHERE id = ?");
        $upd->execute([$now, $record['id']]);

        // 共通セッショントークン生成 (128文字)
        $sessionToken = bin2hex(random_bytes(64));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

        $sessStmt = $pdo->prepare("INSERT INTO sessions (session_token, user_id, ip_address, user_agent, expires_at) 
                                   VALUES (?, ?, ?, ?, ?)");
        $sessStmt->execute([$sessionToken, $record['user_id'], $ip, $ua, $expiresAt]);

        // ドメイン共通クッキーの発行 (.mdo3.com)
        setcookie(self::COOKIE_NAME, $sessionToken, [
            'expires'  => time() + (30 * 86400),
            'path'     => '/',
            'domain'   => self::COOKIE_DOMAIN,
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        // 最終ログイン日時更新
        $lastLog = $pdo->prepare("UPDATE users SET last_login_at = ? WHERE id = ?");
        $lastLog->execute([$now, $record['user_id']]);

        return [
            'success'     => true,
            'user'        => $record,
            'redirect_to' => $record['redirect_to'] ?: 'https://app.mdo3.com/'
        ];
    }

    /**
     * 現在のログインユーザーと有効なサブスクリプションを取得
     */
    public static function getCurrentUser() {
        $token = $_COOKIE[self::COOKIE_NAME] ?? null;
        if (!$token) {
            return null;
        }

        $pdo = self::getPDO();
        $now = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("SELECT u.id, u.email, u.name, u.company, u.role, u.status, s.expires_at as session_expires
                               FROM sessions s
                               JOIN users u ON s.user_id = u.id
                               WHERE s.session_token = ? AND s.expires_at > ?");
        $stmt->execute([$token, $now]);
        $user = $stmt->fetch();

        if (!$user || $user['status'] !== 'active') {
            return null;
        }

        // サブスクリプション認可情報の取得
        $subStmt = $pdo->prepare("SELECT * FROM subscriptions 
                                  WHERE user_id = ? AND status = 'active' 
                                  ORDER BY id DESC");
        $subStmt->execute([$user['id']]);
        $user['subscriptions'] = $subStmt->fetchAll();

        return $user;
    }

    /**
     * 指定ツールの利用権限チェック
     * @param string $tool 'all' または 'app', 'az' 等
     */
    public static function hasAccess($tool = 'all') {
        $user = self::getCurrentUser();
        if (!$user) return false;
        if ($user['role'] === 'admin') return true;

        foreach ($user['subscriptions'] as $sub) {
            if ($sub['target_tool'] === 'all' || $sub['target_tool'] === $tool) {
                return true;
            }
        }
        return false;
    }
}
