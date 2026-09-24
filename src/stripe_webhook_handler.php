<?php
/**
 * src/stripe_webhook_handler.php
 * 
 * mdo3 Stripe Webhook イベント処理コアモジュール
 * - 対象イベント:
 *   - checkout.session.completed (新規決済完了 & サブスク開始)
 *   - customer.subscription.updated (期間更新・プラン変更)
 *   - customer.subscription.deleted (解約完了)
 *   - invoice.payment_failed (決済失敗・要カード更新)
 */

require_once __DIR__ . '/auth_sso.php';

function handleStripeWebhookPayload($payload, $sigHeader) {
    $webhookSecret = getenv('STRIPE_WEBHOOK_SECRET');
    $stripeSecretKey = getenv('STRIPE_SECRET_KEY');
    if ((!$webhookSecret || !$stripeSecretKey) && file_exists(__DIR__ . '/../.env')) {
        $env = parse_ini_file(__DIR__ . '/../.env');
        $webhookSecret = $webhookSecret ?: ($env['STRIPE_WEBHOOK_SECRET'] ?? '');
        $stripeSecretKey = $stripeSecretKey ?: ($env['STRIPE_SECRET_KEY'] ?? '');
    }

    $event = null;

    // 署名手動検証 (SDK非依存・軽量セキュア実装)
    $items = explode(',', $sigHeader);
    $timestamp = null;
    $signatures = [];
    foreach ($items as $item) {
        $parts = explode('=', trim($item), 2);
        if (count($parts) === 2) {
            if ($parts[0] === 't') $timestamp = $parts[1];
            if ($parts[0] === 'v1') $signatures[] = $parts[1];
        }
    }

    if (!$timestamp || empty($signatures)) {
        http_response_code(400);
        return ['status' => 'bad_signature_header'];
    }

    $signedPayload = $timestamp . '.' . $payload;
    $expectedSignature = hash_hmac('sha256', $signedPayload, $webhookSecret);

    $verified = false;
    foreach ($signatures as $sig) {
        if (hash_equals($expectedSignature, $sig)) {
            $verified = true;
            break;
        }
    }

    if (!$verified) {
        http_response_code(400);
        return ['status' => 'signature_verification_failed'];
    }

    $event = json_decode($payload, true);
    if (!$event || !isset($event['type'])) {
        http_response_code(400);
        return ['status' => 'invalid_json'];
    }

    $pdo = MDO3_Auth::getPDO();
    $type = $event['type'];
    $data = $event['data']['object'];

    switch ($type) {
        case 'checkout.session.completed':
            $userId = (int)($data['client_reference_id'] ?? 0);
            $customerId = $data['customer'] ?? '';
            $subId = $data['subscription'] ?? null;
            $meta = $data['metadata'] ?? [];
            $planKey = $meta['plan_key'] ?? 'all_access_monthly';
            $targetTool = $meta['target_tool'] ?? 'all';

            if ($userId > 0) {
                // サブスクリプションテーブルのupsert
                $stmt = $pdo->prepare("SELECT id FROM subscriptions WHERE user_id = ? AND target_tool = ?");
                $stmt->execute([$userId, $targetTool]);
                $existing = $stmt->fetch();

                if ($existing) {
                    $upd = $pdo->prepare("UPDATE subscriptions SET 
                        stripe_customer_id = ?, 
                        stripe_subscription_id = ?, 
                        plan_tier = ?, 
                        status = 'active', 
                        updated_at = NOW() 
                        WHERE id = ?");
                    $upd->execute([$customerId, $subId, $planKey, $existing['id']]);
                } else {
                    $ins = $pdo->prepare("INSERT INTO subscriptions 
                        (user_id, target_tool, plan_tier, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())");
                    $ins->execute([$userId, $targetTool, $planKey, $customerId, $subId]);
                }
            }
            break;

        case 'customer.subscription.updated':
            $subId = $data['id'] ?? '';
            $status = $data['status'] ?? 'active';
            $currentPeriodEnd = isset($data['current_period_end']) ? (int)$data['current_period_end'] : null;

            $upd = $pdo->prepare("UPDATE subscriptions SET 
                status = ?, 
                current_period_end = ?, 
                updated_at = NOW() 
                WHERE stripe_subscription_id = ?");
            $upd->execute([$status, $currentPeriodEnd, $subId]);
            break;

        case 'customer.subscription.deleted':
            $subId = $data['id'] ?? '';
            $upd = $pdo->prepare("UPDATE subscriptions SET 
                status = 'canceled', 
                updated_at = NOW() 
                WHERE stripe_subscription_id = ?");
            $upd->execute([$subId]);
            break;

        case 'invoice.payment_failed':
            $subId = $data['subscription'] ?? '';
            if ($subId) {
                $upd = $pdo->prepare("UPDATE subscriptions SET 
                    status = 'past_due', 
                    updated_at = NOW() 
                    WHERE stripe_subscription_id = ?");
                $upd->execute([$subId]);
            }
            break;
    }

    http_response_code(200);
    return ['status' => 'success', 'event' => $type];
}
