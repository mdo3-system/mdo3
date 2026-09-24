<?php
/**
 * public/api/create_checkout_session.php
 * 
 * mdo3 Stripe Checkout Session 作成 API
 * - ドメイン共通クッキー (mdo3_session_token) による認証チェック
 * - 4大料金プラン対応 (個別980円、カテゴリ1,980円、全ツール3,980円/月、全ツール39,800円/年)
 */

header('Content-Type: application/json; charset=UTF-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

require_once __DIR__ . '/../src/auth_sso.php';
$stripePlans = require __DIR__ . '/../config/stripe_plans.php';

$stripeSecretKey = getenv('STRIPE_SECRET_KEY');
if (!$stripeSecretKey && file_exists(__DIR__ . '/../../.env')) {
    $env = parse_ini_file(__DIR__ . '/../../.env');
    $stripeSecretKey = $env['STRIPE_SECRET_KEY'] ?? null;
}

// ログインユーザーの取得
$currentUser = MDO3_Auth::getCurrentUser();

if (!$currentUser) {
    echo json_encode([
        'success'     => false,
        'error'       => 'unauthorized',
        'message'     => 'お申込みにはログインが必要です。ログイン後に再度お試しください。',
        'redirect_url'=> 'https://app.mdo3.com/login'
    ]);
    exit;
}

$planKey = $_GET['plan'] ?? $_POST['plan'] ?? 'all_access_monthly';
$targetTool = $_GET['tool'] ?? $_POST['tool'] ?? 'all';

if (!isset($stripePlans[$planKey])) {
    echo json_encode([
        'success' => false,
        'error'   => 'invalid_plan',
        'message' => '指定された料金プランが存在しません。'
    ]);
    exit;
}

$targetPlan = $stripePlans[$planKey];

try {
    $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');
    curl_setopt($ch, CURLOPT_POST, true);

    $postData = [
        'mode'                   => 'subscription',
        'customer_email'         => $currentUser['email'],
        'client_reference_id'    => (string)$currentUser['id'],
        'success_url'            => 'https://app.mdo3.com/portal.php?session_id={CHECKOUT_SESSION_ID}&payment=success',
        'cancel_url'             => 'https://mdo3.com/#pricingPlans',
        'line_items[0][price]'   => $targetPlan['price_id'],
        'line_items[0][quantity]'=> 1,
        'payment_method_types[0]'=> 'card',
        'payment_method_types[1]'=> 'customer_balance',
        'payment_method_options[customer_balance][funding_type]' => 'bank_transfer',
        'payment_method_options[customer_balance][bank_transfer][type]' => 'jp_bank_transfer',
        'metadata[user_id]'      => (string)$currentUser['id'],
        'metadata[plan_key]'     => $planKey,
        'metadata[target_tool]'  => $targetTool
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $resData = json_decode($response, true);

    if ($httpCode === 200 && isset($resData['url'])) {
        echo json_encode([
            'success'    => true,
            'url'        => $resData['url'],
            'session_id' => $resData['id']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error'   => 'stripe_error',
            'message' => $resData['error']['message'] ?? 'Stripe決済セッションの発行に失敗しました。'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error'   => 'server_error',
        'message' => $e->getMessage()
    ]);
}
