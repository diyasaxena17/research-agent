"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type PricePoint = { date: string; close: number };

// One row in the merged chart: date + one key per ticker
type ChartRow = Record<string, string | number>;

const COLOURS = ["#6366f1", "#f59e0b", "#34d399", "#f87171", "#a78bfa", "#38bdf8"];

/**
 * Normalise a price series to cumulative % return from day 0.
 *   normalised[i] = (close[i] / close[0] - 1) * 100
 *
 * Teaching note:
 * Rebasing to 0% on day 1 lets you compare tickers that trade at very
 * different price levels (e.g. NVDA at $190 vs MSFT at $480).
 * Without normalisation, a line chart would just show "expensive stock
 * higher up the chart" — meaningless for comparison.
 */
function normalise(series: PricePoint[]): Map<string, number> {
  const base = series[0].close;
  const out = new Map<string, number>();
  for (const p of series) {
    out.set(p.date, (p.close / base - 1) * 100);
  }
  return out;
}

/**
 * Merge per-ticker normalised maps into a single array of chart rows,
 * keeping only dates that exist in ALL tickers (inner join).
 *
 * Teaching note:
 * Tickers may have slightly different trading calendars (e.g. one had a
 * data gap). An inner join ensures every row is complete — no holes in
 * any line.
 */
function mergeNormalised(
  tickers: string[],
  maps: Map<string, number>[]
): ChartRow[] {
  // Start with the date set of the first ticker, then intersect
  let dates = new Set(maps[0].keys());
  for (const m of maps.slice(1)) {
    dates = new Set([...dates].filter((d) => m.has(d)));
  }

  return [...dates]
    .sort()
    .map((date) => {
      const row: ChartRow = { date };
      tickers.forEach((t, i) => {
        row[t] = maps[i].get(date)!;
      });
      return row;
    });
}

function formatMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  stroke: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg min-w-[110px]">
      <p className="mb-1.5 opacity-60">{label}</p>
      {sorted.map((entry) => (
        <p key={entry.name} style={{ color: entry.stroke }} className="tabular-nums">
          {entry.name}: {entry.value >= 0 ? "+" : ""}
          {entry.value.toFixed(2)}%
        </p>
      ))}
    </div>
  );
}

export default function ComparisonChart({ tickers }: { tickers: string[] }) {
  const [chartData, setChartData] = useState<ChartRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tickers.length) return;

    // Promise.all fires all fetches in parallel — no waiting for one to finish
    // before starting the next. On 4 tickers this is ~4× faster than sequential.
    Promise.all(
      tickers.map((t) =>
        fetch(`/api/ticker/${t}`)
          .then((r) => {
            if (!r.ok) throw new Error(`Failed to load ${t}`);
            return r.json();
          })
          .then((d) => d.priceSeries as PricePoint[])
      )
    )
      .then((allSeries) => {
        const maps = allSeries.map(normalise);
        setChartData(mergeNormalised(tickers, maps));
      })
      .catch((e) => setError(String(e)));
  }, [tickers]);

  if (error) return <p className="mt-4 text-sm text-red-400">{error}</p>;
  if (!chartData) {
    return (
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">1-Year Return Comparison</h2>
        <div className="h-[260px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const tickIndices = new Set<number>();
  for (let i = 0; i < chartData.length; i += 21) tickIndices.add(i);

  return (
    <div className="mt-8">
      <div className="mb-1 flex items-baseline gap-2">
        <h2 className="text-lg font-semibold">1-Year Return Comparison</h2>
        <span className="text-xs text-slate-400">normalised to 0% on day 1</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthLabel}
            ticks={chartData
              .map((d, i) => (tickIndices.has(i) ? d.date : null))
              .filter(Boolean) as string[]}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-slate-300">{value}</span>
            )}
          />
          {tickers.map((t, i) => (
            <Line
              key={t}
              type="monotone"
              dataKey={t}
              stroke={COLOURS[i % COLOURS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
