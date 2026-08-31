<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Step 4 config provider.
 *
 * V1 Step 4 intentionally reads the bundled snapshot only.
 * Remote GitHub sync/cache is reserved for Step 6.
 */
class THMT_Banner_Config {
    const BASELINE = 'V9_LOCKED';

    /**
     * Return validated config array or a disabled fallback.
     *
     * @return array
     */
    public static function get() {
        static $config = null;

        if ( null !== $config ) {
            return $config;
        }

        $path = THMT_BANNER_SYSTEM_DIR . 'config/banners.json';
        $raw  = is_readable( $path ) ? file_get_contents( $path ) : false;
        $data = is_string( $raw ) ? json_decode( $raw, true ) : null;

        if ( ! self::is_valid_snapshot( $data ) ) {
            $config = array(
                'system' => array( 'enabled' => false ),
                'layout' => array( 'baseline' => self::BASELINE ),
                'brands' => array(),
            );
            return $config;
        }

        /**
         * Filter the in-memory banner config.
         *
         * Step 6 may replace this provider with remote cached config while
         * keeping the renderer contract unchanged.
         */
        $config = apply_filters( 'thmt_banner_config', $data );

        return is_array( $config ) ? $config : $data;
    }

    /**
     * Asset root for paths declared in banners.json.
     *
     * @return string
     */
    public static function asset_base_url() {
        $default = 'https://raw.githubusercontent.com/meomeo40225/seo1-banner-system-wukong/main/';
        return trailingslashit( apply_filters( 'thmt_banner_asset_base_url', $default ) );
    }

    /**
     * Resolve a repository-relative asset path to an absolute URL.
     *
     * @param string $relative_path Relative path from repository root.
     * @return string
     */
    public static function resolve_asset_url( $relative_path ) {
        $relative_path = ltrim( (string) $relative_path, '/' );
        $segments      = array_filter( explode( '/', $relative_path ), 'strlen' );
        $encoded       = array_map( 'rawurlencode', $segments );

        return self::asset_base_url() . implode( '/', $encoded );
    }

    /**
     * Debug badges are off in production unless explicitly enabled.
     *
     * @return bool
     */
    public static function debug_enabled() {
        $constant = defined( 'THMT_BANNER_DEBUG' ) && THMT_BANNER_DEBUG;
        return (bool) apply_filters( 'thmt_banner_debug_enabled', $constant );
    }

    /**
     * @param mixed $data Decoded JSON.
     * @return bool
     */
    private static function is_valid_snapshot( $data ) {
        if ( ! is_array( $data ) ) {
            return false;
        }

        if ( empty( $data['system'] ) || empty( $data['layout'] ) || empty( $data['brands'] ) ) {
            return false;
        }

        if ( self::BASELINE !== ( $data['layout']['baseline'] ?? '' ) ) {
            return false;
        }

        if ( 14 !== count( $data['brands'] ) ) {
            return false;
        }

        return true;
    }
}
