'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

export default function UpsCalculatorClient() {
  const [loadKw, setLoadKw] = useState(40);
  const [pf, setPf] = useState(0.8);
  const [redundancy, setRedundancy] = useState<'n' | 'n+1'>('n+1');
  const [runtimeMin, setRuntimeMin] = useState(15);
  const [growthPct, setGrowthPct] = useState(20);

  const result = useMemo(() => {
    const designKw = loadKw * (1 + growthPct / 100);
    const kva = designKw / Math.max(0.5, Math.min(1, pf));
    const modules = redundancy === 'n+1' ? Math.ceil(kva / 100) + 1 : Math.ceil(kva / 100);
    const batteryKwh = (designKw * runtimeMin) / 60;
    return {
      designKw: Math.round(designKw * 10) / 10,
      kva: Math.round(kva * 10) / 10,
      modules,
      batteryKwh: Math.round(batteryKwh * 10) / 10,
    };
  }, [loadKw, pf, redundancy, runtimeMin, growthPct]);

  function printQuote() {
    trackEvent('calculator_print', { tool: 'ups_kva' });
    window.print();
  }

  const quoteHref = `/contact?consult=1&consult_subject=${encodeURIComponent('UPS Solution')}&consult_capacity=${encodeURIComponent(`${result.kva} kVA`)}`;

  return (
    <div className="calc-tool">
      <div className="calc-grid">
        <label>
          Critical load (kW)
          <input type="number" min={1} value={loadKw} onChange={(e) => setLoadKw(Number(e.target.value) || 0)} />
        </label>
        <label>
          Power factor
          <input type="number" min={0.5} max={1} step={0.05} value={pf} onChange={(e) => setPf(Number(e.target.value) || 0.8)} />
        </label>
        <label>
          Growth headroom (%)
          <input type="number" min={0} max={100} value={growthPct} onChange={(e) => setGrowthPct(Number(e.target.value) || 0)} />
        </label>
        <label>
          Battery runtime (min)
          <input type="number" min={5} max={120} value={runtimeMin} onChange={(e) => setRuntimeMin(Number(e.target.value) || 15)} />
        </label>
        <label>
          Topology
          <select value={redundancy} onChange={(e) => setRedundancy(e.target.value as 'n' | 'n+1')}>
            <option value="n">N capacity</option>
            <option value="n+1">N+1 modular</option>
          </select>
        </label>
      </div>

      <div className="calc-result" id="calc-print-area">
        <h3>Indicative sizing</h3>
        <ul>
          <li>
            Design load: <strong>{result.designKw} kW</strong>
          </li>
          <li>
            Recommended UPS: <strong>{result.kva} kVA</strong>
          </li>
          <li>
            Modular frames (100 kVA class): <strong>{result.modules}</strong>
          </li>
          <li>
            Approx. battery energy: <strong>{result.batteryKwh} kWh</strong> @ {runtimeMin} min
          </li>
        </ul>
        <p className="calc-note">
          Engineering estimate only — site power quality, crest factor, and generator sizing require a site survey.
        </p>
      </div>

      <div className="calc-actions">
        <button type="button" className="btn btn-ghost-dark" onClick={printQuote}>
          Print / save PDF
        </button>
        <Link href={quoteHref} className="btn btn-primary" onClick={() => trackEvent('calculator_quote', { tool: 'ups_kva' })}>
          Request engineered quote →
        </Link>
      </div>
    </div>
  );
}
