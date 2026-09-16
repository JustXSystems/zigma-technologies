import type { RowDataPacket } from 'mysql2';
import pool, { isDbUnavailableError } from '@/lib/db';

let backgroundColumnReady: Promise<void> | null = null;
let discoveryColumnsReady: Promise<void> | null = null;

/**
 * Idempotent: ensure catalog_items.background_image_url exists.
 * PreProd/Prod often skip manual migrations; without this column admin "Gallery
 * background" cannot persist and older builds omitted the field from API JSON.
 */
export function ensureCatalogBackgroundColumn(): Promise<void> {
  if (!backgroundColumnReady) {
    backgroundColumnReady = (async () => {
      try {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS c
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'catalog_items'
             AND COLUMN_NAME = 'background_image_url'`
        );
        if (Number(rows[0]?.c || 0) > 0) return;
        await pool.query(
          `ALTER TABLE catalog_items
           ADD COLUMN background_image_url VARCHAR(500) NULL AFTER lead_time_label`
        );
        console.info('[schema] added catalog_items.background_image_url');
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        // Missing ALTER privilege etc. — do not crash reads; writes will surface SQL errors.
        console.error(
          '[schema] could not ensure background_image_url — run scripts/migrate-catalog-background.sql',
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
