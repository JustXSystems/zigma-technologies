import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { getThemeSettings } from '@/lib/cms';

export async function GET() {
  try {
    await requireSession();

    const [[pages]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM pages');
    const [[homeSections]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM page_sections s
       INNER JOIN pages p ON p.id = s.page_id
       WHERE p.slug = 'home'`
    );
    const [[contactPages]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM pages WHERE slug = 'contact'"
    );
    const [[careersPages]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM pages WHERE slug = 'careers'"
    );
    const [[certPages]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM pages WHERE slug = 'certifications'"
    );
    const [[privacyPages]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM pages WHERE slug = 'privacy'"
    );
    const [[termsPages]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM pages WHERE slug = 'terms'"
    );
    const [[headerNav]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM nav_items WHERE location = 'header'"
    );
    const [[footerNav]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM nav_items WHERE location = 'footer'"
    );
    const [[catalog]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM catalog_items');
    const [[media]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM media_assets');
    const [[enquiries]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM enquiries WHERE status = 'new'"
    );
    const [[subjectField]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM form_fields ff
       INNER JOIN form_definitions fd ON fd.id = ff.form_id
       WHERE fd.form_key = 'enquiry_default' AND ff.field_name = 'subject' AND ff.enabled = 1`
    );
    const theme = await getThemeSettings();
    const hasSiteSettings = !!(theme.site && typeof theme.site === 'object');

    const checklist = [
      {
        id: 'home',
        label: 'Homepage sections seeded',
        done: Number(homeSections?.c || 0) > 0,
        href: '/admin/pages',
        action: 'seed-home',
      },
      {
        id: 'contact',
        label: 'Contact page exists',
        done: Number(contactPages?.c || 0) > 0,
        href: '/admin/pages',
        action: 'seed-contact',
      },
      {
        id: 'careers',
        label: 'Careers page exists',
        done: Number(careersPages?.c || 0) > 0,
        href: '/admin/pages',
        action: 'seed-careers',
      },
      {
        id: 'certifications',
        label: 'Certifications page exists',
        done: Number(certPages?.c || 0) > 0,
        href: '/admin/pages',
        action: 'seed-certifications',
      },
      {
        id: 'privacy',
        label: 'Privacy page exists',
        done: Number(privacyPages?.c || 0) > 0,
        href: '/admin/pages',
        action: 'seed-privacy',
      },
      {
        id: 'terms',
        label: 'Terms page exists',
        done: Number(termsPages?.c || 0) > 0,
        href: '/admin/pages',
        action: 'seed-terms',
      },
      {
        id: 'header-nav',
        label: 'Header navigation seeded',
        done: Number(headerNav?.c || 0) > 0,
        href: '/admin/nav',
        action: 'seed-header-nav',
      },
      {
        id: 'footer-nav',
        label: 'Footer navigation seeded',
        done: Number(footerNav?.c || 0) > 0,
        href: '/admin/nav',
        action: 'seed-footer-nav',
      },
      {
        id: 'catalog',
        label: 'Catalog has items',
        done: Number(catalog?.c || 0) > 0,
        href: '/admin/inventory',
        action: 'seed-catalog',
      },
      {
        id: 'enquiry-subject',
        label: 'Enquiry form has subject field',
        done: Number(subjectField?.c || 0) > 0,
        href: '/admin/forms',
        action: 'seed-subject',
      },
      {
        id: 'site',
        label: 'Site settings customized',
        done: hasSiteSettings,
        href: '/admin/site-settings',
        action: 'seed-site-settings',
      },
    ];

    return jsonOk({
      counts: {
        pages: Number(pages?.c || 0),
        homeSections: Number(homeSections?.c || 0),
        catalog: Number(catalog?.c || 0),
        media: Number(media?.c || 0),
        newEnquiries: Number(enquiries?.c || 0),
        headerNav: Number(headerNav?.c || 0),
        footerNav: Number(footerNav?.c || 0),
      },
      checklist,
      complete: checklist.every((c) => c.done),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to load setup status', 500);
  }
}
