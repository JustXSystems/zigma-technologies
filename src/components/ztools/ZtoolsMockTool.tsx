'use client';

import type { ReactNode } from 'react';

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
        <h1>{title}</h1>
        <p>{description}</p>
        <span className="ztools-mock-badge">Sample tool — replace with production workflow</span>
      </div>
      <div className="ztools-tool-body calc-tool">{children}</div>
    </div>
  );
}

function LinkBack() {
  return (
    <a href="/ztools/dashboard" className="ztools-back-link">
      ← Back to tools
    </a>
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
