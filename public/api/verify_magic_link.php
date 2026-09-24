<?php
/**
 * public/api/verify_magic_link.php
 * 
 * マジックリンクトークン検証 & SSOクッキー発行エンドポイント
 */
require_once __DIR__ . '/../src/auth_sso.php';

$token = filter_input(INPUT_GET, 'token', FILTER_DEFAULT);

if (!$token) {
    die("エラー: トークンが指定されていません。");
}

$result = MDO3_Auth::verifyMagicLink($token);

if (!$result['success']) {
    echo "<!DOCTYPE html><html lang='ja'><head><meta charset='UTF-8'><title>認証エラー</title></head><body>";
    echo "<div style='max-width:500px;margin:50px auto;padding:20px;border:1px solid #f5c6cb;background:#f8d7da;border-radius:8px;font-family:sans-serif;'>";
    echo "<h2 style='color:#721c24;margin-top:0;'>ログインリンクが無効です</h2>";
    echo "<p>" . htmlspecialchars($result['error'], ENT_QUOTES, 'UTF-8') . "</p>";
    echo "<a href='https://mdo3.com/' style='display:inline-block;padding:10px 20px;background:#0056b3;color:#fff;text-decoration:none;border-radius:4px;'>ポータルトップへ戻る</a>";
    echo "</div></body></html>";
    exit;
}

// 認証成功時、自動リダイレクト
header('Location: ' . $result['redirect_to']);
exit;
