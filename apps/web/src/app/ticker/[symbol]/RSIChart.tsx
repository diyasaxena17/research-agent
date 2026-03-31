"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type PricePoint = { date: string; close: number };
type RSIPoint = { date: string; rsi: number | null };

/**
 * RSI(14) — Relative Strength Index using Wilder's smoothing.
 *
 * Teaching note:
 * Step 1: compute daily gains and losses (separate series, losses are positive numbers).
 * Step 2: seed the first average gain/loss as a simple mean of the first 14 days.
 * Step 3: for every subsequent day, use Wilder's smoothing:
 *           avg_gain = (prev_avg_gain * 13 + today_gain) / 14
 *   This gives more weight to recent data without a hard rolling window.
 * Step 4: RS = avg_gain / avg_loss
 *         RSI = 100 - (100 / (1 + RS))
 *
 * Returns null for the first `period` points where there isn't enough history.
 */
function computeRSI(prices: PricePoint[], period = 14): RSIPoint[] {
  const result: RSIPoint[] = prices.map((p) => ({ date: p.date, rsi: null }));

  if (prices.length < period + 1) return result;

  // Step 1: daily changes
  const changes = prices.slice(1).map((p, i) => p.close - prices[i].close);

  // Step 2: seed averages from the first `period` changes
  let avgGain =
    changes.slice(0, period).reduce((s, c) => s + Math.max(c, 0), 0) / period;
  let avgLoss =
    changes.slice(0, period).reduce((s, c) => s + Math.max(-c, 0), 0) / period;

  // The RSI for index `period` uses these seed averages
  const rsiAt = (ag: number, al: number) =>
    al === 0 ? 100 : 100 - 100 / (1 + ag / al);

  result[period].rsi = rsiAt(avgGain, avgLoss);

  // Step 3+4: Wilder's smoothing for the rest
  for (let i = period; i < changes.length; i++) {
    const gain = Math.max(changes[i], 0);
    const loss = Math.max(-changes[i], 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i + 1].rsi = rsiAt(avgGain, avgLoss);
  }

  return result;
}

function formatMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number | null }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const rsi = payload[0].value;
  const colour =
    rsi >= 70 ? "#f87171" : rsi <= 30 ? "#34d399" : "#94a3b8";
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="mb-1 opacity-60">{label}</p>
      <p className="font-semibold tabular-nums" style={{ color: colour }}>
        RSI: {rsi.toFixed(1)}
      </p>
    </div>
  );
}

export default function RSIChart({ data }: { data: PricePoint[] }) {
  if (!data?.length) return null;

  const rsiSeries = computeRSI(data);

  const tickIndices = new Set<number>();
  for (let i = 0; i < data.length; i += 21) tickIndices.add(i);

  return (
    <div className="mt-7 mb-2">
      <div className="mb-1 flex items-baseline gap-2">
        <h2 className="text-lg font-semibold">RSI (14)</h2>
        <span className="text-xs text-slate-400">
          Relative Strength Index — overbought &gt;70 · oversold &lt;30
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={rsiSeries} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />

          {/* Overbought / oversold bands */}
          <ReferenceLine
            y={70}
            stroke="#f87171"
            strokeDasharray="4 2"
            label={{ value: "70", position: "insideTopRight", fontSize: 10, fill: "#f87171" }}
          />
          <ReferenceLine
            y={30}
            stroke="#34d399"
            strokeDasharray="4 2"
            label={{ value: "30", position: "insideBottomRight", fontSize: 10, fill: "#34d399" }}
          />
          <ReferenceLine y={50} stroke="#334155" strokeDasharray="2 4" />

          <XAxis
            dataKey="date"
            tickFormatter={formatMonthLabel}
            ticks={rsiSeries
              .map((d, i) => (tickIndices.has(i) ? d.date : null))
              .filter(Boolean) as string[]}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 30, 50, 70, 100]}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="rsi"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#a78bfa" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
