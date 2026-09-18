'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeading from '@/components/SiteHeading';

type MockToolProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function ZtoolsMockTool({ title, description, children }: MockToolProps) {
  return (
    <div className="ztools-tool-page">
      <div className="ztools-tool-head">
        <LinkBack />
        <SiteHeading role="pageHero">{title}</SiteHeading>
        <p>{description}</p>
        <span className="ztools-mock-badge">Sample tool — replace with production workflow</span>
      </div>
      <div className="ztools-tool-body calc-tool">{children}</div>
    </div>
  );
}

function LinkBack() {
  return (
    <Link href="/ztools/dashboard" className="ztools-back-link">
      ← Back to tools
    </Link>
  );
}

export function ZtoolsMockOutput({ label, value }: { label: string; value: string }) {
  return (
    <div className="ztools-mock-output">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
