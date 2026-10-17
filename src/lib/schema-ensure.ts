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
  {
    name: 'meta_title',
    ddl: `ALTER TABLE catalog_items ADD COLUMN meta_title VARCHAR(255) NULL AFTER description`,
  },
  {
    name: 'meta_description',
    ddl: `ALTER TABLE catalog_items ADD COLUMN meta_description VARCHAR(320) NULL AFTER meta_title`,
  },
  {
    name: 'og_image_url',
    ddl: `ALTER TABLE catalog_items ADD COLUMN og_image_url VARCHAR(500) NULL AFTER meta_description`,
  },
  {
    name: 'seo_noindex',
    ddl: `ALTER TABLE catalog_items ADD COLUMN seo_noindex TINYINT(1) NOT NULL DEFAULT 0 AFTER og_image_url`,
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
    name: 'hero_item_durations_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_item_durations_json JSON NULL AFTER hero_item_ids_json`,
  },
  {
    name: 'hero_bg_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_bg_json JSON NULL AFTER hero_item_durations_json`,
  },
  {
    name: 'sections_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN sections_json JSON NULL AFTER hero_bg_json`,
  },
  {
    name: 'hero_standard_panel_enabled',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_standard_panel_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER hero_variant`,
  },
  {
    name: 'hero_height',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_height VARCHAR(8) NOT NULL DEFAULT 'full' AFTER hero_variant`,
  },
  {
    name: 'detail_hero_height',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN detail_hero_height VARCHAR(8) NOT NULL DEFAULT 'full' AFTER hero_height`,
  },
  {
    name: 'toolbar_display',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN toolbar_display VARCHAR(16) NOT NULL DEFAULT 'hero_dock' AFTER detail_hero_height`,
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
    name: 'card_media_bg_color',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_media_bg_color VARCHAR(32) NULL DEFAULT '#ffffff' AFTER card_body_bg_color`,
  },
  {
    name: 'listing_bg_color',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN listing_bg_color VARCHAR(32) NULL DEFAULT '#ffffff' AFTER card_media_bg_color`,
  },
  {
    name: 'marketplace_hover_border_color',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN marketplace_hover_border_color VARCHAR(32) NULL DEFAULT '#FF6B1A' AFTER listing_bg_color`,
  },
  {
    name: 'card_media_fit_percent',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_media_fit_percent TINYINT UNSIGNED NOT NULL DEFAULT 94 AFTER marketplace_hover_border_color`,
  },
  {
    name: 'card_media_inset',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_media_inset VARCHAR(16) NOT NULL DEFAULT 'snug' AFTER card_media_fit_percent`,
  },
  {
    name: 'card_size_mode',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_size_mode VARCHAR(16) NOT NULL DEFAULT 'auto' AFTER card_media_inset`,
  },
  {
    name: 'card_fixed_height_px',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_fixed_height_px SMALLINT UNSIGNED NOT NULL DEFAULT 420 AFTER card_size_mode`,
  },
  {
    name: 'card_fixed_width_px',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN card_fixed_width_px SMALLINT UNSIGNED NOT NULL DEFAULT 320 AFTER card_fixed_height_px`,
  },
  {
    name: 'listing_align',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN listing_align VARCHAR(16) NOT NULL DEFAULT 'left' AFTER card_fixed_width_px`,
  },
  {
    name: 'listing_gap_px',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN listing_gap_px SMALLINT UNSIGNED NOT NULL DEFAULT 28 AFTER listing_align`,
  },
  {
    name: 'detail_layout',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN detail_layout VARCHAR(20) NOT NULL DEFAULT 'media-stage' AFTER listing_gap_px`,
  },
  {
    name: 'detail_gallery_shadow',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN detail_gallery_shadow VARCHAR(20) NOT NULL DEFAULT 'medium' AFTER detail_layout`,
  },
  {
    name: 'detail_template',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN detail_template VARCHAR(20) NOT NULL DEFAULT 'classic' AFTER detail_gallery_shadow`,
  },
  {
    name: 'detail_elements_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN detail_elements_json JSON NULL AFTER detail_template`,
  },
  {
    name: 'listing_design',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN listing_design VARCHAR(16) NOT NULL DEFAULT 'classic' AFTER detail_elements_json`,
  },
  {
    name: 'hero_highlight_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_highlight_json JSON NULL AFTER hero_bg_json`,
  },
  {
    name: 'hero_card_json',
    ddl: `ALTER TABLE catalog_page_settings ADD COLUMN hero_card_json JSON NULL AFTER hero_bg_json`,
  },
];

let mediaAssetColumnsReady: Promise<void> | null = null;

const MEDIA_ASSET_COLUMNS: Array<{ name: string; ddl: string }> = [
  {
    name: 'original_name',
    ddl: `ALTER TABLE media_assets ADD COLUMN original_name VARCHAR(255) NULL AFTER path, ADD INDEX idx_media_original_name (original_name)`,
  },
  {
    name: 'content_hash',
    ddl: `ALTER TABLE media_assets ADD COLUMN content_hash CHAR(64) NULL AFTER mime, ADD INDEX idx_media_content_hash (content_hash)`,
  },
  {
    name: 'size_bytes',
    ddl: `ALTER TABLE media_assets ADD COLUMN size_bytes INT UNSIGNED NULL AFTER content_hash`,
  },
];

/**
 * Idempotent: media_assets keeps the uploader's original file name (for mapping spreadsheets to
 * files), a SHA-256 of the content (duplicate uploads reuse the stored file) and the byte size.
 */
export function ensureMediaAssetColumns(): Promise<void> {
  if (!mediaAssetColumnsReady) {
    mediaAssetColumnsReady = (async () => {
      try {
        for (const col of MEDIA_ASSET_COLUMNS) {
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS c
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'media_assets'
               AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (Number(rows[0]?.c || 0) > 0) continue;
          await pool.query(col.ddl);
          console.info(`[schema] added media_assets.${col.name}`);
        }
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        console.error('[schema] could not ensure media_assets columns — run scripts/migrate-catalog-transfer.sql', err);
      }
    })().catch((err) => {
      mediaAssetColumnsReady = null;
      throw err;
    });
  }
  return mediaAssetColumnsReady;
}

let resourcePostColumnsReady: Promise<void> | null = null;

const RESOURCE_POSTS_TABLE = `CREATE TABLE IF NOT EXISTS resource_posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  body_html MEDIUMTEXT NULL,
  cover_url VARCHAR(500) NULL,
  tags_json JSON NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  meta_title VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  published_at DATETIME NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resource_slug (slug),
  INDEX idx_resource_pub (status, enabled, published_at)
) ENGINE=InnoDB`;

const RESOURCE_POST_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: 'format', ddl: `ALTER TABLE resource_posts ADD COLUMN format VARCHAR(24) NOT NULL DEFAULT '' AFTER cover_url` },
  { name: 'template', ddl: `ALTER TABLE resource_posts ADD COLUMN template VARCHAR(24) NOT NULL DEFAULT '' AFTER format` },
  { name: 'featured', ddl: `ALTER TABLE resource_posts ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0 AFTER template` },
  { name: 'author_name', ddl: `ALTER TABLE resource_posts ADD COLUMN author_name VARCHAR(120) NULL AFTER featured` },
  { name: 'author_role', ddl: `ALTER TABLE resource_posts ADD COLUMN author_role VARCHAR(160) NULL AFTER author_name` },
  { name: 'author_avatar_url', ddl: `ALTER TABLE resource_posts ADD COLUMN author_avatar_url VARCHAR(500) NULL AFTER author_role` },
  { name: 'key_points_json', ddl: `ALTER TABLE resource_posts ADD COLUMN key_points_json JSON NULL AFTER author_avatar_url` },
  { name: 'display_json', ddl: `ALTER TABLE resource_posts ADD COLUMN display_json JSON NULL AFTER key_points_json` },
];

/** Idempotent: the blog posts table and its design columns (format, template, featured, author, key points, display overrides). */
export function ensureResourcePostColumns(): Promise<void> {
  if (!resourcePostColumnsReady) {
    resourcePostColumnsReady = (async () => {
      try {
        await pool.query(RESOURCE_POSTS_TABLE);
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resource_posts'`
        );
        const have = new Set(rows.map((r) => String(r.name)));
        for (const col of RESOURCE_POST_COLUMNS) {
          if (have.has(col.name)) continue;
          await pool.query(col.ddl);
          console.info(`[schema] added resource_posts.${col.name}`);
        }
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        console.error('[schema] could not ensure resource_posts columns — run scripts/migrate-blog-design.sql', err);
      }
    })().catch((err) => {
      resourcePostColumnsReady = null;
      throw err;
    });
  }
  return resourcePostColumnsReady;
}

let careerHiringReady: Promise<void> | null = null;

const CAREER_JOBS_TABLE = `CREATE TABLE IF NOT EXISTS career_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(12) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(120) NULL,
  location VARCHAR(120) NULL,
  job_type VARCHAR(80) NULL,
  experience VARCHAR(120) NULL,
  education VARCHAR(255) NULL,
  badge VARCHAR(80) NULL,
  summary TEXT NULL,
  content_json JSON NULL,
  status ENUM('draft','open','paused','closed') NOT NULL DEFAULT 'draft',
  close_reason ENUM('filled','expired','cancelled','other') NULL,
  close_notes TEXT NULL,
  opens_at DATETIME NULL,
  closes_at DATETIME NULL,
  published_at DATETIME NULL,
  closed_at DATETIME NULL,
  vacancies INT UNSIGNED NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(120) NULL,
  updated_by VARCHAR(120) NULL,
  closed_by VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_career_job_slug (slug),
  UNIQUE KEY uq_career_job_public (public_id),
  INDEX idx_career_job_status (status, closes_at, sort_order),
  INDEX idx_career_job_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CAREER_CANDIDATES_TABLE = `CREATE TABLE IF NOT EXISTS career_candidates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id INT UNSIGNED NOT NULL,
  enquiry_id INT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(80) NULL,
  experience VARCHAR(120) NULL,
  resume_file VARCHAR(255) NULL,
  resume_name VARCHAR(255) NULL,
  stage ENUM('applied','screening','interview','offer','hired','rejected','withdrawn','on_hold') NOT NULL DEFAULT 'applied',
  source VARCHAR(80) NOT NULL DEFAULT 'website',
  interviewer VARCHAR(160) NULL,
  interview_at DATETIME NULL,
  offer_at DATETIME NULL,
  joined_at DATETIME NULL,
  rejected_at DATETIME NULL,
  rating TINYINT UNSIGNED NULL,
  notes TEXT NULL,
  tags_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(120) NULL,
  updated_by VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cand_job_stage (job_id, stage),
  INDEX idx_cand_enquiry (enquiry_id),
  INDEX idx_cand_email (email),
  CONSTRAINT fk_cand_job FOREIGN KEY (job_id) REFERENCES career_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const CAREER_EVENTS_TABLE = `CREATE TABLE IF NOT EXISTS career_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id INT UNSIGNED NULL,
  candidate_id INT UNSIGNED NULL,
  actor VARCHAR(120) NULL,
  event_type VARCHAR(64) NOT NULL,
  from_value VARCHAR(120) NULL,
  to_value VARCHAR(120) NULL,
  message TEXT NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_evt_job (job_id, created_at),
  INDEX idx_evt_cand (candidate_id, created_at),
  INDEX idx_evt_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

/** Idempotent: careers hiring ATS tables (jobs, candidates, audit events). */
export function ensureCareerHiringTables(): Promise<void> {
  if (!careerHiringReady) {
    careerHiringReady = (async () => {
      try {
        await pool.query(CAREER_JOBS_TABLE);
        await pool.query(CAREER_CANDIDATES_TABLE);
        await pool.query(CAREER_EVENTS_TABLE);
      } catch (err) {
        if (isDbUnavailableError(err)) throw err;
        console.error('[schema] could not ensure career hiring tables — run scripts/migrate-career-hiring.sql', err);
      }
    })().catch((err) => {
      careerHiringReady = null;
      throw err;
    });
  }
  return careerHiringReady;
}

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
