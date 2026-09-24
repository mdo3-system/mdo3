<?php
/**
 * scripts/register_az_stripe_plan.php
 * 
 * AZ斜め壁 構造計算補助Web-CAD (アーキトレンドゼロ連携)
 * Stripe 商品・価格 自動登録スクリプト
 * 
 * 料金:
 * - 月額 5,980円 (税込)
 * - 年額 39,800円 (税込)
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

echo "========================================================\n";
echo " AZ斜め壁 Web-CAD Stripe Product & Prices Register\n";
echo "========================================================\n";

$productName = 'AZ斜め壁 構造計算補助Web-CAD (アーキトレンドゼロ連携)';
$productDesc = 'アーキトレンドゼロ連携 任意多角形スラブの荷重分配・基礎梁検定Web-CADツール (az.mdo3.com)';

// 1. 商品存在確認
$products = stripeApi('products?limit=100')['data']['data'] ?? [];
$productId = null;
foreach ($products as $p) {
    if ($p['name'] === $productName && $p['active']) {
        $productId = $p['id'];
        echo "[+] Found existing product: {$productName} ({$productId})\n";
        break;
    }
}

if (!$productId) {
    echo "[*] Creating product: {$productName}...\n";
    $pRes = stripeApi('products', 'POST', [
        'name'        => $productName,
        'description' => $productDesc,
        'metadata'    => ['system' => 'mdo3', 'tool' => 'az']
    ]);
    if ($pRes['status'] === 200) {
        $productId = $pRes['data']['id'];
        echo "    -> Created Product ID: {$productId}\n";
    } else {
        die("Error creating product: " . json_encode($pRes['data']) . "\n");
    }
}

// 2. 価格定義
$targetPrices = [
    'az_monthly' => [
        'unit_amount' => 5980,
        'currency'    => 'jpy',
        'recurring'   => ['interval' => 'month'],
        'nickname'    => 'AZ斜め壁 月額5,980円'
    ],
    'az_annual' => [
        'unit_amount' => 39800,
        'currency'    => 'jpy',
        'recurring'   => ['interval' => 'year'],
        'nickname'    => 'AZ斜め壁 年額39,800円'
    ]
];

$existingPrices = stripeApi("prices?product={$productId}&active=true&limit=20")['data']['data'] ?? [];
$finalPrices = [];

foreach ($targetPrices as $key => $spec) {
    $foundPriceId = null;
    foreach ($existingPrices as $ep) {
        if ($ep['unit_amount'] == $spec['unit_amount'] && 
            ($ep['recurring']['interval'] ?? '') == $spec['recurring']['interval']) {
            $foundPriceId = $ep['id'];
            echo "[+] Found existing price for {$key}: {$foundPriceId}\n";
            break;
        }
    }

    if (!$foundPriceId) {
        echo "[*] Creating price for {$key} ({$spec['unit_amount']} JPY / {$spec['recurring']['interval']})...\n";
        $prRes = stripeApi('prices', 'POST', [
            'product'             => $productId,
            'unit_amount'         => $spec['unit_amount'],
            'currency'            => $spec['currency'],
            'recurring[interval]' => $spec['recurring']['interval'],
            'nickname'            => $spec['nickname'],
            'metadata'            => ['key' => $key, 'tool' => 'az']
        ]);
        if ($prRes['status'] === 200) {
            $foundPriceId = $prRes['data']['id'];
            echo "    -> Created Price ID: {$foundPriceId}\n";
        } else {
            die("Error creating price for {$key}: " . json_encode($prRes['data']) . "\n");
        }
    }

    $finalPrices[$key] = [
        'product_id' => $productId,
        'price_id'   => $foundPriceId,
        'amount'     => $spec['unit_amount'],
        'interval'   => $spec['recurring']['interval'],
        'nickname'   => $spec['nickname']
    ];
}

// 3. config/stripe_plans.php 更新
$configPath = __DIR__ . '/../config/stripe_plans.php';
$currentConfig = file_exists($configPath) ? require $configPath : [];
foreach ($finalPrices as $k => $v) {
    $currentConfig[$k] = $v;
}

$exportCode = "<?php\n/**\n * config/stripe_plans.php\n * \n * mdo3 構造計算ツール群 確定料金プラン Stripe Price ID 設定\n */\n\nreturn " . var_export($currentConfig, true) . ";\n";
file_put_contents($configPath, $exportCode);
echo "[+] Successfully updated config/stripe_plans.php with AZ plans!\n";
print_r($finalPrices);
