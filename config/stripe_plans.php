<?php
/**
 * config/stripe_plans.php
 * 
 * mdo3 構造計算ツール群 確定料金プラン Stripe Price ID 設定
 */

return array (
  'individual_monthly' => 
  array (
    'product_id' => 'prod_VJja1k2YWNc4fk',
    'price_id' => 'price_1UJ6727zvNn4YIGPcDJwPgcj',
    'amount' => 980,
    'interval' => 'month',
    'nickname' => 'ツール個別 月額980円',
  ),
  'category_monthly' => 
  array (
    'product_id' => 'prod_VJjaEKES7KM058',
    'price_id' => 'price_1UJ6737zvNn4YIGPmHGlOdlw',
    'amount' => 1980,
    'interval' => 'month',
    'nickname' => 'カテゴリ別パック 月額1,980円',
  ),
  'all_access_monthly' => 
  array (
    'product_id' => 'prod_VJja7rOid3RbLX',
    'price_id' => 'price_1UJ6737zvNn4YIGPJGIAemxf',
    'amount' => 3980,
    'interval' => 'month',
    'nickname' => '全ツール使い放題 月額3,980円',
  ),
  'all_access_annual' => 
  array (
    'product_id' => 'prod_VJja7rOid3RbLX',
    'price_id' => 'price_1UJ6747zvNn4YIGPt6vEmmpD',
    'amount' => 39800,
    'interval' => 'year',
    'nickname' => '全ツール使い放題 年額39,800円 (実質2ヶ月無料)',
  ),
  'az_monthly' => 
  array (
    'product_id' => 'prod_VJohqODBX6ohE7',
    'price_id' => 'price_1UJB417zvNn4YIGP4CSL2j0M',
    'amount' => 5980,
    'interval' => 'month',
    'nickname' => 'AZ斜め壁 月額5,980円',
  ),
  'az_annual' => 
  array (
    'product_id' => 'prod_VJohqODBX6ohE7',
    'price_id' => 'price_1UJB417zvNn4YIGPvqElIYG9',
    'amount' => 39800,
    'interval' => 'year',
    'nickname' => 'AZ斜め壁 年額39,800円',
  ),
);
