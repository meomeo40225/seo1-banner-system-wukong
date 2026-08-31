<?php
/**
 * Plugin Name: THMT Banner System
 * Description: Central GitHub-driven V9 banner renderer with rotation and resilient config caching.
 * Version: 0.6.0
 * Author: THMT
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: thmt-banner-system
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'THMT_BANNER_SYSTEM_VERSION', '0.6.0' );
define( 'THMT_BANNER_SYSTEM_FILE', __FILE__ );
define( 'THMT_BANNER_SYSTEM_DIR', plugin_dir_path( __FILE__ ) );
define( 'THMT_BANNER_SYSTEM_URL', plugin_dir_url( __FILE__ ) );

require_once THMT_BANNER_SYSTEM_DIR . 'includes/class-thmt-banner-config.php';
require_once THMT_BANNER_SYSTEM_DIR . 'includes/class-thmt-banner-renderer.php';

THMT_Banner_Config::register();

register_activation_hook( __FILE__, array( 'THMT_Banner_Config', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'THMT_Banner_Config', 'deactivate' ) );

/**
 * Boot the frontend renderer after plugins are loaded.
 */
function thmt_banner_system_boot() {
    $renderer = new THMT_Banner_Renderer();
    $renderer->register();
}
add_action( 'plugins_loaded', 'thmt_banner_system_boot' );
