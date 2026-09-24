<?php
/**
 * scripts/create_stripe_products.php
 * 
 * mdo3 構造計算ツール群 新料金プラン Stripe 商品 & 価格 自動発行スクリプト
 * 
 * 確定料金体系:
 * - ツール個別プラン: 980円 / 月
 * - カテゴリ別パック: 1,980円 / 月
 * - 全ツール使い放題 (月額): 3,980円 / 月
 * - 全ツール使い放題 (年額): 39,800円 / 年
 */

$stripeSecretKey = getenv('STRIPE_SECRET_KEY');
if (!$stripeSecretKey && file_exists(__DIR__ . '/../.env')) {
    $env = parse_ini_file(__DIR__ . '/../.env');
    $stripeSecretKey = $env['STRIPE_SECRET_KEY'] ?? null;
}
if (!$stripeSecretKey) {
    die("Error: STRIPE_SECRET_KEY is not set.\n");
}

function stripeRequest($endpoint, $method = 'GET', $data = []) {
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
    $json = json_decode($res, true);
    return ['status' => $httpCode, 'data' => $json];
}

echo "========================================================\n";
echo " mdo3 Stripe Products & Prices Initializer (Livemode)\n";
echo "========================================================\n\n";

// 既存商品リストの取得
$existingProducts = stripeRequest('products?limit=50')['data']['data'] ?? [];
$productMap = [];
foreach ($existingProducts as $p) {
    if ($p['active']) {
        $productMap[$p['name']] = $p['id'];
    }
}

// 登録定義
$plansToCreate = [
    [
        'product_name' => 'mdo3 構造計算 ツール個別プラン',
        'description'  => '必要な計算ツールを1件選択して利用できる個別月額プラン (980円/月)',
        'prices' => [
            [
                'unit_amount' => 980,
                'currency'    => 'jpy',
                'recurring'   => ['interval' => 'month'],
                'nickname'    => 'ツール個別 月額980円',
                'key'         => 'individual_monthly'
            ]
        ]
    ],
    [
        'product_name' => 'mdo3 構造計算 カテゴリ別パック',
        'description'  => '基礎・擁壁、木造軸組、水平構面など特定カテゴリのツールが使い放題 (1,980円/月)',
        'prices' => [
            [
                'unit_amount' => 1980,
                'currency'    => 'jpy',
                'recurring'   => ['interval' => 'month'],
                'nickname'    => 'カテゴリ別パック 月額1,980円',
                'key'         => 'category_monthly'
            ]
        ]
    ],
    [
        'product_name' => 'mdo3 構造計算 全ツール使い放題 (VIP)',
        'description'  => '全28の専門構造計算ツール＋今後追加される新ツールが完全使い放題のプロフェッショナルプラン',
        'prices' => [
            [
                'unit_amount' => 3980,
                'currency'    => 'jpy',
                'recurring'   => ['interval' => 'month'],
                'nickname'    => '全ツール使い放題 月額3,980円',
                'key'         => 'all_access_monthly'
            ],
            [
                'unit_amount' => 39800,
                'currency'    => 'jpy',
                'recurring'   => ['interval' => 'year'],
                'nickname'    => '全ツール使い放題 年額39,800円 (実質2ヶ月無料)',
                'key'         => 'all_access_annual'
            ]
        ]
    ]
];

$generatedPriceIDs = [];

foreach ($plansToCreate as $plan) {
    $pName = $plan['product_name'];
    $productId = null;

    if (isset($productMap[$pName])) {
        $productId = $productMap[$pName];
        echo "[+] Product exists: '{$pName}' ({$productId})\n";
    } else {
        echo "[*] Creating Product: '{$pName}'...\n";
        $pRes = stripeRequest('products', 'POST', [
            'name'        => $pName,
            'description' => $plan['description'],
            'metadata'    => ['system' => 'mdo3']
        ]);
        if ($pRes['status'] === 200) {
            $productId = $pRes['data']['id'];
            echo "    -> Created successfully: {$productId}\n";
        } else {
            echo "    [ERROR] Failed to create product: " . json_encode($pRes['data']) . "\n";
            continue;
        }
    }

    // 価格の作成
    foreach ($plan['prices'] as $pr) {
        echo "  [*] Creating/Checking Price: {$pr['nickname']} ({$pr['unit_amount']} JPY / {$pr['recurring']['interval']})...\n";
        
        // 既存価格のチェック
        $prList = stripeRequest("prices?product={$productId}&active=true&limit=10")['data']['data'] ?? [];
        $existingPriceId = null;
        foreach ($prList as $ep) {
            if ($ep['unit_amount'] == $pr['unit_amount'] && 
                ($ep['recurring']['interval'] ?? '') == $pr['recurring']['interval']) {
                $existingPriceId = $ep['id'];
                break;
            }
        }

        if ($existingPriceId) {
            echo "      -> Existing Price found: {$existingPriceId}\n";
            $generatedPriceIDs[$pr['key']] = [
                'price_id' => $existingPriceId,
                'amount'   => $pr['unit_amount'],
                'interval' => $pr['recurring']['interval'],
                'nickname' => $pr['nickname']
            ];
        } else {
            $createPriceData = [
                'product'            => $productId,
                'unit_amount'        => $pr['unit_amount'],
                'currency'           => $pr['currency'],
                'recurring[interval]'=> $pr['recurring']['interval'],
                'nickname'           => $pr['nickname'],
                'metadata'           => ['key' => $pr['key']]
            ];
            $priceRes = stripeRequest('prices', 'POST', $createPriceData);
            if ($priceRes['status'] === 200) {
                $newPriceId = $priceRes['data']['id'];
                echo "      -> Created Price successfully: {$newPriceId}\n";
                $generatedPriceIDs[$pr['key']] = [
                    'price_id' => $newPriceId,
                    'amount'   => $pr['unit_amount'],
                    'interval' => $pr['recurring']['interval'],
                    'nickname' => $pr['nickname']
                ];
            } else {
                echo "      [ERROR] Failed to create price: " . json_encode($priceRes['data']) . "\n";
            }
        }
    }
    echo "\n";
}

echo "========================================================\n";
echo " STRIPE NEW PRODUCTS & PRICES CONFIGURATION SUMMARY\n";
echo "========================================================\n";
echo json_encode($generatedPriceIDs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 設定ファイルの雛形出力
$configContent = "<?php\n// Generated Stripe Plans Configuration\nreturn " . var_export($generatedPriceIDs, true) . ";\n";
file_put_contents(__DIR__ . '/../config/stripe_plans.php', $configContent);
echo "[+] Saved configuration to config/stripe_plans.php\n";
