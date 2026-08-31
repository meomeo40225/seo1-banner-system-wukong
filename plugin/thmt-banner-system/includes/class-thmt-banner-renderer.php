<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Locked V9 slot renderer.
 *
 * v0.7 renders geometry only. Media is mounted client-side so hidden mobile
 * rails do not download anything and optimized MP4/WebP can be selected.
 */
class THMT_Banner_Renderer {
    /** @var array */
    private $config = array();

    /** @var bool */
    private $middle_injected = false;

    public function register() {
        $this->config = THMT_Banner_Config::get();

        if ( ! $this->enabled() ) {
            return;
        }

        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'wp_footer', array( $this, 'render_global_shell' ), 5 );
        add_filter( 'the_content', array( $this, 'inject_middle_zone' ), 20 );
        add_filter( 'body_class', array( $this, 'body_class' ) );
    }

    public function body_class( $classes ) {
        $classes[] = 'thmt-banner-v9-enabled';
        $classes[] = 'thmt-banner-performance-v070';
        return $classes;
    }

    public function enqueue_assets() {
        if ( is_admin() ) {
            return;
        }

        wp_enqueue_style(
            'thmt-banner-frontend',
            THMT_BANNER_SYSTEM_URL . 'assets/css/frontend.css',
            array(),
            THMT_BANNER_SYSTEM_VERSION
        );

        wp_enqueue_script(
            'thmt-banner-rotation-core',
            THMT_BANNER_SYSTEM_URL . 'assets/js/rotation-core.js',
            array(),
            THMT_BANNER_SYSTEM_VERSION,
            true
        );

        wp_enqueue_script(
            'thmt-banner-frontend',
            THMT_BANNER_SYSTEM_URL . 'assets/js/frontend.js',
            array( 'thmt-banner-rotation-core' ),
            THMT_BANNER_SYSTEM_VERSION,
            true
        );

        wp_localize_script(
            'thmt-banner-frontend',
            'THMTBannerSystem',
            array(
                'version'         => THMT_BANNER_SYSTEM_VERSION,
                'baseline'        => 'V9_LOCKED',
                'config'          => $this->config,
                'assetBaseUrl'    => THMT_Banner_Config::asset_base_url(),
                'mediaBaseUrl'    => THMT_Banner_Config::media_base_url( $this->config ),
                'profileOverride' => THMT_Banner_Config::performance_profile_override(),
                'debug'           => THMT_Banner_Config::debug_enabled(),
                'step'            => 7,
            )
        );
    }

    public function render_global_shell() {
        if ( is_admin() ) {
            return;
        }
        ?>
        <div id="thmt-banner-global" class="thmt-banner-global" data-thmt-baseline="V9_LOCKED" aria-label="Sponsored banners">
            <div id="thmt-banner-top" class="thmt-banner-top-row" data-thmt-mount="top">
                <?php echo $this->render_slot( 'TOP_1', 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'TOP_2', 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </div>

            <aside class="thmt-banner-side-rail thmt-banner-side-left" aria-label="Sponsored banners left">
                <?php echo $this->render_slot( 'LEFT_1', 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'LEFT_2', 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </aside>

            <aside class="thmt-banner-side-rail thmt-banner-side-right" aria-label="Sponsored banners right">
                <?php echo $this->render_slot( 'RIGHT_1', 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'RIGHT_2', 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </aside>

            <div id="thmt-banner-bottom" class="thmt-banner-bottom-row">
                <?php echo $this->render_slot( 'BOTTOM_1', 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'BOTTOM_2', 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </div>
        </div>
        <?php
    }

    public function inject_middle_zone( $content ) {
        if ( $this->middle_injected || is_admin() || is_feed() ) {
            return $content;
        }

        if ( ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
            return $content;
        }

        if ( ! apply_filters( 'thmt_banner_middle_enabled', true ) ) {
            return $content;
        }

        $this->middle_injected = true;
        return $this->insert_after_paragraph( $this->render_middle_zone(), 2, $content );
    }

    private function render_middle_zone() {
        $html  = '<section class="thmt-banner-middle-zone" data-thmt-baseline="V9_LOCKED" aria-label="Sponsored banners">';
        $html .= '<div class="thmt-banner-middle-grid">';

        for ( $i = 0; $i < 5; $i++ ) {
            $html .= $this->render_slot( 'MIDDLE_' . ( $i + 1 ), 'middle' );
        }

        $html .= '</div></section>';
        return $html;
    }

    private function render_slot( $slot_id, $kind ) {
        return sprintf(
            '<div class="thmt-banner-slot thmt-banner-%1$s" data-slot="%2$s" data-kind="%1$s" aria-live="off"></div>',
            esc_attr( sanitize_html_class( $kind ) ),
            esc_attr( $slot_id )
        );
    }

    private function insert_after_paragraph( $insertion, $paragraph_id, $content ) {
        $closing = '</p>';
        $parts   = explode( $closing, $content );

        if ( count( $parts ) <= 1 ) {
            return $content . $insertion;
        }

        $output = '';
        $last   = count( $parts ) - 1;

        foreach ( $parts as $index => $part ) {
            $output .= $part;
            if ( $index < $last ) {
                $output .= $closing;
            }
            if ( ( $index + 1 ) === (int) $paragraph_id ) {
                $output .= $insertion;
            }
        }

        if ( $paragraph_id > $last ) {
            $output .= $insertion;
        }

        return $output;
    }

    private function enabled() {
        return ! is_admin()
            && ! empty( $this->config['system']['enabled'] )
            && 'V9_LOCKED' === ( $this->config['layout']['baseline'] ?? '' );
    }
}
