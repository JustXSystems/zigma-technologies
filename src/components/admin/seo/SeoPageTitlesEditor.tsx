'use client';

import { DEFAULT_SITE_COPY, type SiteCopy } from '@/lib/site-copy';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import SeoFieldsEditor from '@/components/admin/SeoFieldsEditor';
import { SEO_COPY_PATHS } from '@/components/admin/site-copy/paths-elsewhere';
import { useSiteCopySlice } from '@/components/admin/site-copy/use-site-copy-slice';

const GROUPS: { title: string; match: (path: string) => boolean }[] = [
  { title: 'Catalog listings', match: (p) => ['/products', '/projects', '/services'].includes(p) },
  { title: 'Industries', match: (p) => p.startsWith('/industries') },
  { title: 'Locations', match: (p) => p.startsWith('/locations') },
  { title: 'Tools', match: (p) => p.startsWith('/tools/') },
  { title: 'Language pages', match: (p) => /^\/(hi|kn)(\/|$)/.test(p) },
  { title: 'Other pages', match: () => true },
];

const SEO_PATHS = Object.keys(DEFAULT_SITE_COPY.seo);
const PATHS_BY_GROUP = GROUPS.map(
  (group, i) => [group.title, SEO_PATHS.filter((path) => GROUPS.findIndex((g) => g.match(path)) === i)] as const
).filter(([, paths]) => paths.length > 0);

function SeoEntry({ path, copy, onChange }: { path: string; copy: SiteCopy; onChange: (next: SiteCopy) => void }) {
  const entry = copy.seo?.[path] || { title: '', description: '' };
  return (
    <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '0.75rem' }}>
      <h4 style={{ margin: '0 0 0.5rem' }}>
        <a href={path} target="_blank" rel="noreferrer">
          {path}
        </a>
      </h4>
      <SeoFieldsEditor
        value={{ title: entry.title, description: entry.description }}
        onChange={({ title, description }) => onChange({ ...copy, seo: { ...copy.seo, [path]: { title, description } } })}
        path={path}
      />
    </div>
  );
}

/** Google title and description for built-in pages without SEO fields of their own (stored in Site Copy). */
export default function SeoPageTitlesEditor() {
  const { copy, setCopy, error, message, saving, save } = useSiteCopySlice(
    SEO_COPY_PATHS,
    'Page titles saved. Public pages pick them up on next load.'
  );

  return (
    <div className="admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !copy} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save page titles'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      {copy
        ? PATHS_BY_GROUP.map(([title, paths], i) => (
            <AdminCollapsible
              key={title}
              title={title}
              description={`${paths.length} page${paths.length === 1 ? '' : 's'}`}
              defaultOpen={i === 0}
            >
              <div className="admin-page-stack">
                {paths.map((path) => (
                  <SeoEntry key={path} path={path} copy={copy} onChange={setCopy} />
                ))}
              </div>
            </AdminCollapsible>
          ))
        : !error ? <div className="admin-card">Loading page titles…</div> : null}
    </div>
  );
}
