"use client";

import { useState } from "react";

// Risk-free rate used for Sharpe ratio (approximate US 3-month T-bill)
const RISK_FREE_RATE = 0.045;

type WatchRow = {
  ticker: string;
  cumulativeReturn: number;
  annualizedVolatility: number;
};

type CorrelationMatrix = {
  tickers: string[];
  values: number[][];
};

// ── Portfolio math ────────────────────────────────────────────────────────────

/**
 * Portfolio return is just the weighted average of individual returns:
 *   Rp = Σ wᵢ · rᵢ
 *
 * Portfolio variance uses the full covariance matrix so that correlations
 * between assets are accounted for:
 *   σp² = Σᵢ Σⱼ wᵢ · wⱼ · σᵢ · σⱼ · ρᵢⱼ
 *
 * This is the key insight of Modern Portfolio Theory: combining assets that
 * are not perfectly correlated reduces overall portfolio volatility below the
 * weighted average of individual volatilities.
 */
function computeStats(
  weights: number[],
  rows: WatchRow[],
  corrValues: number[][]
) {
  const n = weights.length;

  const ret = weights.reduce((s, w, i) => s + w * rows[i].cumulativeReturn, 0);

  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance +=
        weights[i] *
        weights[j] *
        rows[i].annualizedVolatility *
        rows[j].annualizedVolatility *
        corrValues[i][j];
    }
  }
  const vol = Math.sqrt(variance);
  const sharpe = vol > 0 ? (ret - RISK_FREE_RATE) / vol : 0;

  return { ret, vol, sharpe };
}

function normalise(sliders: number[]): number[] {
  const total = sliders.reduce((s, v) => s + v, 0);
  if (total === 0) return sliders.map(() => 1 / sliders.length);
  return sliders.map((v) => v / total);
}

function pct(x: number, digits = 2) {
  return `${(x * 100).toFixed(digits)}%`;
}

function sign(x: number) {
  return x >= 0 ? "+" : "";
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  benchmark,
  format,
  higherIsBetter,
}: {
  label: string;
  value: number;
  benchmark: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}) {
  const delta = value - benchmark;
  const better = higherIsBetter ? delta >= 0 : delta <= 0;
  const deltaColour = better
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-500 dark:text-red-400";

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{format(value)}</p>
      <p className={`mt-1 text-xs tabular-nums ${deltaColour}`}>
        {sign(delta)}{format(delta)} vs equal-weight
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioSimulator({
  rows,
  corrMatrix,
}: {
  rows: WatchRow[];
  corrMatrix: CorrelationMatrix;
}) {
  // Map corrMatrix tickers → rows order (pipeline order may differ)
  const orderedRows = corrMatrix.tickers.map(
    (t) => rows.find((r) => r.ticker === t)!
  );

  const initialSliders = orderedRows.map(() => 25);
  const [sliders, setSliders] = useState<number[]>(initialSliders);

  const weights = normalise(sliders);
  const equalWeights = orderedRows.map(() => 1 / orderedRows.length);

  const portfolio = computeStats(weights, orderedRows, corrMatrix.values);
  const benchmark = computeStats(equalWeights, orderedRows, corrMatrix.values);

  function updateSlider(idx: number, value: number) {
    setSliders((prev) => prev.map((v, i) => (i === idx ? value : v)));
  }

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold">Portfolio Simulator</h2>
      <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
        Adjust allocations to see blended return, volatility, and Sharpe ratio.
        Metrics compare against an equal-weight baseline.
        Risk-free rate: {pct(RISK_FREE_RATE, 1)}.
      </p>

      {/* Sliders */}
      <div className="mb-6 space-y-4">
        {orderedRows.map((row, i) => (
          <div key={row.ticker} className="flex items-center gap-3">
            <span className="w-12 shrink-0 font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {row.ticker}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={sliders[i]}
              onChange={(e) => updateSlider(i, Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-indigo-600"
            />
            <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-slate-600 dark:text-slate-300">
              {pct(weights[i], 0)}
            </span>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="1Y Return"
          value={portfolio.ret}
          benchmark={benchmark.ret}
          format={(v) => `${sign(v)}${pct(v)}`}
          higherIsBetter
        />
        <MetricCard
          label="Ann. Volatility"
          value={portfolio.vol}
          benchmark={benchmark.vol}
          format={pct}
          higherIsBetter={false}
        />
        <MetricCard
          label={`Sharpe Ratio (rf = ${pct(RISK_FREE_RATE, 1)})`}
          value={portfolio.sharpe}
          benchmark={benchmark.sharpe}
          format={(v) => `${sign(v)}${v.toFixed(2)}`}
          higherIsBetter
        />
      </div>
    </section>
  );
}
