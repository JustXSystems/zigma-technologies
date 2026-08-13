'use client';

type ErEntity = {
  name: string;
  keys?: string[];
  note?: string;
};

type ErRelation = {
  from: string;
  to: string;
  label: string;
  cardinality: '1:N' | 'N:1' | '1:1';
};

type ErGroup = {
  id: string;
  title: string;
  accent: 'orange' | 'cyan' | 'green' | 'slate' | 'purple';
  entities: ErEntity[];
  relations: ErRelation[];
  standalone?: boolean;
};

const ER_GROUPS: ErGroup[] = [
  {
    id: 'cms',
    title: 'CMS',
    accent: 'orange',
    entities: [
      { name: 'pages', keys: ['id', 'slug'] },
      { name: 'page_sections', keys: ['id', 'page_id'], note: 'FK → pages' },
    ],
    relations: [{ from: 'pages', to: 'page_sections', label: 'has sections', cardinality: '1:N' }],
  },
  {
    id: 'catalog',
    title: 'Catalog',
    accent: 'cyan',
    entities: [
      { name: 'catalog_categories', keys: ['id', 'item_type', 'slug'] },
      { name: 'catalog_items', keys: ['id', 'category_id'], note: 'case_study_json' },
      { name: 'catalog_media', keys: ['id', 'item_id'], note: 'gallery' },
      { name: 'catalog_page_settings', keys: ['item_type'], note: 'listing UX' },
    ],
    relations: [
      { from: 'catalog_categories', to: 'catalog_items', label: 'categorises', cardinality: '1:N' },
      { from: 'catalog_items', to: 'catalog_media', label: 'has media', cardinality: '1:N' },
    ],
  },
  {
    id: 'leads',
    title: 'Leads & forms',
    accent: 'green',
    entities: [
      { name: 'form_definitions', keys: ['id', 'form_key'] },
      { name: 'form_fields', keys: ['id', 'form_id'], note: 'FK → forms' },
      { name: 'enquiries', keys: ['id', 'form_id', 'item_id'], note: 'item_id → catalog_items' },
    ],
    relations: [
      { from: 'form_definitions', to: 'form_fields', label: 'defines fields', cardinality: '1:N' },
      { from: 'form_definitions', to: 'enquiries', label: 'captures', cardinality: '1:N' },
    ],
  },
  {
    id: 'config',
    title: 'Site config',
    accent: 'slate',
    standalone: true,
    entities: [
      { name: 'theme_settings', keys: ['setting_key'], note: 'site · site_copy · tokens' },
      { name: 'css_overrides', keys: ['version', 'status'], note: 'Theme Studio' },
      { name: 'nav_items', keys: ['id', 'parent_id'], note: 'header / footer tree' },
      { name: 'redirects', keys: ['from_path', 'to_path'] },
      { name: 'media_assets', keys: ['path', 'alt'] },
    ],
    relations: [],
  },
  {
    id: 'editorial',
    title: 'Editorial',
    accent: 'purple',
    standalone: true,
    entities: [
      { name: 'resource_posts', keys: ['slug'], note: 'guides' },
      { name: 'press_posts', keys: ['slug'], note: 'newsroom' },
      { name: 'site_testimonials', keys: ['id', 'featured'] },
      { name: 'newsletter_subscribers', keys: ['email'] },
    ],
    relations: [],
  },
  {
    id: 'platform',
    title: 'Platform',
    accent: 'slate',
    standalone: true,
    entities: [
      { name: 'admin_users', keys: ['email', 'role'] },
      { name: 'partner_users', keys: ['email'] },
      { name: 'partner_documents', keys: ['file_url'] },
    ],
    relations: [],
  },
];

function accentClass(accent: ErGroup['accent']) {
  return `admin-guide-er-group--${accent}`;
}

function EntityCard({ entity }: { entity: ErEntity }) {
  return (
    <div className="admin-guide-er-entity">
      <code className="admin-guide-er-entity-name">{entity.name}</code>
      {entity.keys?.length ? (
        <ul className="admin-guide-er-entity-keys">
          {entity.keys.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      ) : null}
      {entity.note ? <span className="admin-guide-er-entity-note">{entity.note}</span> : null}
    </div>
  );
}

function RelationRow({ relation, entities }: { relation: ErRelation; entities: ErEntity[] }) {
  const from = entities.find((e) => e.name === relation.from);
  const to = entities.find((e) => e.name === relation.to);
  if (!from || !to) {
    return (
      <div className="admin-guide-er-relation admin-guide-er-relation--external">
        <EntityCard entity={{ name: relation.from, keys: [] }} />
        <div className="admin-guide-er-connector" aria-hidden="true">
          <span className="admin-guide-er-connector-line" />
          <span className="admin-guide-er-connector-badge">{relation.cardinality}</span>
          <span className="admin-guide-er-connector-label">{relation.label}</span>
          <span className="admin-guide-er-connector-arrow" />
        </div>
        <EntityCard entity={{ name: relation.to, keys: [] }} />
      </div>
    );
  }
  return (
    <div className="admin-guide-er-relation">
      <EntityCard entity={from} />
      <div className="admin-guide-er-connector" aria-hidden="true">
        <span className="admin-guide-er-connector-line" />
        <span className="admin-guide-er-connector-badge">{relation.cardinality}</span>
        <span className="admin-guide-er-connector-label">{relation.label}</span>
        <span className="admin-guide-er-connector-arrow" />
      </div>
      <EntityCard entity={to} />
    </div>
  );
}

/** Entity-relationship diagram for zigmatech MySQL schema. */
export default function AdminGuideErDiagram() {
  return (
    <div className="admin-guide-er" role="img" aria-label="MySQL entity relationship diagram for Zigma CMS">
      <div className="admin-guide-er-header">
        <span className="admin-guide-er-title">Entity relationships</span>
        <ul className="admin-guide-er-legend">
          <li>
            <span className="admin-guide-er-legend-dot admin-guide-er-legend-dot--pk" /> PK / key columns
          </li>
          <li>
            <span className="admin-guide-er-legend-dot admin-guide-er-legend-dot--fk" /> Foreign keys in schema
          </li>
        </ul>
      </div>

      <div className="admin-guide-er-grid">
        {ER_GROUPS.map((group) => (
          <section key={group.id} className={`admin-guide-er-group ${accentClass(group.accent)}`}>
            <h6 className="admin-guide-er-group-title">{group.title}</h6>
            {group.standalone ? (
              <div className="admin-guide-er-standalone">
                {group.entities.map((entity) => (
                  <EntityCard key={entity.name} entity={entity} />
                ))}
              </div>
            ) : (
              <>
                {group.relations.map((rel) => (
                  <RelationRow key={`${rel.from}-${rel.to}`} relation={rel} entities={group.entities} />
                ))}
                {group.entities
                  .filter((e) => !group.relations.some((r) => r.from === e.name || r.to === e.name))
                  .map((entity) => (
                    <EntityCard key={entity.name} entity={entity} />
                  ))}
              </>
            )}
          </section>
        ))}
      </div>

      <p className="admin-guide-er-footnote">
        Solid FK constraints: <code>page_sections.page_id</code>, <code>catalog_items.category_id</code>,{' '}
        <code>catalog_media.item_id</code>, <code>form_fields.form_id</code>, <code>enquiries.form_id</code>,{' '}
        <code>enquiries.item_id</code>. Config and editorial tables are key-value or standalone rows.
      </p>
    </div>
  );
}
