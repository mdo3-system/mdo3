<?php
/**
 * config/stripe_plans.php
 * 
 * mdo3 構造計算ツール群 確定料金プラン Stripe Price ID 設定
 * 発行日: 2026-09-24 (Stripe Livemode 発行済み)
 */

return [
    // ① ツール個別プラン (月額980円)
    'individual_monthly' => [
        'product_id' => 'prod_VJja1k2YWNc4fk',
        'price_id'   => 'price_1UJ6727zvNn4YIGPcDJwPgcj',
        'amount'     => 980,
        'interval'   => 'month',
        'nickname'   => 'ツール個別 月額980円'
    ],

    // ② カテゴリ別パック (月額1,980円)
    'category_monthly' => [
        'product_id' => 'prod_VJjaEKES7KM058',
        'price_id'   => 'price_1UJ6737zvNn4YIGPmHGlOdlw',
        'amount'     => 1980,
        'interval'   => 'month',
        'nickname'   => 'カテゴリ別パック 月額1,980円'
    ],

    // ③ 全ツール使い放題 月額 (月額3,980円)
    'all_access_monthly' => [
        'product_id' => 'prod_VJja7rOid3RbLX',
        'price_id'   => 'price_1UJ6737zvNn4YIGPJGIAemxf',
        'amount'     => 3980,
        'interval'   => 'month',
        'nickname'   => '全ツール使い放題 月額3,980円'
    ],

    // ③ 全ツール使い放題 年額 (年額39,800円 ※2ヶ月分割引)
    'all_access_annual' => [
        'product_id' => 'prod_VJja7rOid3RbLX',
        'price_id'   => 'price_1UJ6747zvNn4YIGPt6vEmmpD',
        'amount'     => 39800,
        'interval'   => 'year',
        'nickname'   => '全ツール使い放題 年額39,800円 (実質2ヶ月無料)'
    ]
];
