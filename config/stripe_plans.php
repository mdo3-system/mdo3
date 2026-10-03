<?php
/**
 * config/stripe_plans.php
 * 
 * mdo3 構造計算ツール群 確定新料金プラン Stripe Price ID 設定 (2026-10-02 全面改定)
 */

return array (
  'individual_monthly' => 
  array (
    'product_id' => 'prod_VJja1k2YWNc4fk',
    'price_id' => 'price_1ULtvs7zvNn4YIGPlOtkIqn9',
    'amount' => 490,
    'interval' => 'month',
    'nickname' => 'ツール個別 月額490円',
  ),
  'core_pack_monthly' => 
  array (
    'product_id' => 'prod_VMdCpGkA8MPngh',
    'price_id' => 'price_1ULtvt7zvNn4YIGPMp25n3eH',
    'amount' => 980,
    'interval' => 'month',
    'nickname' => '基本⑥ツールパック 月額980円',
  ),
  'core_pack_annual' => 
  array (
    'product_id' => 'prod_VMdCpGkA8MPngh',
    'price_id' => 'price_1ULtvt7zvNn4YIGPL92CN0dy',
    'amount' => 10000,
    'interval' => 'year',
    'nickname' => '基本⑥ツールパック 年額10,000円 (実質約2ヶ月お得)',
  ),
  'category_monthly' => 
  array (
    'product_id' => 'prod_VJjaEKES7KM058',
    'price_id' => 'price_1ULtvu7zvNn4YIGPzHqWQG0T',
    'amount' => 980,
    'interval' => 'month',
    'nickname' => 'カテゴリ別パック 月額980円',
  ),
  'all_access_monthly' => 
  array (
    'product_id' => 'prod_VJja7rOid3RbLX',
    'price_id' => 'price_1ULtvu7zvNn4YIGP1ET3658r',
    'amount' => 1980,
    'interval' => 'month',
    'nickname' => '全ツール使い放題 月額1,980円',
  ),
  'all_access_annual' => 
  array (
    'product_id' => 'prod_VJja7rOid3RbLX',
    'price_id' => 'price_1ULtvv7zvNn4YIGPSozGUlfi',
    'amount' => 19800,
    'interval' => 'year',
    'nickname' => '全ツール使い放題 年額19,800円 (実質2ヶ月分無料)',
  ),
  'az_monthly' => 
  array (
    'product_id' => 'prod_VJohqODBX6ohE7',
    'price_id' => 'price_1ULzMQ7zvNn4YIGPrKdzVei5',
    'amount' => 19800,
    'interval' => 'month',
    'nickname' => 'AZ斜め壁 月額19,800円 (サポートQ&A付)',
  ),
  'az_annual' => 
  array (
    'product_id' => 'prod_VJohqODBX6ohE7',
    'price_id' => 'price_1ULzMQ7zvNn4YIGPkSmhZGo2',
    'amount' => 98000,
    'interval' => 'year',
    'nickname' => 'AZ斜め壁 年額98,000円 (サポートQ&A付)',
  ),
);
