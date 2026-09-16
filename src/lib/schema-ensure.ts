import type { RowDataPacket } from 'mysql2';
import pool, { isDbUnavailableError } from '@/lib/db';

let backgroundColumnReady: Promise<void> | null = null;
let catalogMediaFitReady: Promise<void> | null = null;
let discoveryColumnsReady: Promise<void> | null = null;

const CATALOG_ITEM_MEDIA_COLUMNS: Array<{ name: string; ddl: string }> = [
  {
    name: 'background_image_url',
    ddl: `ALTER TABLE catalog_items ADD COLUMN background_image_url VARCHAR(500) NULL AFTER lead_time_label`,
  },
  {
    name: 'background_shading_style',
    ddl: `ALTER TABLE catalog_items ADD COLUMN background_shading_style VARCHAR(20) NOT NULL DEFAULT 'medium' AFTER background_image_url`,
  },
  {
    name: 'background_fit_to_space',
    ddl: `ALTER TABLE catalog_items ADD COLUMN background_fit_to_space TINYINT(1) NOT NULL DEFAULT 0 AFTER background_shading_style`,
  },
  {
    name: 'background_fit_percent',
    ddl: `ALTER TABLE catalog_items ADD COLUMN background_fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER background_fit_to_space`,
  },
  {
    name: 'media_fit_to_space',
    ddl: `ALTER TABLE catalog_items ADD COLUMN media_fit_to_space TINYINT(1) NOT NULL DEFAULT 1 AFTER background_fit_percent`,
  },
  {
    name: 'media_fit_percent',
    ddl: `ALTER TABLE catalog_items ADD COLUMN media_fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 78 AFTER media_fit_to_space`,
  },
];

const CATALOG_MEDIA_FIT_COLUMNS: Array<{ name: string; ddl: string }> = [
  {
    name: 'fit_to_space',
    ddl: `ALTER TABLE catalog_media ADD COLUMN fit_to_space TINYINT(1) NOT NULL DEFAULT 1 AFTER is_primary`,
  },
  {
    name: 'fit_percent',
    ddl: `ALTER TABLE catalog_media ADD COLUMN fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 78 AFTER fit_to_space`,
  },
  {
    name: 'shadow_style',
    ddl: `ALTER TABLE catalog_media ADD COLUMN shadow_style VARCHAR(20) NOT NULL DEFAULT 'medium' AFTER fit_percent`,
  },
];

/**
 * Idempotent: ensure catalog_items background + media presentation columns exist.
 * PreProd/Prod often skip manual migrations; without these columns admin media
 * presentation options cannot persist.
 */
export function ensureCatalogBackgroundColumn(): Promise<void> {
  if (!backgroundColumnReady) {
    backgroundColumnReady = (async () => {
      try {
        for (const col of CATALOG_ITEM_MEDIA_COLUMNS) {
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS c
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'catalog_items'
               AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (Number(rows[0]?.c || 0) > 0) continue;
          await pool.query(col.ddl);
          console.info(`[schema] added catalog_items.${col.name}`);
        }
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        // Missing ALTER privilege etc. — do not crash reads; writes will surface SQL errors.
        console.error(
          '[schema] could not ensure catalog media presentation columns — run scripts/migrate-catalog-background.sql',
          err
        );
      }
    })().catch((err) => {
      backgroundColumnReady = null;
      throw err;
    });
  }
  return backgroundColumnReady;
}

/** Idempotent: ensure catalog_media fit_to_space / fit_percent columns exist. */
export function ensureCatalogMediaFitColumns(): Promise<void> {
  if (!catalogMediaFitReady) {
    catalogMediaFitReady = (async () => {
      try {
        for (const col of CATALOG_MEDIA_FIT_COLUMNS) {
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS c
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'catalog_media'
               AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (Number(rows[0]?.c || 0) > 0) continue;
          await pool.query(col.ddl);
          console.info(`[schema] added catalog_media.${col.name}`);
        }
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        console.error(
          '[schema] could not ensure catalog_media fit columns — run scripts/migrate-catalog-background.sql',
          err
        );
      }
    })().catch((err) => {
      catalogMediaFitReady = null;
      throw err;
    });
  }
  return catalogMediaFitReady;
}

const DISCOVERY_COLUMNS: Array<{ name: string; ddl: string }> = [
  {
    name: 'hero_standard_panel_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_standard_panel_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER hero_variant`,
  },
  {
    name: 'hero_meta_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_meta_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER hero_standard_panel_enabled`,
  },
  {
    name: 'hero_elements_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_elements_json JSON NULL AFTER hero_meta_enabled`,
  },
  {
    name: 'toolbar_elements_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN toolbar_elements_json JSON NULL AFTER hero_elements_json`,
  },
  {
    name: 'discovery_profile_rail_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN discovery_profile_rail_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER premium_borders_enabled`,
  },
  {
    name: 'discovery_quick_find_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN discovery_quick_find_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_profile_rail_enabled`,
  },
  {
    name: 'discovery_facet_rail_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN discovery_facet_rail_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_quick_find_enabled`,
  },
  {
    name: 'discovery_grouped_results_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN discovery_grouped_results_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_facet_rail_enabled`,
  },
  {
    name: 'discovery_sticky_toolbar_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN discovery_sticky_toolbar_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER discovery_grouped_results_enabled`,
  },
  {
    name: 'discovery_group_preview_count',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN discovery_group_preview_count TINYINT UNSIGNED NOT NULL DEFAULT 4 AFTER discovery_sticky_toolbar_enabled`,
  },
  {
    name: 'card_style',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_style VARCHAR(20) NOT NULL DEFAULT 'marketplace' AFTER visual_style`,
  },
  {
    name: 'card_body_bg_color',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_body_bg_color VARCHAR(32) NULL DEFAULT '#ffffff' AFTER card_style`,
  },
  {
    name: 'card_media_fit_percent',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_media_fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 94 AFTER card_body_bg_color`,
  },
  {
    name: 'card_media_inset',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_media_inset VARCHAR(16) NOT NULL DEFAULT 'snug' AFTER card_media_fit_percent`,
  },
];

/** Idempotent: ensure catalog discovery + standard-panel columns exist. */
export function ensureCatalogDiscoveryColumns(): Promise<void> {
  if (!discoveryColumnsReady) {
    discoveryColumnsReady = (async () => {
      try {
        for (const col of DISCOVERY_COLUMNS) {
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS c
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'catalog_page_settings'
               AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (Number(rows[0]?.c || 0) > 0) continue;
          await pool.query(col.ddl);
          console.info(`[schema] added catalog_page_settings.${col.name}`);
        }
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        console.error(
          '[schema] could not ensure catalog discovery columns — run scripts/migrate-catalog-discovery.sql',
          err
        );
      }
    })().catch((err) => {
      discoveryColumnsReady = null;
      throw err;
    });
  }
  return discoveryColumnsReady;
}
