<?php

define( 'ABSPATH', __DIR__ . '/' );
define( 'DAY_IN_SECONDS', 86400 );
define( 'THMT_BANNER_SYSTEM_VERSION', 'test' );

function wp_parse_url( $url ) {
    return parse_url( $url );
}

require_once __DIR__ . '/../plugin/thmt-banner-system/includes/class-thmt-banner-config.php';

$root = dirname( __DIR__ );
$config = json_decode( file_get_contents( $root . '/config/banners.json' ), true );

function check( $condition, $message ) {
    if ( ! $condition ) {
        fwrite( STDERR, "FAIL: {$message}\n" );
        exit( 1 );
    }
}

check( THMT_Banner_Config::validate_candidate( $config ), 'bundled root config should validate' );
check( 300 === THMT_Banner_Config::sync_interval_seconds( $config ), 'sync interval should be 300 seconds' );

$future = $config;
$new = $future['brands'][0];
$new['id'] = 'brand15';
$new['name'] = 'Brand 15';
$new['url'] = 'https://example.com/brand15';
foreach ( array( 'horizontal', 'vertical', 'middle' ) as $kind ) {
    $new['assets'][ $kind ]['file'] = str_replace( 'assets/tot/', 'assets/brand15/', $new['assets'][ $kind ]['file'] );
}
$future['brands'][] = $new;
check( 15 === count( $future['brands'] ), 'future fixture must contain 15 brands' );
check( THMT_Banner_Config::validate_candidate( $future ), 'future brand should not require plugin rebuild' );

$bad = $config;
$bad['layout']['baseline'] = 'V10';
check( ! THMT_Banner_Config::validate_candidate( $bad ), 'non-V9 baseline must fail' );

$bad = $config;
$bad['brands'][0]['assets']['horizontal']['file'] = '../evil.gif';
check( ! THMT_Banner_Config::validate_candidate( $bad ), 'unsafe asset path must fail' );

$bad = $config;
$bad['brands'][0]['url'] = 'javascript:alert(1)';
check( ! THMT_Banner_Config::validate_candidate( $bad ), 'non-http brand URL must fail' );

$bad = $config;
$bad['brands'][1]['id'] = $bad['brands'][0]['id'];
check( ! THMT_Banner_Config::validate_candidate( $bad ), 'duplicate brand ids must fail' );

$fast = $config;
$fast['system']['github_sync_interval_seconds'] = 1;
check( 60 === THMT_Banner_Config::sync_interval_seconds( $fast ), 'sync interval clamp minimum must be 60 seconds' );

$slow = $config;
$slow['system']['github_sync_interval_seconds'] = 999999;
check( 86400 === THMT_Banner_Config::sync_interval_seconds( $slow ), 'sync interval clamp maximum must be one day' );

echo "PASS: Step 6 config validation + future-brand support + sync interval policy.\n";
