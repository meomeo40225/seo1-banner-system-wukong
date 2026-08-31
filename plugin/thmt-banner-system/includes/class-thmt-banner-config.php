<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Central GitHub config provider.
 *
 * Performance v0.7 uses stale-while-revalidate: frontend requests always use
 * local state immediately. Network refreshes happen only in WP-Cron.
 */
class THMT_Banner_Config {
    const BASELINE          = 'V9_LOCKED';
    const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/meomeo40225/seo1-banner-system-wukong/main/config/banners.json';

    const TRANSIENT_CONFIG = 'thmt_banner_config_cache_v1';
    const TRANSIENT_LOCK   = 'thmt_banner_config_sync_lock_v1';
    const OPTION_LAST_GOOD = 'thmt_banner_last_good_config_v1';
    const OPTION_META      = 'thmt_banner_sync_meta_v1';

    const CRON_HOOK       = 'thmt_banner_sync_config';
    const REFRESH_HOOK    = 'thmt_banner_refresh_config_once';
    const CRON_SCHEDULE   = 'thmt_banner_every_five_minutes';
    const CRON_INTERVAL   = 300;

    /** @var array|null */
    private static $runtime_config = null;

    /** @var array|null */
    private static $bundled_config = null;

    public static function register() {
        add_filter( 'cron_schedules', array( __CLASS__, 'cron_schedules' ) );
        add_action( self::CRON_HOOK, array( __CLASS__, 'cron_refresh' ) );
        add_action( self::REFRESH_HOOK, array( __CLASS__, 'cron_refresh' ) );
    }

    public static function activate() {
        delete_transient( self::TRANSIENT_CONFIG );
        delete_transient( self::TRANSIENT_LOCK );

        if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
            wp_schedule_event(
                time() + 30,
                self::CRON_SCHEDULE,
                self::CRON_HOOK
            );
        }

        self::schedule_background_refresh( true );
    }

    public static function deactivate() {
        wp_clear_scheduled_hook( self::CRON_HOOK );
        wp_clear_scheduled_hook( self::REFRESH_HOOK );
        delete_transient( self::TRANSIENT_LOCK );
    }

    public static function cron_schedules( $schedules ) {
        $schedules[ self::CRON_SCHEDULE ] = array(
            'interval' => self::CRON_INTERVAL,
            'display'  => 'THMT Banner every five minutes',
        );
        return $schedules;
    }

    public static function cron_refresh() {
        self::refresh_remote( false );
    }

    /**
     * Return config without performing network I/O.
     *
     * Priority: transient -> last-known-good -> bundled snapshot.
     * When stale, a single background refresh is scheduled for WP-Cron.
     *
     * @return array
     */
    public static function get() {
        if ( null !== self::$runtime_config ) {
            return self::$runtime_config;
        }

        $cached = get_transient( self::TRANSIENT_CONFIG );
        if ( self::validate_candidate( $cached ) ) {
            return self::finalize( $cached );
        }

        $candidate = get_option( self::OPTION_LAST_GOOD, array() );
        if ( ! self::validate_candidate( $candidate ) ) {
            $candidate = self::bundled_config();
        }

        if ( self::validate_candidate( $candidate ) ) {
            self::cache_candidate( $candidate );
            self::schedule_background_refresh( false );
            return self::finalize( $candidate );
        }

        self::$runtime_config = array(
            'system' => array( 'enabled' => false ),
            'layout' => array( 'baseline' => self::BASELINE ),
            'brands' => array(),
        );
        return self::$runtime_config;
    }

    /**
     * Queue a one-shot refresh without blocking the visitor response.
     *
     * @param bool $force Schedule regardless of last-check time.
     */
    public static function schedule_background_refresh( $force = false ) {
        $candidate = self::current_candidate();
        $interval  = self::sync_interval_seconds( $candidate );
        $meta      = get_option( self::OPTION_META, array() );

        if ( ! $force && ! self::is_due( $meta, $interval, time() ) ) {
            return;
        }

        if ( ! wp_next_scheduled( self::REFRESH_HOOK ) ) {
            wp_schedule_single_event( time() + 1, self::REFRESH_HOOK );
        }
    }

    /**
     * Network refresh. This method is only called by cron/tests/manual admin code.
     *
     * @param bool $force Ignore sync interval.
     * @return array|null
     */
    public static function refresh_remote( $force = false ) {
        $candidate = self::current_candidate();
        $interval  = self::sync_interval_seconds( $candidate );
        $meta      = get_option( self::OPTION_META, array() );
        $now       = time();

        if ( ! $force && ! self::is_due( $meta, $interval, $now ) ) {
            return $candidate;
        }

        if ( get_transient( self::TRANSIENT_LOCK ) ) {
            return $candidate;
        }

        set_transient( self::TRANSIENT_LOCK, 1, 30 );

        try {
            $headers = array(
                'Accept'        => 'application/json',
                'User-Agent'    => 'THMT-Banner-System/' . THMT_BANNER_SYSTEM_VERSION,
                'Cache-Control' => 'no-cache',
            );

            if ( ! empty( $meta['etag'] ) ) {
                $headers['If-None-Match'] = (string) $meta['etag'];
            }
            if ( ! empty( $meta['last_modified'] ) ) {
                $headers['If-Modified-Since'] = (string) $meta['last_modified'];
            }

            $response = wp_remote_get(
                self::remote_config_url(),
                array(
                    'timeout'     => 4,
                    'redirection' => 2,
                    'headers'     => $headers,
                )
            );

            if ( is_wp_error( $response ) ) {
                self::record_failure( $meta, $response->get_error_message(), $now, $candidate, $interval );
                return $candidate;
            }

            $code = (int) wp_remote_retrieve_response_code( $response );

            if ( 304 === $code && self::validate_candidate( $candidate ) ) {
                self::record_success_meta( $response, $meta, $now, 'not_modified' );
                self::cache_candidate( $candidate );
                return $candidate;
            }

            if ( 200 !== $code ) {
                self::record_failure( $meta, 'HTTP ' . $code, $now, $candidate, $interval );
                return $candidate;
            }

            $data = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( ! self::validate_candidate( $data ) ) {
                self::record_failure( $meta, 'Remote JSON failed V9 contract validation', $now, $candidate, $interval );
                return $candidate;
            }

            update_option( self::OPTION_LAST_GOOD, $data, false );
            self::record_success_meta( $response, $meta, $now, 'github' );
            self::cache_candidate( $data );
            self::$runtime_config = null;
            return $data;
        } finally {
            delete_transient( self::TRANSIENT_LOCK );
        }
    }

    public static function invalidate_hot_cache() {
        delete_transient( self::TRANSIENT_CONFIG );
        self::$runtime_config = null;
    }

    public static function remote_config_url() {
        return esc_url_raw(
            apply_filters( 'thmt_banner_remote_config_url', self::REMOTE_CONFIG_URL )
        );
    }

    public static function asset_base_url() {
        $default = 'https://raw.githubusercontent.com/meomeo40225/seo1-banner-system-wukong/main/';
        return trailingslashit( apply_filters( 'thmt_banner_asset_base_url', $default ) );
    }

    /**
     * Base URL for optimized MP4/WebP media.
     * Optional system.media_base_url can point to a CDN/R2 origin later.
     *
     * @param array|null $config Active config.
     * @return string
     */
    public static function media_base_url( $config = null ) {
        $configured = '';
        if ( is_array( $config ) ) {
            $configured = trim( (string) ( $config['system']['media_base_url'] ?? '' ) );
        }

        $candidate_media = 'https://raw.githubusercontent.com/meomeo40225/seo1-banner-system-wukong/step7-performance-engine-v070/';
        $default = $configured ? $configured : $candidate_media;
        return trailingslashit( apply_filters( 'thmt_banner_media_base_url', $default, $config ) );
    }

    public static function debug_enabled() {
        $constant = defined( 'THMT_BANNER_DEBUG' ) && THMT_BANNER_DEBUG;
        return (bool) apply_filters( 'thmt_banner_debug_enabled', $constant );
    }

    public static function performance_profile_override() {
        return (string) apply_filters( 'thmt_banner_performance_profile_override', '' );
    }

    public static function sync_interval_seconds( $config ) {
        $value = is_array( $config )
            ? (int) ( $config['system']['github_sync_interval_seconds'] ?? self::CRON_INTERVAL )
            : self::CRON_INTERVAL;
        return max( 60, min( DAY_IN_SECONDS, $value ) );
    }

    public static function validate_candidate( $data ) {
        if ( ! is_array( $data ) || 1 !== (int) ( $data['schema_version'] ?? 0 ) ) {
            return false;
        }

        $system = $data['system'] ?? null;
        $layout = $data['layout'] ?? null;
        $rules  = $data['asset_rules'] ?? null;
        $brands = $data['brands'] ?? null;

        if ( ! is_array( $system ) || ! is_array( $layout ) || ! is_array( $rules ) || ! is_array( $brands ) || empty( $brands ) ) {
            return false;
        }

        if ( self::BASELINE !== ( $layout['baseline'] ?? '' ) ) {
            return false;
        }

        if ( 'sequential' !== ( $system['rotation_mode'] ?? '' ) ) {
            return false;
        }

        if ( 'contain' !== ( $system['fit_mode'] ?? '' ) || ! empty( $system['allow_hide_controls'] ) ) {
            return false;
        }

        $rotation_interval = (int) ( $system['rotation_interval_seconds'] ?? 0 );
        $sync_interval     = (int) ( $system['github_sync_interval_seconds'] ?? 0 );
        if ( $rotation_interval < 1 || $rotation_interval > DAY_IN_SECONDS || $sync_interval < 1 || $sync_interval > DAY_IN_SECONDS ) {
            return false;
        }

        $media_base = trim( (string) ( $system['media_base_url'] ?? '' ) );
        if ( '' !== $media_base ) {
            $parts  = wp_parse_url( $media_base );
            $scheme = is_array( $parts ) ? strtolower( (string) ( $parts['scheme'] ?? '' ) ) : '';
            $host   = is_array( $parts ) ? (string) ( $parts['host'] ?? '' ) : '';
            if ( 'https' !== $scheme || '' === $host ) {
                return false;
            }
        }

        $expected_layout = array(
            'top'    => array( 'visible_count' => 2, 'position_mode' => 'sticky' ),
            'left'   => array( 'visible_count' => 2, 'position_mode' => 'fixed', 'auto_scale_group' => true ),
            'right'  => array( 'visible_count' => 2, 'position_mode' => 'fixed', 'auto_scale_group' => true ),
            'middle' => array( 'visible_count' => 5, 'position_mode' => 'content' ),
            'bottom' => array( 'visible_count' => 2, 'position_mode' => 'fixed' ),
        );

        foreach ( $expected_layout as $zone => $expected ) {
            if ( ! isset( $layout[ $zone ] ) || ! is_array( $layout[ $zone ] ) ) {
                return false;
            }
            foreach ( $expected as $key => $value ) {
                if ( ! array_key_exists( $key, $layout[ $zone ] ) || $layout[ $zone ][ $key ] !== $value ) {
                    return false;
                }
            }
        }

        if ( empty( $rules['never_stretch'] ) || empty( $rules['never_crop'] ) || empty( $rules['preserve_aspect_ratio'] ) ) {
            return false;
        }

        if ( count( $brands ) > 100 ) {
            return false;
        }

        $seen_ids = array();

        foreach ( $brands as $brand ) {
            if ( ! is_array( $brand ) ) {
                return false;
            }

            $id = (string) ( $brand['id'] ?? '' );
            if ( ! preg_match( '/^[a-z0-9][a-z0-9-]{0,63}$/', $id ) || isset( $seen_ids[ $id ] ) ) {
                return false;
            }
            $seen_ids[ $id ] = true;

            if ( '' === trim( (string) ( $brand['name'] ?? '' ) ) ) {
                return false;
            }

            if ( ! array_key_exists( 'enabled', $brand ) || ! is_bool( $brand['enabled'] ) ) {
                return false;
            }

            $url = trim( (string) ( $brand['url'] ?? '' ) );
            if ( '' !== $url ) {
                $parts  = wp_parse_url( $url );
                $scheme = is_array( $parts ) ? strtolower( (string) ( $parts['scheme'] ?? '' ) ) : '';
                $host   = is_array( $parts ) ? (string) ( $parts['host'] ?? '' ) : '';
                if ( ! in_array( $scheme, array( 'http', 'https' ), true ) || '' === $host ) {
                    return false;
                }
            }

            $assets = $brand['assets'] ?? null;
            if ( ! is_array( $assets ) ) {
                return false;
            }

            foreach ( array( 'horizontal', 'vertical', 'middle' ) as $kind ) {
                $asset = $assets[ $kind ] ?? null;
                if ( ! is_array( $asset ) ) {
                    return false;
                }

                $file          = (string) ( $asset['file'] ?? '' );
                $size          = (string) ( $asset['size'] ?? '' );
                $compatibility = (string) ( $asset['compatibility'] ?? '' );

                if (
                    0 !== strpos( $file, 'assets/' . $id . '/' ) ||
                    false !== strpos( $file, '..' ) ||
                    false !== strpos( $file, '\\' ) ||
                    ! preg_match( '/\.gif$/i', $file )
                ) {
                    return false;
                }

                if ( ! preg_match( '/^[1-9][0-9]{0,4}x[1-9][0-9]{0,4}$/', $size ) ) {
                    return false;
                }

                if ( ! in_array( $compatibility, array( 'exact', 'fallback' ), true ) ) {
                    return false;
                }
            }
        }

        return true;
    }

    private static function bundled_config() {
        if ( null !== self::$bundled_config ) {
            return self::$bundled_config;
        }

        $path = THMT_BANNER_SYSTEM_DIR . 'config/banners.json';
        $raw  = is_readable( $path ) ? file_get_contents( $path ) : false;
        $data = is_string( $raw ) ? json_decode( $raw, true ) : null;

        self::$bundled_config = self::validate_candidate( $data ) ? $data : array();
        return self::$bundled_config;
    }

    private static function current_candidate() {
        $cached = get_transient( self::TRANSIENT_CONFIG );
        if ( self::validate_candidate( $cached ) ) {
            return $cached;
        }

        $last_good = get_option( self::OPTION_LAST_GOOD, array() );
        if ( self::validate_candidate( $last_good ) ) {
            return $last_good;
        }

        return self::bundled_config();
    }

    private static function cache_candidate( $candidate, $ttl = null ) {
        if ( ! self::validate_candidate( $candidate ) ) {
            return;
        }

        $ttl = null === $ttl ? self::sync_interval_seconds( $candidate ) : (int) $ttl;
        set_transient( self::TRANSIENT_CONFIG, $candidate, max( 30, $ttl ) );
    }

    private static function is_due( $meta, $interval, $now ) {
        $last_checked = is_array( $meta ) ? (int) ( $meta['last_checked_at'] ?? 0 ) : 0;
        return $last_checked <= 0 || ( $now - $last_checked ) >= $interval;
    }

    private static function record_success_meta( $response, $meta, $now, $source ) {
        $etag          = wp_remote_retrieve_header( $response, 'etag' );
        $last_modified = wp_remote_retrieve_header( $response, 'last-modified' );

        update_option(
            self::OPTION_META,
            array(
                'last_checked_at' => $now,
                'last_success_at' => $now,
                'source'          => $source,
                'etag'            => $etag ? (string) $etag : (string) ( $meta['etag'] ?? '' ),
                'last_modified'   => $last_modified ? (string) $last_modified : (string) ( $meta['last_modified'] ?? '' ),
                'last_error'      => '',
            ),
            false
        );
    }

    private static function record_failure( $meta, $message, $now, $candidate, $interval ) {
        update_option(
            self::OPTION_META,
            array(
                'last_checked_at' => $now,
                'last_success_at' => (int) ( $meta['last_success_at'] ?? 0 ),
                'source'          => (string) ( $meta['source'] ?? 'fallback' ),
                'etag'            => (string) ( $meta['etag'] ?? '' ),
                'last_modified'   => (string) ( $meta['last_modified'] ?? '' ),
                'last_error'      => sanitize_text_field( (string) $message ),
            ),
            false
        );

        if ( self::validate_candidate( $candidate ) ) {
            self::cache_candidate( $candidate, min( 60, max( 30, (int) $interval ) ) );
        }
    }

    private static function finalize( $data ) {
        $filtered = apply_filters( 'thmt_banner_config', $data );
        self::$runtime_config = self::validate_candidate( $filtered ) ? $filtered : $data;
        return self::$runtime_config;
    }
}
