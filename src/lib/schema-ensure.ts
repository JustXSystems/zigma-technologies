import type { RowDataPacket } from 'mysql2';
import pool, { isDbUnavailableError } from '@/lib/db';

let backgroundColumnReady: Promise<void> | null = null;

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
