<?php
/**
 * scripts/update_az_stripe_prices.php
 * AZ斜め壁ツール 新価格 (19,800円/月, 98,000円/年) Stripe登録＆config更新スクリプト
 */

$stripeSecretKey = getenv('STRIPE_SECRET_KEY');
if (!$stripeSecretKey) {
    $envPaths = [
        __DIR__ . '/../.env',
        '/home/mdo3/mdo3.com/public_html/app/.env',
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

echo "=== AZ斜め壁 新価格 Stripe 登録開始 (月額¥19,800 / 年額¥98,000 / サポートQ&A付) ===\n";

// 既存商品 ID 検索
$products = stripeApi('products?limit=100')['data']['data'] ?? [];
$azProduct = null;
foreach ($products as $p) {
    if ($p['name'] === 'AZ斜め壁 構造計算補助Web-CAD (アーキトレンドゼロ連携)' || strpos($p['name'], 'AZ斜め壁') !== false) {
        $azProduct = $p;
        break;
    }
}

if (!$azProduct) {
    echo "Creating new product...\n";
    $createProd = stripeApi('products', 'POST', [
        'name' => 'AZ斜め壁 構造計算補助Web-CAD (アーキトレンドゼロ連携・サポート付)',
        'description' => 'アーキトレンドゼロDXF連携 任意多角形スラブ荷重分配・基礎梁検定・実務サポートQ&A付 (az.mdo3.com)',
        'active' => 'true'
    ]);
    $azProduct = $createProd['data'];
}

$productId = $azProduct['id'];
echo "Product ID: {$productId} ({$azProduct['name']})\n";

// 月額 19,800円 Price 発行
$resMonthly = stripeApi('prices', 'POST', [
    'product' => $productId,
    'unit_amount' => 19800,
    'currency' => 'jpy',
    'recurring' => ['interval' => 'month'],
    'nickname' => 'AZ斜め壁 月額19,800円 (サポートQ&A付)'
]);
$monthlyPriceId = $resMonthly['data']['id'] ?? null;
echo "New Monthly Price: {$monthlyPriceId} (¥19,800/mo)\n";

// 年額 98,000円 Price 発行
$resAnnual = stripeApi('prices', 'POST', [
    'product' => $productId,
    'unit_amount' => 98000,
    'currency' => 'jpy',
    'recurring' => ['interval' => 'year'],
    'nickname' => 'AZ斜め壁 年額98,000円 (サポートQ&A付)'
]);
$annualPriceId = $resAnnual['data']['id'] ?? null;
echo "New Annual Price: {$annualPriceId} (¥98,000/yr)\n";

if ($monthlyPriceId && $annualPriceId) {
    $plansFile = dirname(__DIR__) . '/config/stripe_plans.php';
    $plans = file_exists($plansFile) ? require($plansFile) : [];
    
    $plans['az_monthly'] = [
        'product_id' => $productId,
        'price_id'   => $monthlyPriceId,
        'amount'     => 19800,
        'interval'   => 'month',
        'nickname'   => 'AZ斜め壁 月額19,800円 (サポートQ&A付)'
    ];
    
    $plans['az_annual'] = [
        'product_id' => $productId,
        'price_id'   => $annualPriceId,
        'amount'     => 98000,
        'interval'   => 'year',
        'nickname'   => 'AZ斜め壁 年額98,000円 (サポートQ&A付)'
    ];

    $content = "<?php\n/**\n * config/stripe_plans.php\n * 自動同期 Stripe プラン定義\n */\nreturn " . var_export($plans, true) . ";\n";
    file_put_contents($plansFile, $content);
    echo "Successfully updated config/stripe_plans.php\n";
}
