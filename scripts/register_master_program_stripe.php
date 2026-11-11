<?php
/**
 * scripts/register_master_program_stripe.php
 * 
 * ARCHITREND ZERO 構造計算 実務マスタープログラム
 * 1. 【動画マスター＆受講生コミュニティ】年額 100,000円 (税込)
 * 2. 【案件スポット質疑チケット】1回 50,000円 (税込)
 * 
 * Stripe Product, Price, and Payment Link 自動発行スクリプト
 */

$stripeSecretKey = getenv('STRIPE_SECRET_KEY');
if (!$stripeSecretKey) {
    $envPaths = [
        __DIR__ . '/../.env',
        '/home/mdo3/mdo3.com/public_html/app/.env',
        '/home/mdo3/mdo3.com/public_html/.env',
        dirname(__DIR__) . '/.env'
    ];
    foreach ($envPaths as $ep) {
        if (file_exists($ep)) {
            $lines = file($ep, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), 'STRIPE_SECRET_KEY=') === 0) {
                    $stripeSecretKey = trim(substr(trim($line), strlen('STRIPE_SECRET_KEY=')));
                    break 2;
                }
            }
        }
    }
}

if (!$stripeSecretKey) {
    die("Error: STRIPE_SECRET_KEY could not be located.\n");
}

function stripeApi($endpoint, $method = 'GET', $data = []) {
    global $stripeSecretKey;
    $ch = curl_init('https://api.stripe.com/v1/' . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    }
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $httpCode, 'data' => json_decode($res, true)];
}

echo "========================================================\n";
echo " Master Program Stripe Register (100k Video & 50k Ticket)\n";
echo "========================================================\n";

$results = [];

// ==========================================
// 1. 動画マスター＆受講生コミュニティ（年額10万円 税込）
// ==========================================
$prod1Name = 'ARCHITREND ZERO 構造計算【動画マスター＆受講生コミュニティ】';
$prod1Desc = '全23レッスン実況解説動画1年間見放題 ＋ mdo3全31ツール1年間使い放題 ＋ 受講生限定コミュニティ掲示板参加権（差額40万円でOJTへ移行可能）';

// 商品検索または作成
$p1Res = stripeApi('products', 'POST', [
    'name'        => $prod1Name,
    'description' => $prod1Desc,
    'metadata'    => ['type' => 'master_program', 'plan' => 'video_annual']
]);
if ($p1Res['status'] !== 200) {
    die("Error creating product 1: " . json_encode($p1Res['data']) . "\n");
}
$prod1Id = $p1Res['data']['id'];
echo "[1] Product 1 Created: {$prod1Name} ({$prod1Id})\n";

// 年額100,000円 サブスクリプション価格作成
$price1Res = stripeApi('prices', 'POST', [
    'product'     => $prod1Id,
    'unit_amount' => 100000,
    'currency'    => 'jpy',
    'recurring'   => ['interval' => 'year'],
    'metadata'    => ['plan' => 'master_video_annual']
]);
if ($price1Res['status'] !== 200) {
    die("Error creating price 1: " . json_encode($price1Res['data']) . "\n");
}
$price1Id = $price1Res['data']['id'];
echo "    -> Price ID: {$price1Id} (100,000 JPY / year)\n";

// Payment Link 1 作成
$pl1Res = stripeApi('payment_links', 'POST', [
    'line_items' => [
        [
            'price' => $price1Id,
            'quantity' => 1
        ]
    ],
    'after_completion' => [
        'type' => 'redirect',
        'redirect' => [
            'url' => 'https://mdo3.com/master_dashboard.html?payment=success&plan=video_annual'
        ]
    ],
    'billing_address_collection' => 'required',
    'metadata' => ['plan' => 'master_video_annual']
]);
$pl1Url = $pl1Res['data']['url'] ?? null;
echo "    -> Payment Link URL: {$pl1Url}\n";

// ==========================================
// 2. 案件スポット質疑チケット（1案件50,000円 税込・単発）
// ==========================================
$prod2Name = 'ARCHITREND ZERO 構造計算【案件スポット質疑チケット】';
$prod2Desc = '民間審査機関からの指摘・質疑に対する是正方針・補正回答書の書き方直接助言（1案件）。丸投げ不可・ギブアップ保証対象外。';

// 商品作成
$p2Res = stripeApi('products', 'POST', [
    'name'        => $prod2Name,
    'description' => $prod2Desc,
    'metadata'    => ['type' => 'master_program', 'plan' => 'ticket_spot']
]);
if ($p2Res['status'] !== 200) {
    die("Error creating product 2: " . json_encode($p2Res['data']) . "\n");
}
$prod2Id = $p2Res['data']['id'];
echo "[2] Product 2 Created: {$prod2Name} ({$prod2Id})\n";

// 50,000円 単発価格作成
$price2Res = stripeApi('prices', 'POST', [
    'product'     => $prod2Id,
    'unit_amount' => 50000,
    'currency'    => 'jpy',
    'metadata'    => ['plan' => 'master_ticket_spot']
]);
if ($price2Res['status'] !== 200) {
    die("Error creating price 2: " . json_encode($price2Res['data']) . "\n");
}
$price2Id = $price2Res['data']['id'];
echo "    -> Price ID: {$price2Id} (50,000 JPY / one-time)\n";

// Payment Link 2 作成
$pl2Res = stripeApi('payment_links', 'POST', [
    'line_items' => [
        [
            'price' => $price2Id,
            'quantity' => 1
        ]
    ],
    'after_completion' => [
        'type' => 'redirect',
        'redirect' => [
            'url' => 'https://mdo3.com/master_dashboard.html?payment=success&plan=ticket_spot'
        ]
    ],
    'billing_address_collection' => 'required',
    'metadata' => ['plan' => 'master_ticket_spot']
]);
$pl2Url = $pl2Res['data']['url'] ?? null;
echo "    -> Payment Link URL: {$pl2Url}\n";

// 結果をJSON出力
$outData = [
    'video_annual' => [
        'product_id' => $prod1Id,
        'price_id'   => $price1Id,
        'amount'     => 100000,
        'payment_url'=> $pl1Url
    ],
    'ticket_spot' => [
        'product_id' => $prod2Id,
        'price_id'   => $price2Id,
        'amount'     => 50000,
        'payment_url'=> $pl2Url
    ]
];
file_put_contents(__DIR__ . '/stripe_master_output.json', json_encode($outData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
echo "\nSaved results to scripts/stripe_master_output.json\n";

