'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ZtoolsShell from '@/components/ztools/ZtoolsShell';
import ZtoolsMockTool, { ZtoolsMockOutput } from '@/components/ztools/ZtoolsMockTool';

const TOOL_META: Record<
  string,
  { title: string; description: string; component: 'quotation' | 'roi' | 'ups' | 'audit' | 'battery' }
> = {
  quotation: {
    title: 'Quotation Builder',
    description: 'Draft a sample quotation with line items and export-ready totals.',
    component: 'quotation',
  },
  'roi-calc': {
    title: 'Solar ROI Calculator',
    description: 'Quick mock ROI model for rooftop and industrial solar projects.',
    component: 'roi',
  },
  'ups-sizing': {
    title: 'UPS Sizing Tool',
    description: 'Estimate UPS kVA and battery minutes for a critical load profile.',
    component: 'ups',
  },
  'load-audit': {
    title: 'Load Audit Worksheet',
    description: 'Capture loads and generate a sample audit summary.',
    component: 'audit',
  },
  'battery-life': {
    title: 'Battery Life Estimator',
    description: 'Project replacement cycles based on depth-of-discharge assumptions.',
    component: 'battery',
  },
};

export default function ZtoolsToolPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const meta = TOOL_META[slug];

  useEffect(() => {
    fetch('/api/ztools/auth')
      .then(async (r) => {
        if (!r.ok) throw new Error('unauth');
        const data = await r.json();
        const slugs = data.user?.toolSlugs || [];
        if (!slugs.includes(slug)) throw new Error('forbidden');
        setUser({ name: data.user.name, email: data.user.email });
        setAllowed(true);
      })
      .catch(() => router.replace('/ztools/login'))
      .finally(() => setLoading(false));
  }, [router, slug]);

  if (loading) {
    return (
      <ZtoolsShell>
        <div className="container ztools-dashboard"><p>Loading tool…</p></div>
      </ZtoolsShell>
    );
  }

  if (!meta || !allowed) {
    return (
      <ZtoolsShell user={user} showNav>
        <div className="container ztools-dashboard">
          <p>Tool not found or not assigned to your account.</p>
        </div>
      </ZtoolsShell>
    );
  }

  return (
    <ZtoolsShell user={user} showNav>
      <div className="container">
        <ZtoolsMockTool title={meta.title} description={meta.description}>
          {meta.component === 'quotation' && <QuotationMock />}
          {meta.component === 'roi' && <RoiMock />}
          {meta.component === 'ups' && <UpsMock />}
          {meta.component === 'audit' && <AuditMock />}
          {meta.component === 'battery' && <BatteryMock />}
        </ZtoolsMockTool>
      </div>
    </ZtoolsShell>
  );
}

function QuotationMock() {
  return (
    <>
      <label>Customer name<input defaultValue="Sample Industries Ltd." /></label>
      <label>Project type<select><option>UPS + battery</option><option>Solar EPC</option><option>BESS</option></select></label>
      <label>Line items (mock)<textarea rows={4} defaultValue="1× 100 kVA UPS\n1× Battery bank 30 min\nInstallation & commissioning" /></label>
      <ZtoolsMockOutput label="Indicative total" value="₹ 18.4 L (sample)" />
      <button type="button" className="btn btn-primary" disabled>Export PDF (coming soon)</button>
    </>
  );
}

function RoiMock() {
  return (
    <>
      <label>System size (kW)<input type="number" defaultValue={500} /></label>
      <label>Annual consumption (kWh)<input type="number" defaultValue={720000} /></label>
      <label>Tariff (₹/kWh)<input type="number" defaultValue={8.5} step={0.1} /></label>
      <ZtoolsMockOutput label="Estimated annual savings" value="₹ 42.6 L" />
      <ZtoolsMockOutput label="Simple payback" value="4.2 years" />
    </>
  );
}

function UpsMock() {
  return (
    <>
      <label>Critical load (kW)<input type="number" defaultValue={85} /></label>
      <label>Power factor<input type="number" defaultValue={0.9} step={0.05} /></label>
      <label>Backup minutes<input type="number" defaultValue={30} /></label>
      <ZtoolsMockOutput label="Recommended UPS" value="100 kVA online UPS" />
      <ZtoolsMockOutput label="Battery bank" value="192 V · 200 Ah (sample)" />
    </>
  );
}

function AuditMock() {
  return (
    <>
      <label>Facility name<input defaultValue="Plant A — Bangalore" /></label>
      <label>Total connected load (kW)<input type="number" defaultValue={420} /></label>
      <label>Peak demand (kW)<input type="number" defaultValue={310} /></label>
      <ZtoolsMockOutput label="Audit score (mock)" value="72 / 100 — moderate efficiency gap" />
    </>
  );
}

function BatteryMock() {
  return (
    <>
      <label>Battery type<select><option>VRLA</option><option>Lithium</option></select></label>
      <label>Typical DOD %<input type="number" defaultValue={60} /></label>
      <label>Cycles per year<input type="number" defaultValue={120} /></label>
      <ZtoolsMockOutput label="Estimated replacement" value="Year 4–5 (sample)" />
    </>
  );
}
