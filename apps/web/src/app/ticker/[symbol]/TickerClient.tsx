"use client";

import { useEffect, useState } from "react";

type TickerData = {
  ticker: string;
  asOf: string;
  metrics: {
    cumulativeReturn: number;
    maxDrawdown: number;
    annualizedVolatility: number;
    betaVsBenchmark: number | null;
    lastClose: number;
  };
  priceSeries: { date: string; close: number }[];
};

function pct(x: number) {
  return `${(x * 100).toFixed(2)}%`;
}

export default function TickerClient({ symbol }: { symbol: string }) {
  const [data, setData] = useState<TickerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/data/tickers/${symbol}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`No data found for ${symbol}. Run: python -m ra.build_data`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [symbol]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <a href="/" style={{ textDecoration: "underline" }}>← Back</a>
      <h1 style={{ fontSize: 28, marginTop: 12 }}>{symbol} Research Pack</h1>

      {!data && !error && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div style={{ marginTop: 12, maxWidth: 800 }}>
          <p style={{ opacity: 0.75 }}>As of: {new Date(data.asOf).toLocaleString()}</p>
          <ul style={{ lineHeight: 1.9 }}>
            <li>Last close: {data.metrics.lastClose.toFixed(2)}</li>
            <li>1Y return: {pct(data.metrics.cumulativeReturn)}</li>
            <li>Max drawdown: {pct(data.metrics.maxDrawdown)}</li>
            <li>Annualized volatility: {pct(data.metrics.annualizedVolatility)}</li>
          </ul>
        </div>
      )}
    </main>
  );
}
