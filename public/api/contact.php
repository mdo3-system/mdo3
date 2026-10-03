<?php
/**
 * public/api/contact.php
 * 
 * mdo3 不具合報告・修正要望・お問い合わせ ハンドラー
 * - 入力バリデーション
 * - 管理者（info@t-smile.co.jp）へのメール通知
 * - data/contact_logs.json へのバックアップ記録
 */

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    $data = $_POST;
}

$type     = trim($data['type'] ?? '不具合報告');
$toolName = trim($data['tool_name'] ?? '未指定');
$name     = trim($data['name'] ?? '');
$email    = trim($data['email'] ?? '');
$message  = trim($data['message'] ?? '');

if (empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'メールアドレスと内容は必須入力項目です。']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '有効なメールアドレスを入力してください。']);
    exit;
}

// ログ記録
$logEntry = [
    'date'       => date('Y-m-d H:i:s'),
    'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'type'       => $type,
    'tool_name'  => $toolName,
    'name'       => $name,
    'email'      => $email,
    'message'    => $message
];

$logDir = __DIR__ . '/../../data';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/contact_logs.json';
$existingLogs = [];
if (file_exists($logFile)) {
    $existingLogs = json_decode(file_get_contents($logFile), true) ?: [];
}
$existingLogs[] = $logEntry;
@file_put_contents($logFile, json_encode($existingLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// メール送信
$to = 'info@t-smile.co.jp';
$subject = "【mdo3 {$type}】{$toolName} ({$name}様)";
$body = "mdo3 不具合報告・修正要望フォームより新しいメッセージを受信しました。\n\n"
      . "----------------------------------------\n"
      . "【日時】: " . date('Y-m-d H:i:s') . "\n"
      . "【種別】: {$type}\n"
      . "【対象ツール】: {$toolName}\n"
      . "【お名前】: {$name}\n"
      . "【メールアドレス】: {$email}\n"
      . "----------------------------------------\n\n"
      . "【内容】:\n{$message}\n\n"
      . "----------------------------------------\n"
      . "※送信元IP: " . ($logEntry['ip']) . "\n";

$headers = "From: no-reply@mdo3.com\r\n"
         . "Reply-To: {$email}\r\n"
         . "X-Mailer: PHP/" . phpversion();

@mb_language('Japanese');
@mb_internal_encoding('UTF-8');
@mb_send_mail($to, $subject, $body, $headers);

echo json_encode([
    'success' => true,
    'message' => 'ご報告・お問い合わせを受け付けました。開発チームにて確認・修正対応を進めてまいります。'
]);
