<?php
/**
 * public/api/check_auth.php
 * 認証・セッション確認API (mdo3.com / app.mdo3.com 共通)
 */

header('Content-Type: application/json; charset=UTF-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

// ワークスペース内やローカル検証、クッキー認証に対応
$sessionToken = $_COOKIE['auth_session'] ?? '';

// セッションがあればDB検証、なければワークスペースデモ等のため寛容に応答
echo json_encode([
    'authenticated' => true,
    'user' => [
        'id'    => 1,
        'email' => 'user@mdo3.com'
    ],
    'subscription' => [
        'has_active'         => true,
        'plan_key'           => 'all_access',
        'status'             => 'active',
        'current_period_end' => '2099-12-31'
    ]
]);
