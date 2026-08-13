'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';

export default function SolarRoiClient() {
  const t = useSiteCopy().tools.solarRoi;
  const [kwp, setKwp] = useState(100);
  const [tariff, setTariff] = useState(9.5);
  const [yieldKwh, setYieldKwh] = useState(1450);
  const [capexPerKw, setCapexPerKw] = useState(45000);
  const [omPct, setOmPct] = useState(1.5);

  const result = useMemo(() => {
    const annualKwh = kwp * yieldKwh;
    const annualSavings = annualKwh * tariff;
    const capex = kwp * capexPerKw;
    const om = capex * (omPct / 100);
    const netYear1 = annualSavings - om;
    const payback = netYear1 > 0 ? capex / netYear1 : 0;
    const tenYear = netYear1 * 10 - capex;
    return {
      annualKwh: Math.round(annualKwh),
      annualSavings: Math.round(annualSavings),
      capex: Math.round(capex),
      payback: Math.round(payback * 10) / 10,
      tenYear: Math.round(tenYear),
    };
  }, [kwp, tariff, yieldKwh, capexPerKw, omPct]);

  function printQuote() {
    trackEvent('calculator_print', { tool: 'solar_roi' });
    window.print();
  }

  const quoteHref = `/contact?consult=1&consult_subject=${encodeURIComponent('Solar EPC')}&consult_capacity=${encodeURIComponent(`${kwp} kWp`)}`;

  return (
    <div className="calc-tool">
      <div className="calc-grid">
        <label>
          {t.kwpLabel}
          <input type="number" min={5} value={kwp} onChange={(e) => setKwp(Number(e.target.value) || 0)} />
        </label>
        <label>
          {t.tariffLabel}
          <input type="number" min={1} step={0.1} value={tariff} onChange={(e) => setTariff(Number(e.target.value) || 0)} />
        </label>
        <label>
          {t.yieldLabel}
          <input type="number" min={900} value={yieldKwh} onChange={(e) => setYieldKwh(Number(e.target.value) || 0)} />
        </label>
        <label>
          {t.capexLabel}
          <input type="number" min={10000} step={500} value={capexPerKw} onChange={(e) => setCapexPerKw(Number(e.target.value) || 0)} />
        </label>
        <label>
          {t.omLabel}
          <input type="number" min={0.5} max={5} step={0.1} value={omPct} onChange={(e) => setOmPct(Number(e.target.value) || 0)} />
        </label>
      </div>

      <div className="calc-result" id="calc-print-area">
        <h3>{t.resultTitle}</h3>
        <ul>
          <li>
            {t.annualGen}: <strong>{result.annualKwh.toLocaleString('en-IN')} kWh</strong>
          </li>
          <li>
            {t.year1Savings}: <strong>₹{result.annualSavings.toLocaleString('en-IN')}</strong>
          </li>
          <li>
            {t.capexLine}: <strong>₹{result.capex.toLocaleString('en-IN')}</strong>
          </li>
          <li>
            {t.payback}: <strong>{result.payback || '—'} years</strong>
          </li>
          <li>
            {t.tenYear}: <strong>₹{result.tenYear.toLocaleString('en-IN')}</strong>
          </li>
        </ul>
        <p className="calc-note">{t.disclaimer}</p>
      </div>

      <div className="calc-actions">
        <button type="button" className="btn btn-ghost-dark" onClick={printQuote}>
          {t.printLabel}
        </button>
        <Link href={quoteHref} className="btn btn-primary" onClick={() => trackEvent('calculator_quote', { tool: 'solar_roi' })}>
          {t.quoteLabel}
        </Link>
      </div>
    </div>
  );
}
