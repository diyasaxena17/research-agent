"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type PricePoint = { date: string; close: number };
type DrawdownPoint = { date: string; drawdown: number };

/**
 * Drawdown at day i = (price[i] - peak_so_far) / peak_so_far
 *
 * The peak_so_far is the highest closing price seen from day 0 up to day i.
 * When price is at an all-time high, drawdown = 0.
 * Every other day it is negative, showing how far below the peak we are.
 */
function computeDrawdown(prices: PricePoint[]): DrawdownPoint[] {
  let peak = prices[0].close;
  return prices.map(({ date, close }) => {
    if (close > peak) peak = close;
    const drawdown = (close - peak) / peak;
    return { date, drawdown };
  });
}

function formatMonthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const dd = payload[0].value;
  return (
    <div
      style={{
        background: "#1a1a2e",
        border: "1px solid #334",
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        color: "#e2e8f0",
      }}
    >
      <p style={{ margin: 0, opacity: 0.7 }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 700, color: dd < -0.1 ? "#f87171" : "#94a3b8" }}>
        {(dd * 100).toFixed(2)}%
      </p>
    </div>
  );
}

export default function DrawdownChart({ data }: { data: PricePoint[] }) {
  if (!data?.length) return null;

  const drawdownSeries = computeDrawdown(data);
  const minDrawdown = Math.min(...drawdownSeries.map((d) => d.drawdown));

  const tickIndices = new Set<number>();
  for (let i = 0; i < data.length; i += 21) tickIndices.add(i);

  return (
    <div style={{ marginTop: 28, marginBottom: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Drawdown from Peak</h2>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12, marginTop: 0 }}>
        Max drawdown: {(minDrawdown * 100).toFixed(2)}%
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={drawdownSeries} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthLabel}
            ticks={drawdownSeries
              .map((d, i) => (tickIndices.has(i) ? d.date : null))
              .filter(Boolean) as string[]}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minDrawdown * 1.1, 0.01]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#ddGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#ef4444" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
