'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';

export default function UpsCalculatorClient() {
  const t = useSiteCopy().tools.upsCalculator;
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
          {t.loadKwLabel}
          <input type="number" min={1} value={loadKw} onChange={(e) => setLoadKw(Number(e.target.value) || 0)} />
        </label>
        <label>
          {t.pfLabel}
          <input type="number" min={0.5} max={1} step={0.05} value={pf} onChange={(e) => setPf(Number(e.target.value) || 0.8)} />
        </label>
        <label>
          {t.growthLabel}
          <input type="number" min={0} max={100} value={growthPct} onChange={(e) => setGrowthPct(Number(e.target.value) || 0)} />
        </label>
        <label>
          {t.runtimeLabel}
          <input type="number" min={5} max={120} value={runtimeMin} onChange={(e) => setRuntimeMin(Number(e.target.value) || 15)} />
        </label>
        <label>
          {t.topologyLabel}
          <select value={redundancy} onChange={(e) => setRedundancy(e.target.value as 'n' | 'n+1')}>
            <option value="n">{t.topologyN}</option>
            <option value="n+1">{t.topologyNPlus1}</option>
          </select>
        </label>
      </div>

      <div className="calc-result" id="calc-print-area">
        <h3>{t.resultTitle}</h3>
        <ul>
          <li>
            {t.designLoad}: <strong>{result.designKw} kW</strong>
          </li>
          <li>
            {t.recommendedUps}: <strong>{result.kva} kVA</strong>
          </li>
          <li>
            {t.modularFrames}: <strong>{result.modules}</strong>
          </li>
          <li>
            {t.batteryEnergy}: <strong>{result.batteryKwh} kWh</strong> @ {runtimeMin} min
          </li>
        </ul>
        <p className="calc-note">{t.disclaimer}</p>
      </div>

      <div className="calc-actions">
        <button type="button" className="btn btn-ghost-dark" onClick={printQuote}>
          {t.printLabel}
        </button>
        <Link href={quoteHref} className="btn btn-primary" onClick={() => trackEvent('calculator_quote', { tool: 'ups_kva' })}>
          {t.quoteLabel}
        </Link>
      </div>
    </div>
  );
}
