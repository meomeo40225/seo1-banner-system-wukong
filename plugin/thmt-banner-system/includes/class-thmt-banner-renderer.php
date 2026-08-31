<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Frontend renderer for the locked V9 layout.
 */
class THMT_Banner_Renderer {
    /** @var array */
    private $config = array();

    /** @var bool */
    private $middle_injected = false;

    /**
     * Register WordPress hooks.
     */
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

    /**
     * @param array $classes Body classes.
     * @return array
     */
    public function body_class( $classes ) {
        $classes[] = 'thmt-banner-v9-enabled';
        return $classes;
    }

    /**
     * Enqueue CSS/JS and expose the remotely cached config contract.
     */
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
                'version'      => THMT_BANNER_SYSTEM_VERSION,
                'baseline'     => 'V9_LOCKED',
                'config'       => $this->config,
                'assetBaseUrl' => THMT_Banner_Config::asset_base_url(),
                'debug'        => THMT_Banner_Config::debug_enabled(),
                'step'         => 6,
            )
        );
    }

    /**
     * Render TOP / LEFT / RIGHT / BOTTOM with initial V9 state.
     * TOP is moved into the detected main content container by frontend.js.
     */
    public function render_global_shell() {
        if ( is_admin() ) {
            return;
        }
        ?>
        <div id="thmt-banner-global" class="thmt-banner-global" data-thmt-baseline="V9_LOCKED" aria-label="Sponsored banners">
            <div id="thmt-banner-top" class="thmt-banner-top-row" data-thmt-mount="top">
                <?php echo $this->render_slot( 'TOP_1', $this->banner_for( 0, 'horizontal' ), 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'TOP_2', $this->banner_for( 6, 'horizontal' ), 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </div>

            <aside class="thmt-banner-side-rail thmt-banner-side-left" aria-label="Sponsored banners left">
                <?php echo $this->render_slot( 'LEFT_1', $this->banner_for( 1, 'vertical' ), 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'LEFT_2', $this->banner_for( 4, 'vertical' ), 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </aside>

            <aside class="thmt-banner-side-rail thmt-banner-side-right" aria-label="Sponsored banners right">
                <?php echo $this->render_slot( 'RIGHT_1', $this->banner_for( 7, 'vertical' ), 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'RIGHT_2', $this->banner_for( 10, 'vertical' ), 'vertical' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </aside>

            <div id="thmt-banner-bottom" class="thmt-banner-bottom-row">
                <?php echo $this->render_slot( 'BOTTOM_1', $this->banner_for( 2, 'horizontal' ), 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                <?php echo $this->render_slot( 'BOTTOM_2', $this->banner_for( 8, 'horizontal' ), 'horizontal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </div>
        </div>
        <?php
    }

    /**
     * Inject the 5-card MIDDLE zone into singular content.
     *
     * Middle images intentionally start as placeholders. frontend.js only
     * attaches GIFs when the zone approaches the viewport, preventing large
     * off-screen GIFs from decoding during the initial page load.
     *
     * @param string $content Post content.
     * @return string
     */
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
        $middle                = $this->render_middle_zone();

        return $this->insert_after_paragraph( $middle, 2, $content );
    }

    /**
     * @return string
     */
    private function render_middle_zone() {
        $html  = '<section class="thmt-banner-middle-zone" data-thmt-baseline="V9_LOCKED" aria-label="Sponsored banners">';
        $html .= '<div class="thmt-banner-middle-grid">';

        for ( $i = 0; $i < 5; $i++ ) {
            $html .= $this->render_slot( 'MIDDLE_' . ( $i + 1 ), null, 'middle' );
        }

        $html .= '</div></section>';
        return $html;
    }

    /**
     * Return an enabled brand mapped to the requested asset type.
     *
     * @param int    $index Brand index.
     * @param string $type  horizontal|vertical|middle.
     * @return array|null
     */
    private function banner_for( $index, $type ) {
        $brands = array_values(
            array_filter(
                $this->config['brands'],
                static function ( $brand ) {
                    return ! empty( $brand['enabled'] );
                }
            )
        );

        $count = count( $brands );
        if ( 0 === $count ) {
            return null;
        }

        $brand = $brands[ ( (int) $index % $count + $count ) % $count ];
        $asset = $brand['assets'][ $type ] ?? null;

        if ( ! is_array( $asset ) || empty( $asset['file'] ) ) {
            return null;
        }

        return array(
            'brand' => (string) ( $brand['name'] ?? $brand['id'] ?? '' ),
            'url'   => (string) ( $brand['url'] ?? '' ),
            'image' => THMT_Banner_Config::resolve_asset_url( $asset['file'] ),
            'size'  => (string) ( $asset['size'] ?? '' ),
        );
    }

    /**
     * Render one slot. Empty brand URLs deliberately produce no anchor.
     *
     * @param string     $slot_id Slot identifier.
     * @param array|null $item    Banner item.
     * @param string     $kind    horizontal|vertical|middle.
     * @return string
     */
    private function render_slot( $slot_id, $item, $kind ) {
        $classes = 'thmt-banner-slot thmt-banner-' . sanitize_html_class( $kind );

        if ( ! $item ) {
            return sprintf(
                '<div class="%1$s" data-slot="%2$s"></div>',
                esc_attr( $classes ),
                esc_attr( $slot_id )
            );
        }

        $alt = trim( $item['brand'] . ' ' . $item['size'] );
        $img = sprintf(
            '<img src="%1$s" alt="%2$s" loading="eager" decoding="async">',
            esc_url( $item['image'] ),
            esc_attr( $alt )
        );

        $link = '';
        if ( '' !== trim( $item['url'] ) ) {
            $link = sprintf(
                '<a class="thmt-banner-link" href="%1$s" target="_blank" rel="nofollow sponsored noopener noreferrer" aria-label="%2$s"></a>',
                esc_url( $item['url'] ),
                esc_attr( sprintf( 'Open %s', $item['brand'] ) )
            );
        }

        $badge = '';
        if ( THMT_Banner_Config::debug_enabled() ) {
            $badge = sprintf(
                '<span class="thmt-banner-debug-badge">%1$s • %2$s • %3$s</span>',
                esc_html( $slot_id ),
                esc_html( $item['brand'] ),
                esc_html( $item['size'] )
            );
        }

        return sprintf(
            '<div class="%1$s" data-slot="%2$s" data-brand="%3$s" data-size="%4$s">%5$s%6$s%7$s</div>',
            esc_attr( $classes ),
            esc_attr( $slot_id ),
            esc_attr( $item['brand'] ),
            esc_attr( $item['size'] ),
            $img,
            $link,
            $badge
        );
    }

    /**
     * Insert HTML after the Nth closing paragraph, or append when content is short.
     *
     * @param string $insertion    Markup to insert.
     * @param int    $paragraph_id Paragraph number.
     * @param string $content      Existing content.
     * @return string
     */
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

    /**
     * @return bool
     */
    private function enabled() {
        if ( is_admin() ) {
            return false;
        }

        if ( empty( $this->config['system']['enabled'] ) ) {
            return false;
        }

        return 'V9_LOCKED' === ( $this->config['layout']['baseline'] ?? '' );
    }
}
