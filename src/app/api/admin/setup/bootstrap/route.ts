import { requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';

/**
 * Orchestrates common seed actions from the dashboard by calling existing route handlers.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await readJson(request).catch(() => ({}))) as { action?: string };
    const action = body.action || '';
    const results: Array<{ action: string; ok: boolean; message: string }> = [];

    async function run(label: string, fn: () => Promise<{ message?: string }>) {
      try {
        const out = await fn();
        results.push({ action: label, ok: true, message: out.message || `${label} done` });
      } catch (e) {
        results.push({
          action: label,
          ok: false,
          message: e instanceof Error ? e.message : `${label} failed`,
        });
      }
    }

    if (action === 'seed-home' || action === 'bootstrap') {
      await run('seed-home', async () => {
        const mod = await import('@/app/api/admin/pages/seed-home/route');
        const res = await mod.POST();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Home seed failed');
        return data;
      });
    }

    if (
      action === 'seed-contact' ||
      action === 'seed-careers' ||
      action === 'seed-certifications' ||
      action === 'seed-privacy' ||
      action === 'seed-terms' ||
      action === 'bootstrap'
    ) {
      const slugs =
        action === 'bootstrap'
          ? (['contact', 'careers', 'certifications', 'privacy', 'terms'] as const)
          : ([
              action.replace('seed-', '') as
                | 'contact'
                | 'careers'
                | 'certifications'
                | 'privacy'
                | 'terms',
            ] as const);

      for (const slug of slugs) {
        await run(`seed-${slug}`, async () => {
          const mod = await import('@/app/api/admin/pages/seed-inner/route');
          const res = await mod.POST(
            new Request('http://local/api/admin/pages/seed-inner', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug }),
            })
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `${slug} seed failed`);
          return data;
        });
      }
    }

    if (action === 'seed-header-nav' || action === 'bootstrap') {
      await run('seed-header-nav', async () => {
        const mod = await import('@/app/api/admin/nav/seed/route');
        const res = await mod.POST(
          new Request('http://local/api/admin/nav/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: 'header' }),
          })
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Header nav seed failed');
        return data;
      });
    }

    if (action === 'seed-footer-nav' || action === 'bootstrap') {
      await run('seed-footer-nav', async () => {
        const mod = await import('@/app/api/admin/nav/seed/route');
        const res = await mod.POST(
          new Request('http://local/api/admin/nav/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: 'footer' }),
          })
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Footer nav seed failed');
        return data;
      });
    }

    if (action === 'seed-catalog' || action === 'bootstrap') {
      for (const type of ['project', 'product', 'service'] as const) {
        await run(`seed-catalog-${type}`, async () => {
          const mod = await import('@/app/api/admin/catalog/seed/route');
          const res = await mod.POST(
            new Request('http://local/api/admin/catalog/seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type }),
            })
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `${type} seed failed`);
          return data;
        });
      }
    }

    if (action === 'seed-subject' || action === 'bootstrap') {
      await run('seed-subject', async () => {
        const pool = (await import('@/lib/db')).default;
        const [rows] = await pool.query(
          `SELECT id FROM form_definitions WHERE form_key = 'enquiry_default' LIMIT 1`
        );
        const formId = Array.isArray(rows) && rows[0] && (rows[0] as { id: number }).id;
        if (!formId) throw new Error('Default enquiry form missing');

        const [existing] = await pool.query(
          `SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'subject' LIMIT 1`,
          [formId]
        );
        if (Array.isArray(existing) && existing.length) {
          return { message: 'Subject field already present.' };
        }

        await pool.query(
          `INSERT INTO form_fields (form_id, field_name, label, field_type, required, options_json, placeholder, sort_order, enabled)
           VALUES (?, 'subject', ?, 'select', 1, ?, 'Select a topic', 4, 1)`,
          [
            formId,
            "I'm Getting in Touch About",
            JSON.stringify([
              'Solar Solution',
              'UPS Solution',
              'BESS- Battery System',
              'Site Visit Request',
              'AMC & Service Request',
              'Request a Quote',
              'EV Charging Solution',
              'Emergency Service Support',
              'General Enquiry',
              'Careers',
            ]),
          ]
        );
        await pool.query(`UPDATE form_fields SET sort_order = 5 WHERE form_id = ? AND field_name = 'company'`, [
          formId,
        ]);
        await pool.query(
          `UPDATE form_fields SET sort_order = 6, required = 0 WHERE form_id = ? AND field_name = 'message'`,
          [formId]
        );
        return { message: 'Added subject select to default enquiry form.' };
      });
    }

    if (action === 'seed-site-settings' || action === 'bootstrap') {
      await run('seed-site-settings', async () => {
        const { getThemeSettings, upsertThemeSetting } = await import('@/lib/cms');
        const { DEFAULT_SITE_SETTINGS, mergeSiteSettings } = await import('@/lib/site-settings');
        const theme = await getThemeSettings();
        if (theme.site) {
          return { message: 'Site settings already saved.' };
        }
        await upsertThemeSetting('site', mergeSiteSettings(DEFAULT_SITE_SETTINGS));
        return { message: 'Seeded default site settings.' };
      });
    }

    if (!results.length) return jsonError('Unknown action', 400);

    return jsonOk({
      results,
      message: results.map((r) => `${r.ok ? 'OK' : 'FAIL'}: ${r.message}`).join(' | '),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Setup action failed', 500);
  }
}
