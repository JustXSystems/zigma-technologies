'use client';

import { useState } from 'react';
import HomeSectionEditor from '@/components/admin/home/HomeSectionEditor';
import { HOME_SECTION_TYPES, HOME_SEED_SECTIONS, type HomeSectionType } from '@/lib/home-sections';

function One({ type }: { type: HomeSectionType }) {
  const seed = HOME_SEED_SECTIONS.find((s) => s.type === type);
  const [content, setContent] = useState<Record<string, unknown>>(seed?.content_json || {});
  return (
    <div data-editor={type} style={{ border: '1px solid #ccc', margin: '1rem', padding: '1rem', background: '#fff', color: '#111' }}>
      <h3>{type}</h3>
      <HomeSectionEditor type={type} content={content} onChange={setContent} />
      <pre data-json={type} style={{ display: 'none' }}>{JSON.stringify(content)}</pre>
    </div>
  );
}

export default function EditorTest() {
  return (
    <main id="main-content" style={{ paddingTop: 100 }}>
      {HOME_SECTION_TYPES.map((t) => (
        <One key={t} type={t} />
      ))}
    </main>
  );
}
