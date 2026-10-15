'use client';

import AdminHub from '@/components/admin/AdminHub';
import { THEME_TABS } from '@/lib/admin-hub-tabs';
import ThemeStudio from './ThemeStudio';
import TypographyEditor from './TypographyEditor';

export default function ThemeHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="Theme Studio"
      intro="How the public site looks: colours, type and the stylesheet, with a live preview of unsaved changes."
      tabs={THEME_TABS}
      initialTab={initialTab}
    >
      {(active, { select }) =>
        active === 'typography' ? <TypographyEditor /> : <ThemeStudio view={active} onViewChange={select} />
      }
    </AdminHub>
  );
}
