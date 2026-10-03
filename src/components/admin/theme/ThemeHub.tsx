'use client';

import AdminHub, { type AdminHubTab } from '@/components/admin/AdminHub';
import ThemeStudio from './ThemeStudio';
import TypographyEditor from './TypographyEditor';

type Tab = 'tokens' | 'typography' | 'css';

const TABS: readonly AdminHubTab<Tab>[] = [
  {
    id: 'tokens',
    label: 'Colours & layout',
    screen: 'theme',
    editor: 'studio',
    description: 'Brand and neutral colours, section padding and header height. Saved as tokens and live within ~30 seconds.',
  },
  {
    id: 'typography',
    label: 'Typography',
    screen: ['theme', 'siteSettings'],
    description:
      'Type sizes, heading levels and eyebrow sizes — the defaults every page section inherits unless its own editor overrides them.',
  },
  {
    id: 'css',
    label: 'Site CSS',
    screen: 'theme',
    editor: 'studio',
    description: 'The full site stylesheet (globals.css body) with drafts, version history and publish.',
  },
];

export default function ThemeHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="Theme Studio"
      intro="How the public site looks: colours, type and the stylesheet, with a live preview of unsaved changes."
      tabs={TABS}
      initialTab={initialTab}
    >
      {(active, { select }) =>
        active === 'typography' ? <TypographyEditor /> : <ThemeStudio view={active} onViewChange={select} />
      }
    </AdminHub>
  );
}
