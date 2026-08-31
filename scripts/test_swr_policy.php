<?php

define( 'ABSPATH', __DIR__ . '/' );
define( 'DAY_IN_SECONDS', 86400 );
define( 'THMT_BANNER_SYSTEM_VERSION', 'test' );
define( 'THMT_BANNER_SYSTEM_DIR', dirname( __DIR__ ) . '/plugin/thmt-banner-system/' );

$GLOBALS['thmt_test_scheduled'] = 0;
$GLOBALS['thmt_test_transient'] = array();

function add_filter() {}
function add_action() {}
function get_transient( $key ) {
    return $GLOBALS['thmt_test_transient'][ $key ] ?? false;
}
function set_transient( $key, $value, $ttl ) {
    $GLOBALS['thmt_test_transient'][ $key ] = $value;
    return true;
}
function delete_transient( $key ) {
    unset( $GLOBALS['thmt_test_transient'][ $key ] );
}
function get_option( $key, $default = false ) { return $default; }
function update_option() { return true; }
function wp_next_scheduled() { return false; }
function wp_schedule_single_event() {
    $GLOBALS['thmt_test_scheduled']++;
    return true;
}
function wp_schedule_event() { return true; }
function wp_clear_scheduled_hook() { return true; }
function apply_filters( $tag, $value ) { return $value; }
function wp_parse_url( $url ) { return parse_url( $url ); }
function sanitize_text_field( $value ) { return (string) $value; }
function trailingslashit( $value ) { return rtrim( $value, '/' ) . '/'; }
function esc_url_raw( $value ) { return $value; }
function wp_remote_get() {
    throw new RuntimeException( 'wp_remote_get must never run inside frontend get()' );
}

require_once THMT_BANNER_SYSTEM_DIR . 'includes/class-thmt-banner-config.php';

$config = THMT_Banner_Config::get();

if ( ! is_array( $config ) || count( $config['brands'] ?? array() ) !== 14 ) {
    fwrite( STDERR, "FAIL: bundled config was not returned immediately\n" );
    exit( 1 );
}

if ( 1 !== $GLOBALS['thmt_test_scheduled'] ) {
    fwrite( STDERR, "FAIL: stale config should schedule exactly one background refresh\n" );
    exit( 1 );
}

echo "PASS: frontend get() is stale-while-revalidate and performs zero remote HTTP.\n";
